import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../app.js';
import { cleanDatabase, createTestDoctor, createTestPatient, disconnectDB, authedReq } from './helpers.js';
import { prisma } from '../store/db.js';

const req = authedReq(app);

describe('Appointments API', () => {
  let doctor, patient;

  beforeEach(async () => {
    await cleanDatabase();
    doctor = await createTestDoctor();
    patient = await createTestPatient();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDB();
  });

  const futureDate = (daysAhead = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const makeAppointment = (overrides = {}) => ({
    patientId: patient.id,
    doctorId: doctor.id,
    date: futureDate(),
    time: '10:00',
    type: 'Control de Rutină',
    status: 'confirmed',
    ...overrides,
  });

  // ─── POST ────────────────────────────────────────────────────
  describe('POST /api/appointments', () => {
    it('creates an appointment and returns formatted body', async () => {
      const res = await req.post('/api/appointments').send(makeAppointment());

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe('Control de Rutină');
      expect(res.body.status).toBe('confirmed');
      expect(res.body.patientName).toContain('Patient');
      expect(res.body.contact).toBeDefined();
    });

    it('normalises status to lowercase in the response', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ status: 'COMPLETED' }));

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('completed');
    });

    it('defaults to PENDING when status is omitted', async () => {
      const { status, ...withoutStatus } = makeAppointment();
      const res = await req.post('/api/appointments').send(withoutStatus);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });

    it('saves optional notes field', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ notes: 'Patient has allergy' }));

      expect(res.status).toBe(201);
      // Verify it's in the DB
      const row = await prisma.appointment.findUnique({ where: { id: res.body.id } });
      expect(row.notes).toBe('Patient has allergy');
    });

    it('rejects appointments for past dates', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ date: '2020-01-01' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('past');
    });

    it('rejects appointments before 08:00', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ time: '06:00' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('08:00');
    });

    it('rejects appointments at or after 18:00', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ time: '18:00' }));

      expect(res.status).toBe(400);
    });

    it('accepts appointments at the boundary 08:00', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ time: '08:00' }));

      expect(res.status).toBe(201);
    });

    it('accepts appointments at 17:00 (last valid hour)', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ time: '17:00' }));

      expect(res.status).toBe(201);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await req.post('/api/appointments').send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 when patientId is missing', async () => {
      const { patientId, ...body } = makeAppointment();
      const res = await req.post('/api/appointments').send(body);
      expect(res.status).toBe(400);
    });

    it('returns 400 for non-existent patient', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ patientId: 999999 }));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Patient');
    });

    it('returns 400 for non-existent doctor', async () => {
      const res = await req
        .post('/api/appointments')
        .send(makeAppointment({ doctorId: 999999 }));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Doctor');
    });

    it('returns 400 when patient is soft-deleted', async () => {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { isDeleted: true },
      });

      const res = await req
        .post('/api/appointments')
        .send(makeAppointment());

      expect(res.status).toBe(400);
    });
  });

  // ─── GET list ────────────────────────────────────────────────
  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      for (let i = 0; i < 12; i++) {
        await req
          .post('/api/appointments')
          .send(makeAppointment({ time: `${8 + (i % 9)}:00` }));
      }
    });

    it('returns paginated results with default limit 10', async () => {
      const res = await req.get('/api/appointments');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination.total).toBe(12);
      expect(res.body.pagination.totalPages).toBe(2);
      expect(res.body.pagination.page).toBe(1);
    });

    it('returns the second page correctly', async () => {
      const res = await req.get('/api/appointments?page=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.page).toBe(2);
    });

    it('respects a custom limit', async () => {
      const res = await req.get('/api/appointments?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('filters by status (case-insensitive)', async () => {
      await req
        .post('/api/appointments')
        .send(makeAppointment({ status: 'COMPLETED', time: '17:00' }));

      const res = await req.get('/api/appointments?status=COMPLETED');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every(a => a.status === 'completed')).toBe(true);
    });

    it('filters by doctorId', async () => {
      const doctor2 = await createTestDoctor({ email: `dr2${Date.now()}@test.com` });
      await req
        .post('/api/appointments')
        .send(makeAppointment({ doctorId: doctor2.id, time: '09:00' }));

      const res = await req.get(`/api/appointments?doctorId=${doctor2.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every(a => a.doctorId === doctor2.id)).toBe(true);
    });

    it('filters by patientId', async () => {
      const patient2 = await createTestPatient({ email: `p2${Date.now()}@test.com` });
      await req
        .post('/api/appointments')
        .send(makeAppointment({ patientId: patient2.id, time: '09:00' }));

      const res = await req.get(`/api/appointments?patientId=${patient2.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every(a => a.patientId === patient2.id)).toBe(true);
    });

    it('filters by date range', async () => {
      const from = futureDate(5);
      const to = futureDate(9);

      const res = await req.get(
        `/api/appointments?dateFrom=${from}&dateTo=${to}`
      );

      expect(res.status).toBe(200);
      res.body.data.forEach(a => {
        expect(a.date >= from).toBe(true);
        expect(a.date <= to).toBe(true);
      });
    });

    it('searches by patient name', async () => {
      const uniquePatient = await createTestPatient({
        firstName: 'Xylophone',
        lastName: 'Zebra',
        email: `xz${Date.now()}@test.com`,
      });
      await req
        .post('/api/appointments')
        .send(makeAppointment({ patientId: uniquePatient.id, time: '09:00' }));

      const res = await req.get('/api/appointments?search=Xylophone');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].patientName).toContain('Xylophone');
    });

    it('excludes soft-deleted appointments', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment({ time: '08:30' }));
      await req.delete(`/api/appointments/${createRes.body.id}`);

      const listRes = await req.get('/api/appointments');
      const ids = listRes.body.data.map(a => a.id);
      expect(ids).not.toContain(createRes.body.id);
    });
  });

  // ─── GET by ID ───────────────────────────────────────────────
  describe('GET /api/appointments/:id', () => {
    it('returns a single appointment by id', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;

      const res = await req.get(`/api/appointments/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.patientName).toBeDefined();
      expect(res.body.doctor).toBeDefined();
    });

    it('returns 404 for a non-existent appointment', async () => {
      const res = await req.get('/api/appointments/999999');
      expect(res.status).toBe(404);
    });

    it('returns 404 for a soft-deleted appointment', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;
      await req.delete(`/api/appointments/${id}`);

      const res = await req.get(`/api/appointments/${id}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PUT ─────────────────────────────────────────────────────
  describe('PUT /api/appointments/:id', () => {
    it('updates the status', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;

      const res = await req
        .put(`/api/appointments/${id}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('updates multiple fields at once', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;
      const newDate = futureDate(14);

      const res = await req
        .put(`/api/appointments/${id}`)
        .send({ time: '11:30', type: 'Igienizare Dentară', date: newDate });

      expect(res.status).toBe(200);
      expect(res.body.time).toBe('11:30');
      expect(res.body.type).toBe('Igienizare Dentară');
      expect(res.body.date).toBe(newDate);
    });

    it('updates notes', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;

      const res = await req
        .put(`/api/appointments/${id}`)
        .send({ notes: 'Follow-up required' });

      expect(res.status).toBe(200);
      const row = await prisma.appointment.findUnique({ where: { id } });
      expect(row.notes).toBe('Follow-up required');
    });

    it('returns 404 for non-existent appointment', async () => {
      const res = await req
        .put('/api/appointments/999999')
        .send({ status: 'completed' });
      expect(res.status).toBe(404);
    });

    it('returns 404 when trying to update a soft-deleted appointment', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;
      await req.delete(`/api/appointments/${id}`);

      const res = await req
        .put(`/api/appointments/${id}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE ──────────────────────────────────────────────────
  describe('DELETE /api/appointments/:id', () => {
    it('soft-deletes an appointment (204 response)', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;

      const delRes = await req.delete(`/api/appointments/${id}`);
      expect(delRes.status).toBe(204);
    });

    it('sets isDeleted=true and deletedAt in the database', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;

      await req.delete(`/api/appointments/${id}`);

      const row = await prisma.appointment.findUnique({ where: { id } });
      expect(row.isDeleted).toBe(true);
      expect(row.deletedAt).not.toBeNull();
    });

    it('hides the deleted appointment from GET list', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;
      await req.delete(`/api/appointments/${id}`);

      const listRes = await req.get('/api/appointments');
      expect(listRes.body.data.map(a => a.id)).not.toContain(id);
    });

    it('returns 404 for non-existent appointment', async () => {
      const res = await req.delete('/api/appointments/999999');
      expect(res.status).toBe(404);
    });

    it('returns 404 when deleting an already soft-deleted appointment', async () => {
      const createRes = await req
        .post('/api/appointments')
        .send(makeAppointment());
      const id = createRes.body.id;
      await req.delete(`/api/appointments/${id}`);

      const res = await req.delete(`/api/appointments/${id}`);
      expect(res.status).toBe(404);
    });
  });
});
