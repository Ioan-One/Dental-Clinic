import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Roles & permissions ─────────────────────────────────────
const PERMISSIONS = [
  { name: 'patients:read',          description: 'View patient list and details' },
  { name: 'patients:read:own',      description: 'View own patient record only' },
  { name: 'patients:write',         description: 'Create, update, and delete any patient' },
  { name: 'doctors:read',           description: 'View doctor list and details' },
  { name: 'doctors:write',          description: 'Create, update, and delete doctors' },
  { name: 'appointments:read',      description: 'View all appointments' },
  { name: 'appointments:read:own',  description: 'View own appointments only' },
  { name: 'appointments:write',     description: 'Create, update, and delete any appointment' },
  { name: 'appointments:write:own', description: 'Create appointments for self only' },
  { name: 'teeth:read',             description: 'View dental records' },
  { name: 'teeth:write',            description: 'Update dental records and history' },
  { name: 'statistics:read',        description: 'View statistics dashboard' },
  { name: 'chat:read',              description: 'Read chat messages' },
  { name: 'chat:write',             description: 'Send chat messages' },
];

const ROLE_DEFS = [
  { name: 'admin',     description: 'Full access to all features and data', permissions: PERMISSIONS.map(p => p.name) },
  { name: 'doctor',    description: 'Manage appointments, view and update patient dental records', permissions: ['patients:read','appointments:read','appointments:write','teeth:read','teeth:write','doctors:read','statistics:read','chat:read','chat:write'] },
  { name: 'assistant', description: 'Schedule appointments and view patient information', permissions: ['patients:read','appointments:read','appointments:write','teeth:read','doctors:read','chat:read','chat:write'] },
  { name: 'patient',   description: 'View own medical history and upcoming appointments', permissions: ['patients:read:own','appointments:read:own','appointments:write:own','teeth:read','chat:read','chat:write'] },
];

async function seedRoles() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { name: p.name }, update: { description: p.description }, create: p });
  }
  for (const r of ROLE_DEFS) {
    const role = await prisma.role.upsert({ where: { name: r.name }, update: { description: r.description }, create: { name: r.name, description: r.description } });
    for (const permName of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } }, update: {}, create: { roleId: role.id, permissionId: perm.id } });
    }
  }
  console.log('  ✅ Roles & permissions seeded');
}

// Helper: create a User + assign role + return the user
async function createUser({ firstName, lastName, email, password, roleName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { firstName, lastName, email, password: hashedPassword } });
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return user;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean in FK order
  await prisma.toothHistory.deleteMany();
  await prisma.toothRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  await seedRoles();

  // ─── Admin user (no linked medical record) ───────────────────
  await createUser({ firstName: 'Admin', lastName: 'Clinic', email: 'admin@clinic.ro', password: 'admin123', roleName: 'admin' });
  console.log('  ✅ Admin account: admin@clinic.ro / admin123');

  // ─── Doctors ─────────────────────────────────────────────────
  const drSmithUser = await createUser({ firstName: 'Robert', lastName: 'Smith', email: 'dr.smith@clinic.ro', password: 'doctor123', roleName: 'doctor' });
  const drSmith = await prisma.doctor.create({ data: { firstName: 'Robert', lastName: 'Smith', email: 'dr.smith@clinic.ro', phone: '+40 721 201 001', specialization: 'Stomatologie Generală', userId: drSmithUser.id } });

  const drJohnsonUser = await createUser({ firstName: 'Maria', lastName: 'Johnson', email: 'dr.johnson@clinic.ro', password: 'doctor123', roleName: 'doctor' });
  const drJohnson = await prisma.doctor.create({ data: { firstName: 'Maria', lastName: 'Johnson', email: 'dr.johnson@clinic.ro', phone: '+40 721 201 002', specialization: 'Endodonție', userId: drJohnsonUser.id } });

  const drBrownUser = await createUser({ firstName: 'James', lastName: 'Brown', email: 'dr.brown@clinic.ro', password: 'doctor123', roleName: 'doctor' });
  const drBrown = await prisma.doctor.create({ data: { firstName: 'James', lastName: 'Brown', email: 'dr.brown@clinic.ro', phone: '+40 721 201 003', specialization: 'Ortodonție', userId: drBrownUser.id } });

  console.log('  ✅ Doctors (login: dr.smith@clinic.ro / doctor123)');

  // ─── Patients ────────────────────────────────────────────────
  const johnUser    = await createUser({ firstName: 'John',    lastName: 'Doe',        email: 'john.doe@mail.com',        password: 'patient123', roleName: 'patient' });
  const sarahUser   = await createUser({ firstName: 'Sarah',   lastName: 'Johnson',    email: 'sarah.johnson@mail.com',   password: 'patient123', roleName: 'patient' });
  const michaelUser = await createUser({ firstName: 'Michael', lastName: 'Chen',       email: 'michael.chen@mail.com',    password: 'patient123', roleName: 'patient' });
  const emilyUser   = await createUser({ firstName: 'Emily',   lastName: 'Davis',      email: 'emily.davis@mail.com',     password: 'patient123', roleName: 'patient' });
  const aliceUser   = await createUser({ firstName: 'Alice',   lastName: 'Smith',      email: 'alice.smith@mail.com',     password: 'patient123', roleName: 'patient' });

  const patientJohn    = await prisma.patient.create({ data: { firstName: 'John',    lastName: 'Doe',     email: 'john.doe@mail.com',      phone: '+40 741 101 001', userId: johnUser.id } });
  const patientSarah   = await prisma.patient.create({ data: { firstName: 'Sarah',   lastName: 'Johnson', email: 'sarah.johnson@mail.com',  phone: '+40 741 101 002', userId: sarahUser.id } });
  const patientMichael = await prisma.patient.create({ data: { firstName: 'Michael', lastName: 'Chen',    email: 'michael.chen@mail.com',   phone: '+40 741 101 003', userId: michaelUser.id } });
  const patientEmily   = await prisma.patient.create({ data: { firstName: 'Emily',   lastName: 'Davis',   email: 'emily.davis@mail.com',    phone: '+40 741 101 004', userId: emilyUser.id } });
  const patientAlice   = await prisma.patient.create({ data: { firstName: 'Alice',   lastName: 'Smith',   email: 'alice.smith@mail.com',    phone: '+40 741 101 005', userId: aliceUser.id } });

  console.log('  ✅ Patients (login: john.doe@mail.com / patient123)');

  // ─── Appointments ────────────────────────────────────────────
  const future = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };

  await prisma.appointment.createMany({ data: [
    { date: future(1),  time: '09:00', type: 'Control de Rutină',   status: 'CONFIRMED', patientId: patientSarah.id,   doctorId: drSmith.id },
    { date: future(1),  time: '10:30', type: 'Tratament de Canal',  status: 'CONFIRMED', patientId: patientMichael.id, doctorId: drJohnson.id },
    { date: future(2),  time: '11:00', type: 'Igienizare Dentară',  status: 'PENDING',   patientId: patientEmily.id,   doctorId: drSmith.id },
    { date: future(2),  time: '14:00', type: 'Consultație',         status: 'CONFIRMED', patientId: patientJohn.id,    doctorId: drBrown.id },
    { date: future(3),  time: '10:00', type: 'Control de Rutină',   status: 'PENDING',   patientId: patientAlice.id,   doctorId: drSmith.id },
    { date: future(3),  time: '11:30', type: 'Igienizare Dentară',  status: 'CONFIRMED', patientId: patientSarah.id,   doctorId: drJohnson.id },
    { date: future(5),  time: '15:00', type: 'Tratament de Canal',  status: 'CONFIRMED', patientId: patientMichael.id, doctorId: drSmith.id },
    { date: future(7),  time: '09:30', type: 'Extracție Dentară',   status: 'PENDING',   patientId: patientJohn.id,    doctorId: drJohnson.id },
    { date: future(8),  time: '13:00', type: 'Albire Dentară',      status: 'CONFIRMED', patientId: patientEmily.id,   doctorId: drBrown.id },
    { date: future(10), time: '10:00', type: 'Detartraj',           status: 'PENDING',   patientId: patientAlice.id,   doctorId: drJohnson.id },
  ]});
  console.log('  ✅ Appointments created');

  // ─── Tooth records (John) ─────────────────────────────────────
  const johnTeeth = { 3: 'WATCH', 13: 'CRITICAL', 14: 'WATCH', 21: 'WATCH', 30: 'CRITICAL' };
  for (let n = 1; n <= 32; n++) {
    await prisma.toothRecord.create({ data: {
      toothNumber: n,
      status: johnTeeth[n] ?? 'HEALTHY',
      notes: johnTeeth[n] === 'CRITICAL' ? 'Caries profundă — tratament canal urgent.' : johnTeeth[n] === 'WATCH' ? 'Demineralizare ușoară. De urmărit.' : null,
      patientId: patientJohn.id,
    }});
  }

  // Tooth records (Sarah)
  for (let n = 1; n <= 32; n++) {
    await prisma.toothRecord.create({ data: {
      toothNumber: n, status: n === 2 ? 'CRITICAL' : 'HEALTHY',
      notes: n === 2 ? 'Necesită investigare suplimentară.' : null,
      patientId: patientSarah.id,
    }});
  }
  console.log('  ✅ Tooth records created');

  // Tooth history for John's tooth #13
  const tooth13 = await prisma.toothRecord.findUnique({ where: { patientId_toothNumber: { patientId: patientJohn.id, toothNumber: 13 } } });
  if (tooth13) {
    await prisma.toothHistory.create({ data: { procedure: 'Control de Rutină', date: new Date('2025-12-10'), notes: 'Carie detectată. Programat tratament de canal.', toothRecordId: tooth13.id, doctorId: drSmith.id } });
  }
  console.log('  ✅ Tooth history created');

  console.log('\n🎉 Seed complete!\n');
  console.log('Demo accounts:');
  console.log('  Admin     → admin@clinic.ro        / admin123');
  console.log('  Doctor    → dr.smith@clinic.ro     / doctor123');
  console.log('  Doctor    → dr.johnson@clinic.ro   / doctor123');
  console.log('  Doctor    → dr.brown@clinic.ro     / doctor123');
  console.log('  Patient   → john.doe@mail.com      / patient123');
  console.log('  Patient   → sarah.johnson@mail.com / patient123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

  