import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../app.js';
import { cleanDatabase, createTestDoctor, createTestPatient, disconnectDB, authedReq } from './helpers.js';

const req = authedReq(app);

describe('Teeth API', () => {
  let patient, doctor;

  beforeEach(async () => {
    await cleanDatabase();
    doctor = await createTestDoctor();
    patient = await createTestPatient();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDB();
  });

  // ─── POST initialize ─────────────────────────────────────────
  describe('POST /api/teeth/patient/:id/initialize', () => {
    it('creates exactly 32 tooth records for a patient', async () => {
      const res = await req
        .post(`/api/teeth/patient/${patient.id}/initialize`);

      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(32);
    });

    it('numbers teeth 1 through 32 in order', async () => {
      const res = await req
        .post(`/api/teeth/patient/${patient.id}/initialize`);

      expect(res.body[0].toothNumber).toBe(1);
      expect(res.body[31].toothNumber).toBe(32);
      const numbers = res.body.map(t => t.toothNumber);
      expect(numbers).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    });

    it('initialises all teeth with HEALTHY status', async () => {
      const res = await req
        .post(`/api/teeth/patient/${patient.id}/initialize`);

      expect(res.body.every(t => t.status === 'HEALTHY')).toBe(true);
    });

    it('returns 400 if teeth already exist for the patient', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const res = await req
        .post(`/api/teeth/patient/${patient.id}/initialize`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exist');
    });

    it('scopes records to the correct patient', async () => {
      const patient2 = await createTestPatient({ email: `p2${Date.now()}@test.com` });
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      await req.post(`/api/teeth/patient/${patient2.id}/initialize`);

      const res1 = await req.get(`/api/teeth/patient/${patient.id}`);
      const res2 = await req.get(`/api/teeth/patient/${patient2.id}`);

      expect(res1.body).toHaveLength(32);
      expect(res2.body).toHaveLength(32);
      expect(res1.body[0].patientId).toBe(patient.id);
      expect(res2.body[0].patientId).toBe(patient2.id);
    });
  });

  // ─── GET by patient ──────────────────────────────────────────
  describe('GET /api/teeth/patient/:id', () => {
    it('returns all 32 tooth records for a patient', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);

      const res = await req.get(`/api/teeth/patient/${patient.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(32);
    });

    it('returns records ordered by toothNumber', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);

      const res = await req.get(`/api/teeth/patient/${patient.id}`);
      const numbers = res.body.map(t => t.toothNumber);

      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    });

    it('includes history array on each tooth', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);

      const res = await req.get(`/api/teeth/patient/${patient.id}`);

      expect(Array.isArray(res.body[0].history)).toBe(true);
    });

    it('returns empty array for a patient with no tooth records', async () => {
      const res = await req.get(`/api/teeth/patient/${patient.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  // ─── GET single tooth ────────────────────────────────────────
  describe('GET /api/teeth/:id', () => {
    it('returns a single tooth record by id', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req.get(`/api/teeth/${toothId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(toothId);
      expect(res.body.toothNumber).toBe(1);
    });

    it('includes history on the single tooth response', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req.get(`/api/teeth/${toothId}`);

      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('returns 404 for a non-existent tooth id', async () => {
      const res = await req.get('/api/teeth/999999');
      expect(res.status).toBe(404);
    });
  });

  // ─── PUT update tooth ────────────────────────────────────────
  describe('PUT /api/teeth/:id', () => {
    it('updates tooth status to CRITICAL', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .put(`/api/teeth/${toothId}`)
        .send({ status: 'CRITICAL' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CRITICAL');
    });

    it('updates tooth status to WATCH', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[1].id;

      const res = await req
        .put(`/api/teeth/${toothId}`)
        .send({ status: 'watch' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('WATCH');
    });

    it('updates notes', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .put(`/api/teeth/${toothId}`)
        .send({ notes: 'Needs root canal' });

      expect(res.status).toBe(200);
      expect(res.body.notes).toBe('Needs root canal');
    });

    it('updates both status and notes together', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .put(`/api/teeth/${toothId}`)
        .send({ status: 'CRITICAL', notes: 'Root canal required' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CRITICAL');
      expect(res.body.notes).toBe('Root canal required');
    });

    it('returns 404 for a non-existent tooth id', async () => {
      const res = await req
        .put('/api/teeth/999999')
        .send({ status: 'CRITICAL' });

      expect(res.status).toBe(404);
    });
  });

  // ─── POST history ────────────────────────────────────────────
  describe('POST /api/teeth/:id/history', () => {
    it('adds a history entry to a tooth', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .post(`/api/teeth/${toothId}/history`)
        .send({ procedure: 'Filling', date: '2026-01-15', doctorId: doctor.id });

      expect(res.status).toBe(201);
      expect(res.body.procedure).toBe('Filling');
    });

    it('stores optional notes in the history entry', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .post(`/api/teeth/${toothId}/history`)
        .send({
          procedure: 'Filling',
          date: '2026-01-15',
          notes: 'Composite filling applied',
          doctorId: doctor.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.procedure).toBe('Filling');
      expect(res.body.doctor.lastName).toBe('Doctor');
    });

    it('includes doctor name in the history response', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .post(`/api/teeth/${toothId}/history`)
        .send({ procedure: 'Extraction', date: '2026-02-01', doctorId: doctor.id });

      expect(res.body.doctor).toHaveProperty('firstName');
      expect(res.body.doctor).toHaveProperty('lastName');
    });

    it('history appears when fetching the tooth', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      await req
        .post(`/api/teeth/${toothId}/history`)
        .send({ procedure: 'Filling', date: '2026-01-15', doctorId: doctor.id });

      const res = await req.get(`/api/teeth/${toothId}`);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0].procedure).toBe('Filling');
    });

    it('returns 400 when procedure is missing', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .post(`/api/teeth/${toothId}/history`)
        .send({ date: '2026-01-15', doctorId: doctor.id });

      expect(res.status).toBe(400);
    });

    it('returns 400 when date is missing', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .post(`/api/teeth/${toothId}/history`)
        .send({ procedure: 'Filling', doctorId: doctor.id });

      expect(res.status).toBe(400);
    });

    it('returns 400 when body is empty', async () => {
      await req.post(`/api/teeth/patient/${patient.id}/initialize`);
      const teeth = await req.get(`/api/teeth/patient/${patient.id}`);
      const toothId = teeth.body[0].id;

      const res = await req
        .post(`/api/teeth/${toothId}/history`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 for a non-existent tooth id', async () => {
      const res = await req
        .post('/api/teeth/999999/history')
        .send({ procedure: 'Filling', date: '2026-01-15', doctorId: doctor.id });

      expect(res.status).toBe(404);
    });
  });
});
