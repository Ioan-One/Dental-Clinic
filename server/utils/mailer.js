import nodemailer from 'nodemailer';

// If no SMTP is configured, log to console instead of sending real email.
const DEV_MODE = !process.env.SMTP_HOST;

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return transporter;
};

const APP_NAME = 'DentalCare Pro';
const FROM     = `"${APP_NAME}" <noreply@dentalcare.pro>`;

const devLog = (label, value) => {
  console.log('\n' + '─'.repeat(50));
  console.log(`📧 [DEV EMAIL] ${label}`);
  console.log(`   ${value}`);
  console.log('─'.repeat(50) + '\n');
};

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  if (DEV_MODE) {
    devLog(`Reset token pentru ${toEmail}:`, resetToken);
    return;
  }

  const t        = await getTransporter();
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password`;

  await t.sendMail({
    from:    FROM,
    to:      toEmail,
    subject: `Resetare parolă — ${APP_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2563eb;margin-top:0;">Resetare parolă</h2>
        <p>Codul tău de resetare este:</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;font-family:monospace;
                    font-size:0.95em;word-break:break-all;color:#1e293b;margin:16px 0;">
          ${resetToken}
        </div>
        <p>Sau accesează: <a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color:#6b7280;font-size:0.85em;">Tokenul expiră în 1 oră.</p>
      </div>
    `,
  });
};

export const sendMagicLinkEmail = async (toEmail, magicUrl, firstName = '') => {
  if (DEV_MODE) {
    devLog(`Magic link pentru ${toEmail}:`, magicUrl);
    return;
  }

  const t = await getTransporter();

  await t.sendMail({
    from:    FROM,
    to:      toEmail,
    subject: `Link de autentificare — ${APP_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2563eb;margin-top:0;">Autentificare fără parolă</h2>
        <p>Salut${firstName ? ' ' + firstName : ''}!</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${magicUrl}"
             style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;
                    text-decoration:none;font-weight:600;font-size:1em;display:inline-block;">
            Autentifică-te acum
          </a>
        </div>
        <p style="color:#6b7280;font-size:0.85em;">
          Linkul expiră în 15 minute și poate fi folosit o singură dată.
        </p>
        <p style="color:#9ca3af;font-size:0.8em;word-break:break-all;">${magicUrl}</p>
      </div>
    `,
  });
};

export const sendOtpEmail = async (toEmail, otp) => {
  if (DEV_MODE) {
    devLog(`Cod OTP pentru ${toEmail}:`, otp);
    return;
  }

  const t = await getTransporter();

  await t.sendMail({
    from:    FROM,
    to:      toEmail,
    subject: `Cod de autentificare — ${APP_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2563eb;margin-top:0;">Autentificare cu cod unic</h2>
        <p>Codul tău de autentificare este:</p>
        <div style="background:#eff6ff;border:2px solid #2563eb;border-radius:12px;padding:24px;
                    text-align:center;font-family:monospace;font-size:2.5em;font-weight:bold;
                    letter-spacing:10px;color:#2563eb;margin:20px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:0.85em;">Codul expiră în 10 minute.</p>
      </div>
    `,
  });
};
