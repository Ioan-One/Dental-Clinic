import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../store/db.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'super_secret_dental_key_for_development';
const TEST_TOKEN = jwt.sign({ userId: 0, role: 'admin', permissions: [] }, JWT_SECRET, { expiresIn: '1h' });

export const authedReq = (app) => ({
  get:    (url)        => request(app).get(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
  post:   (url)        => request(app).post(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
  put:    (url)        => request(app).put(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
  delete: (url)        => request(app).delete(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
});

/**
 * Clean all tables for test isolation.
 * Order matters due to foreign key constraints.
 */
export async function cleanDatabase() {
  await prisma.toothHistory.deleteMany();
  await prisma.toothRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
}

/**
 * Create a test doctor and return it.
 */
export async function createTestDoctor(overrides = {}) {
  return prisma.doctor.create({
    data: {
      firstName: 'Test',
      lastName: 'Doctor',
      email: `dr.test${Date.now()}${Math.random()}@test.com`,
      phone: '+1 555-9999',
      specialization: 'General',
      ...overrides,
    },
  });
}

/**
 * Create a test patient and return it.
 */
export async function createTestPatient(overrides = {}) {
  return prisma.patient.create({
    data: {
      firstName: 'Test',
      lastName: 'Patient',
      email: `test${Date.now()}${Math.random()}@test.com`,
      phone: '+1 555-8888',
      ...overrides,
    },
  });
}

/**
 * Disconnect Prisma after all tests.
 */
export async function disconnectDB() {
  await prisma.$disconnect();
}
