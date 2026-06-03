import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../store/db.js';

describe('Auth API Endpoints', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `testuser_${Date.now()}@clinic.com`,
    password: 'SecurePass1!',
  };

  afterAll(async () => {
    // Clean up test user
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.patient.deleteMany({ where: { userId: user.id } });
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
    });

    it('should hash the password in the database', async () => {
      const user = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(user).toBeDefined();
      expect(user.password).not.toBe(testUser.password); // Should be hashed
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash format
    });

    it('should not allow duplicate emails', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email already in use/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials and return a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body).toHaveProperty('token');
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@clinic.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });
});
