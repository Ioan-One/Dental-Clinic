import { Router } from 'express';
import { prisma } from '../store/db.js';
import { seedRolesAndPermissions } from '../store/seedRolesPermissions.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendOtpEmail, sendMagicLinkEmail } from '../utils/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const router = Router();

// ── Account lockout (in-memory) ───────────────────────────────────
const LOCKOUT_MAX    = 5;
const LOCKOUT_WINDOW = 15 * 60 * 1000;
const failedAttempts = new Map();

const checkLockout = (email) => {
  const entry = failedAttempts.get(email);
  if (!entry) return null;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return `Contul este blocat. Încearcă din nou în ${remaining} minut${remaining === 1 ? '' : 'e'}.`;
  }
  return null;
};

const recordFailure = (email) => {
  const entry = failedAttempts.get(email) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= LOCKOUT_MAX) {
    entry.lockedUntil = Date.now() + LOCKOUT_WINDOW;
    entry.count = 0;
  }
  failedAttempts.set(email, entry);
};

const clearFailures = (email) => failedAttempts.delete(email);

// ── Password strength ─────────────────────────────────────────────
const isStrongPassword = (p) =>
  p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

// ── Helpers ───────────────────────────────────────────────────────
let seeded = false;
const ensureSeeded = async () => {
  if (!seeded) { await seedRolesAndPermissions(); seeded = true; }
};

const resolvePermissions = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });
  const permissions = new Set();
  for (const ur of userRoles)
    for (const rp of ur.role.rolePermissions)
      permissions.add(rp.permission.name);
  return [...permissions];
};

const buildUserPayload = async (user) => {
  const roleName    = user.userRoles?.[0]?.role?.name ?? 'patient';
  const permissions = await resolvePermissions(user.id);
  const doctor      = await prisma.doctor.findUnique({ where: { userId: user.id } });
  const patient     = await prisma.patient.findUnique({ where: { userId: user.id } });
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName,
    email: user.email, role: roleName, permissions,
    doctorId: doctor?.id ?? null, patientId: patient?.id ?? null,
  };
};

const issueTokens = async (res, user) => {
  const payload  = await buildUserPayload(user);
  const token    = jwt.sign({ 
    userId: user.id, 
    role: payload.role, 
    permissions: payload.permissions,
    patientId: payload.patientId,
    doctorId: payload.doctorId 
  }, JWT_SECRET, { expiresIn: '30m' });
  const refresh  = crypto.randomBytes(40).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refresh, refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  res.cookie(REFRESH_COOKIE, refresh, COOKIE_OPTS);
  return { ...payload, token };
};

// ─── POST /api/auth/register ──────────────────────────────────────
router.post('/register', async (req, res) => {
  await ensureSeeded();
  const { firstName, lastName, email, password, phone = '' } = req.body;
  const role = 'patient';

  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address.' });
  if (!isStrongPassword(password))
    return res.status(400).json({ error: 'Parola trebuie să aibă minim 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.isDeleted) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { email: `${existing.email}_deleted_${Date.now()}` }
      });
    } else {
      return res.status(400).json({ error: 'Email already in use.' });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { firstName, lastName, email, password: hashedPassword } });

  const roleRecord = await prisma.role.findUnique({ where: { name: role } });
  if (roleRecord) await prisma.userRole.create({ data: { userId: user.id, roleId: roleRecord.id } });

  const pat = await prisma.patient.create({
    data: { firstName, lastName, email, phone: phone || '+40 000 000 000', userId: user.id },
  });

  // Initialize 32 default teeth for the patient
  const teeth = [];
  for (let num = 1; num <= 32; num++) {
    teeth.push({ toothNumber: num, status: 'HEALTHY', patientId: pat.id });
  }
  await prisma.toothRecord.createMany({ data: teeth });

  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, include: { userRoles: { include: { role: true } } } });
  const result = await issueTokens(res, fullUser);
  return res.status(201).json({ ...result, patientId: pat.id, doctorId: null });
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const lockoutMsg = checkLockout(email);
  if (lockoutMsg) return res.status(429).json({ error: lockoutMsg });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || user.isDeleted) { recordFailure(email); return res.status(401).json({ error: 'Invalid email or password.' }); }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) { recordFailure(email); return res.status(401).json({ error: 'Invalid email or password.' }); }

  clearFailures(email);
  const result = await issueTokens(res, user);
  return res.json(result);
});

// ─── POST /api/auth/refresh ───────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'No refresh token.' });

  const user = await prisma.user.findFirst({
    where: { refreshToken: token, isDeleted: false },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || !user.refreshTokenExpiry || new Date() > user.refreshTokenExpiry) {
    res.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
    return res.status(401).json({ error: 'Refresh token invalid sau expirat.' });
  }

  const result = await issueTokens(res, user);
  return res.json(result);
});

// ─── POST /api/auth/logout ────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await prisma.user.updateMany({
      where: { refreshToken: token },
      data: { refreshToken: null, refreshTokenExpiry: null },
    });
  }
  res.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
  return res.json({ ok: true });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond identically to prevent email enumeration
  const genericOk = { message: 'Dacă emailul există în sistem, vei primi un email cu instrucțiuni.' };

  if (!user || user.isDeleted) return res.json(genericOk);

  const resetToken  = crypto.randomBytes(32).toString('hex');
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry: resetExpiry },
  });

  try {
    await sendPasswordResetEmail(email, resetToken);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }

  return res.json(genericOk);
});

// ─── POST /api/auth/reset-password ───────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token și parolă obligatorii.' });

  if (!isStrongPassword(password))
    return res.status(400).json({ error: 'Parola trebuie să aibă minim 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.' });

  const user = await prisma.user.findFirst({ where: { resetToken: token } });

  if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry)
    return res.status(400).json({ error: 'Token invalid sau expirat.' });

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
  });

  return res.json({ message: 'Parola a fost resetată cu succes. Te poți autentifica.' });
});

// ─── POST /api/auth/otp/request ──────────────────────────────────
router.post('/otp/request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obligatoriu.' });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { userRoles: { include: { role: true } } },
  });

  // Same generic response to prevent enumeration
  const genericOk = { message: 'Dacă emailul există, vei primi un cod pe email.' };
  if (!user || user.isDeleted) return res.json(genericOk);

  const otp       = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: otp, otpExpiry },
  });

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error('OTP email send failed:', err.message);
  }

  return res.json(genericOk);
});

// ─── POST /api/auth/otp/verify ────────────────────────────────────
router.post('/otp/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email și cod obligatorii.' });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || user.isDeleted || !user.otpCode || !user.otpExpiry)
    return res.status(401).json({ error: 'Cod invalid sau expirat.' });

  if (new Date() > user.otpExpiry)
    return res.status(401).json({ error: 'Codul a expirat. Solicită unul nou.' });

  if (user.otpCode !== String(code))
    return res.status(401).json({ error: 'Cod incorect.' });

  // Clear OTP after successful use
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: null, otpExpiry: null },
  });

  const result = await issueTokens(res, user);
  return res.json(result);
});

// ─── Magic Link ───────────────────────────────────────────────────
// POST /api/auth/magic/request — generate and email a one-click login link
router.post('/magic/request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obligatoriu.' });

  const user = await prisma.user.findUnique({ where: { email } });

  // Same response regardless to prevent email enumeration
  const genericOk = { message: 'Dacă emailul există, vei primi un link de autentificare.' };
  if (!user || user.isDeleted) return res.json(genericOk);

  const magicToken       = crypto.randomBytes(32).toString('hex');
  const magicTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { magicToken, magicTokenExpiry },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const magicUrl    = `${frontendUrl}/auth/magic?token=${magicToken}`;

  try {
    await sendMagicLinkEmail(email, magicUrl, user.firstName);
  } catch (err) {
    console.error('Magic link email failed:', err.message);
  }

  return res.json(genericOk);
});

// POST /api/auth/magic/verify — verify token and issue session
router.post('/magic/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token lipsă.' });

  const user = await prisma.user.findFirst({
    where: { magicToken: token },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || !user.magicTokenExpiry || new Date() > user.magicTokenExpiry)
    return res.status(401).json({ error: 'Link invalid sau expirat.' });

  // Invalidate the token immediately (single-use)
  await prisma.user.update({
    where: { id: user.id },
    data: { magicToken: null, magicTokenExpiry: null },
  });

  const result = await issueTokens(res, user);
  return res.json(result);
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId required.' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || user.isDeleted) return res.status(404).json({ error: 'User not found.' });

  const payload = await buildUserPayload(user);
  return res.json(payload);
});

export default router;
