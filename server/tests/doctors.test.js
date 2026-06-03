import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../app.js';
import { cleanDatabase, disconnectDB, authedReq } from './helpers.js';
import { prisma } from '../store/db.js';

const req = authedReq(app);

describe('Doctors API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDB();
  });

  const validDoctor = {
    firstName: 'Maria',
    lastName: 'Ionescu',
    email: 'maria@clinic.com',
    phone: '+40 721 111 111',
    specialization: 'Ortodonție',
  };

  // ─── POST ────────────────────────────────────────────────────
  describe('POST /api/doctors', () => {
    it('creates a new doctor and returns full record', async () => {
      const res = await req.post('/api/doctors').send(validDoctor);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.firstName).toBe('Maria');
      expect(res.body.specialization).toBe('Ortodonție');
      expect(res.body.isDeleted).toBe(false);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await req
        .post('/api/doctors')
        .send({ firstName: 'Test' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is empty', async () => {
      const res = await req.post('/api/doctors').send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for duplicate email', async () => {
      await req.post('/api/doctors').send(validDoctor);
      const res = await req.post('/api/doctors').send(validDoctor);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email');
    });

    it('persists the record to the database', async () => {
      const res = await req.post('/api/doctors').send(validDoctor);
      const row = await prisma.doctor.findUnique({ where: { id: res.body.id } });

      expect(row).not.toBeNull();
      expect(row.email).toBe('maria@clinic.com');
    });
  });

  // ─── GET all ─────────────────────────────────────────────────
  describe('GET /api/doctors', () => {
    it('returns all active doctors', async () => {
      await req.post('/api/doctors').send(validDoctor);
      await req.post('/api/doctors').send({
        ...validDoctor,
        email: 'second@clinic.com',
        lastName: 'Popescu',
      });

      const res = await req.get('/api/doctors');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('excludes soft-deleted doctors', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      await req.delete(`/api/doctors/${created.body.id}`);

      const res = await req.get('/api/doctors');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('returns empty array when no doctors exist', async () => {
      const res = await req.get('/api/doctors');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  // ─── GET by ID ───────────────────────────────────────────────
  describe('GET /api/doctors/:id', () => {
    it('returns the correct doctor', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      const res = await req.get(`/api/doctors/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.lastName).toBe('Ionescu');
    });

    it('returns 404 for non-existent doctor', async () => {
      const res = await req.get('/api/doctors/999999');
      expect(res.status).toBe(404);
    });

    it('returns 404 for a soft-deleted doctor', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      await req.delete(`/api/doctors/${created.body.id}`);

      const res = await req.get(`/api/doctors/${created.body.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PUT ─────────────────────────────────────────────────────
  describe('PUT /api/doctors/:id', () => {
    it('updates doctor specialization', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      const res = await req
        .put(`/api/doctors/${created.body.id}`)
        .send({ ...validDoctor, specialization: 'Endodonție' });

      expect(res.status).toBe(200);
      expect(res.body.specialization).toBe('Endodonție');
    });

    it('updates multiple fields at once', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      const res = await req
        .put(`/api/doctors/${created.body.id}`)
        .send({ ...validDoctor, firstName: 'Elena', phone: '+40 722 999 999' });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Elena');
      expect(res.body.phone).toBe('+40 722 999 999');
    });

    it('returns 400 for duplicate email on update', async () => {
      await req
        .post('/api/doctors')
        .send({ ...validDoctor, email: 'other@clinic.com', lastName: 'Other' });
      const created = await req.post('/api/doctors').send(validDoctor);

      const res = await req
        .put(`/api/doctors/${created.body.id}`)
        .send({ ...validDoctor, email: 'other@clinic.com' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent doctor', async () => {
      const res = await req
        .put('/api/doctors/999999')
        .send(validDoctor);
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE ──────────────────────────────────────────────────
  describe('DELETE /api/doctors/:id', () => {
    it('soft-deletes a doctor (204 response)', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      const delRes = await req.delete(`/api/doctors/${created.body.id}`);

      expect(delRes.status).toBe(204);
    });

    it('sets isDeleted=true in the database', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      await req.delete(`/api/doctors/${created.body.id}`);

      const row = await prisma.doctor.findUnique({ where: { id: created.body.id } });
      expect(row.isDeleted).toBe(true);
    });

    it('hides the doctor from GET after soft delete', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      await req.delete(`/api/doctors/${created.body.id}`);

      const getRes = await req.get(`/api/doctors/${created.body.id}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 for non-existent doctor', async () => {
      const res = await req.delete('/api/doctors/999999');
      expect(res.status).toBe(404);
    });

    it('returns 404 when deleting an already soft-deleted doctor', async () => {
      const created = await req.post('/api/doctors').send(validDoctor);
      await req.delete(`/api/doctors/${created.body.id}`);

      const res = await req.delete(`/api/doctors/${created.body.id}`);
      expect(res.status).toBe(404);
    });
  });
});
