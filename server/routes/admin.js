import { Router } from 'express';
import { prisma } from '../store/db.js';
import { requireRole } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import { broadcast } from '../websocket.js';

const router = Router();

// All admin routes require admin role
router.use(requireRole(['admin']));

// ─── GET /api/admin/users ─────────────────────────────────────────
router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    include: { userRoles: { include: { role: true } } },
    orderBy: { id: 'asc' },
  });

  const result = users.map(u => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.userRoles[0]?.role?.name ?? 'patient',
  }));

  return res.json(result);
});

// ─── POST /api/admin/users ────────────────────────────────────────
router.post('/users', async (req, res) => {
  const { firstName, lastName, email, password, role, phone = '', specialization = 'Stomatologie Generală' } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
  }
  if (!['admin', 'doctor', 'assistant', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'Rol invalid.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresă de email invalidă.' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.isDeleted) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { email: `${existing.email}_deleted_${Date.now()}` }
      });
    } else {
      return res.status(400).json({ error: 'Email-ul este deja folosit.' });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, password: hashedPassword },
  });

  const roleRecord = await prisma.role.findUnique({ where: { name: role } });
  if (roleRecord) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: roleRecord.id } });
  }

  if (role === 'doctor') {
    await prisma.doctor.create({
      data: { firstName, lastName, email, phone: phone || '+40 000 000 000', specialization, userId: user.id },
    });
  } else if (role === 'patient') {
    const pat = await prisma.patient.create({
      data: { firstName, lastName, email, phone: phone || '+40 000 000 000', userId: user.id },
    });

    // Initialize 32 default teeth for the patient
    const teeth = [];
    for (let num = 1; num <= 32; num++) {
      teeth.push({ toothNumber: num, status: 'HEALTHY', patientId: pat.id });
    }
    await prisma.toothRecord.createMany({ data: teeth });
  }

  return res.status(201).json({ id: user.id, firstName, lastName, email, role });
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalid.' });

  // Prevent self-deletion
  if (id === req.user.userId) {
    return res.status(400).json({ error: 'Nu îți poți șterge propriul cont.' });
  }

  // Clear tokens and mark as deleted
  await prisma.user.update({ 
    where: { id }, 
    data: { isDeleted: true, refreshToken: null, refreshTokenExpiry: null } 
  });
  
  // Force client to logout instantly
  broadcast({ type: 'FORCE_LOGOUT', payload: { userId: id } });
  
  return res.json({ ok: true });
});

export default router;
