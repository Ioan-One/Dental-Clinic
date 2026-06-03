import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../app.js';
import { cleanDatabase, createTestDoctor, disconnectDB, authedReq } from './helpers.js';
import { prisma } from '../store/db.js';

const req = authedReq(app);

describe('Patients API', () => {
  let testDoctor;

  beforeEach(async () => {
    await cleanDatabase();
    testDoctor = await createTestDoctor();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDB();
  });

  const validPatient = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '1234567890',
  };

  // ─── POST ────────────────────────────────────────────────────
  describe('POST /api/patients', () => {
    it('creates a patient and returns full record', async () => {
      const res = await req.post('/api/patients').send(validPatient);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.firstName).toBe('John');
      expect(res.body.isDeleted).toBe(false);
      expect(res.body.createdAt).toBeDefined();
    });

    it('persists the record to the database', async () => {
      const res = await req.post('/api/patients').send(validPatient);
      const row = await prisma.patient.findUnique({ where: { id: res.body.id } });

      expect(row).not.toBeNull();
      expect(row.email).toBe('john@example.com');
    });

    it('returns 400 when phone is missing', async () => {
      const { phone, ...body } = validPatient;
      const res = await req.post('/api/patients').send(body);

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('returns 400 when firstName is missing', async () => {
      const { firstName, ...body } = validPatient;
      const res = await req.post('/api/patients').send(body);
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await req
        .post('/api/patients')
        .send({ ...validPatient, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is empty', async () => {
      const res = await req.post('/api/patients').send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for duplicate email', async () => {
      await req.post('/api/patients').send(validPatient);
      const res = await req.post('/api/patients').send(validPatient);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email');
    });
  });

  // ─── GET list ────────────────────────────────────────────────
  describe('GET /api/patients', () => {
    beforeEach(async () => {
      for (let i = 0; i < 15; i++) {
        await req
          .post('/api/patients')
          .send({ ...validPatient, email: `test${i}@example.com` });
      }
    });

    it('returns first page with default limit 10', async () => {
      const res = await req.get('/api/patients');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination.total).toBe(15);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('returns second page', async () => {
      const res = await req.get('/api/patients?page=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.page).toBe(2);
    });

    it('respects custom limit', async () => {
      const res = await req.get('/api/patients?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('filters by search term (firstName)', async () => {
      await req.post('/api/patients').send({
        ...validPatient,
        firstName: 'UniqueXYZ',
        email: 'unique@search.com',
      });

      const res = await req.get('/api/patients?search=UniqueXYZ');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].firstName).toBe('UniqueXYZ');
    });

    it('filters by search term (email)', async () => {
      const res = await req.get('/api/patients?search=test5@example.com');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('sorts by lastName ascending', async () => {
      const res = await req.get('/api/patients?sortBy=lastName&order=asc');

      expect(res.status).toBe(200);
      const names = res.body.data.map(p => p.lastName);
      expect(names).toEqual([...names].sort());
    });

    it('sorts by firstName descending', async () => {
      const res = await req.get('/api/patients?sortBy=firstName&order=desc');

      expect(res.status).toBe(200);
      const names = res.body.data.map(p => p.firstName);
      expect(names).toEqual([...names].sort().reverse());
    });

    it('excludes soft-deleted patients', async () => {
      const created = await req.post('/api/patients').send({
        ...validPatient,
        email: 'todelete@example.com',
      });
      await req.delete(`/api/patients/${created.body.id}`);

      const res = await req.get('/api/patients');
      const ids = res.body.data.map(p => p.id);
      expect(ids).not.toContain(created.body.id);
    });
  });

  // ─── GET by ID ───────────────────────────────────────────────
  describe('GET /api/patients/:id', () => {
    it('returns the correct patient', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const res = await req.get(`/api/patients/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.firstName).toBe('John');
    });

    it('includes toothRecords in the response', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      // Initialize teeth for this patient
      await req.post(`/api/teeth/patient/${created.body.id}/initialize`);

      const res = await req.get(`/api/patients/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.toothRecords)).toBe(true);
      expect(res.body.toothRecords).toHaveLength(32);
    });

    it('returns toothRecords as empty array when not initialized', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const res = await req.get(`/api/patients/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.toothRecords).toHaveLength(0);
    });

    it('returns 404 for non-existent patient', async () => {
      const res = await req.get('/api/patients/999999');
      expect(res.status).toBe(404);
    });

    it('returns 404 for a soft-deleted patient', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      await req.delete(`/api/patients/${created.body.id}`);

      const res = await req.get(`/api/patients/${created.body.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PUT ─────────────────────────────────────────────────────
  describe('PUT /api/patients/:id', () => {
    it('updates patient details', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const res = await req
        .put(`/api/patients/${created.body.id}`)
        .send({ ...validPatient, firstName: 'Jane' });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Jane');
    });

    it('updates multiple fields at once', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const res = await req
        .put(`/api/patients/${created.body.id}`)
        .send({ ...validPatient, firstName: 'Jane', phone: '9999999999' });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Jane');
      expect(res.body.phone).toBe('9999999999');
    });

    it('returns 400 for duplicate email on update', async () => {
      await req
        .post('/api/patients')
        .send({ ...validPatient, email: 'other@example.com', firstName: 'Other' });
      const created = await req.post('/api/patients').send(validPatient);

      const res = await req
        .put(`/api/patients/${created.body.id}`)
        .send({ ...validPatient, email: 'other@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email');
    });

    it('returns 400 for invalid email on update', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const res = await req
        .put(`/api/patients/${created.body.id}`)
        .send({ ...validPatient, email: 'bad-email' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent patient', async () => {
      const res = await req
        .put('/api/patients/999999')
        .send(validPatient);
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE ──────────────────────────────────────────────────
  describe('DELETE /api/patients/:id', () => {
    it('soft-deletes a patient (204 response)', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const res = await req.delete(`/api/patients/${created.body.id}`);

      expect(res.status).toBe(204);
    });

    it('sets isDeleted=true and deletedAt in the database', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      await req.delete(`/api/patients/${created.body.id}`);

      const row = await prisma.patient.findUnique({ where: { id: created.body.id } });
      expect(row.isDeleted).toBe(true);
      expect(row.deletedAt).not.toBeNull();
    });

    it('hides the patient from GET list after soft delete', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      await req.delete(`/api/patients/${created.body.id}`);

      const res = await req.get('/api/patients');
      expect(res.body.data.map(p => p.id)).not.toContain(created.body.id);
    });

    it('cascades soft-delete to the patient\'s appointments', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      const patientId = created.body.id;

      // Create an appointment for this patient
      const d = new Date();
      d.setDate(d.getDate() + 7);
      await prisma.appointment.create({
        data: {
          patientId,
          doctorId: testDoctor.id,
          date: d,
          time: '10:00',
          type: 'Control de Rutină',
          status: 'CONFIRMED',
        },
      });

      await req.delete(`/api/patients/${patientId}`);

      const appointments = await prisma.appointment.findMany({
        where: { patientId, isDeleted: false },
      });
      expect(appointments).toHaveLength(0);
    });

    it('returns 404 for non-existent patient', async () => {
      const res = await req.delete('/api/patients/999999');
      expect(res.status).toBe(404);
    });

    it('returns 404 when deleting an already soft-deleted patient', async () => {
      const created = await req.post('/api/patients').send(validPatient);
      await req.delete(`/api/patients/${created.body.id}`);

      const res = await req.delete(`/api/patients/${created.body.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── Fallback ─────────────────────────────────────────────────
  describe('Fallback route', () => {
    it('returns 404 for unknown endpoints', async () => {
      const res = await req.get('/api/unknown-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Endpoint not found');
    });
  });
});
