import { prisma } from './db.js';

const PERMISSIONS = [
  { name: 'patients:read',           description: 'View patient list and details' },
  { name: 'patients:read:own',       description: 'View own patient record only' },
  { name: 'patients:write',          description: 'Create, update, and delete any patient' },
  { name: 'doctors:read',            description: 'View doctor list and details' },
  { name: 'doctors:write',           description: 'Create, update, and delete doctors' },
  { name: 'appointments:read',       description: 'View all appointments' },
  { name: 'appointments:read:own',   description: 'View own appointments only' },
  { name: 'appointments:write',      description: 'Create, update, and delete any appointment' },
  { name: 'appointments:write:own',  description: 'Create appointments for self only' },
  { name: 'teeth:read',              description: 'View dental records' },
  { name: 'teeth:write',             description: 'Update dental records and history' },
  { name: 'statistics:read',         description: 'View statistics dashboard' },
  { name: 'chat:read',               description: 'Read chat messages' },
  { name: 'chat:write',              description: 'Send chat messages' },
];

const ROLES = [
  {
    name: 'admin',
    description: 'Full access to all features and data',
    permissions: PERMISSIONS.map(p => p.name),
  },
  {
    name: 'doctor',
    description: 'Manage appointments, view and update patient dental records',
    permissions: [
      'patients:read',
      'appointments:read',
      'appointments:write',
      'teeth:read',
      'teeth:write',
      'doctors:read',
      'statistics:read',
      'chat:read',
      'chat:write',
    ],
  },
  {
    name: 'assistant',
    description: 'Schedule appointments and view patient information',
    permissions: [
      'patients:read',
      'appointments:read',
      'appointments:write',
      'teeth:read',
      'doctors:read',
      'chat:read',
      'chat:write',
    ],
  },
  {
    name: 'patient',
    description: 'View own medical history and upcoming appointments',
    permissions: [
      'patients:read:own',
      'appointments:read:own',
      'appointments:write:own',
      'teeth:read',
      'chat:read',
      'chat:write',
    ],
  },
];

export async function seedRolesAndPermissions() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
  }

  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    for (const permName of roleDef.permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }
}
