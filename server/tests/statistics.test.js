import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../app.js';
import { cleanDatabase, createTestDoctor, createTestPatient, disconnectDB, authedReq } from './helpers.js';
import { prisma } from '../store/db.js';

const req = authedReq(app);

describe('Statistics API', () => {
  let doctor, patient;

  const futureDate = (daysAhead = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  };

  const createAppointment = (overrides = {}) =>
    prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: futureDate(),
        time: '10:00',
        type: 'Control de Rutină',
        status: 'CONFIRMED',
        ...overrides,
      },
    });

  beforeEach(async () => {
    await cleanDatabase();
    doctor = await createTestDoctor();
    patient = await createTestPatient();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDB();
  });

  // ─── Shape ───────────────────────────────────────────────────
  describe('GET /api/statistics — response shape', () => {
    it('returns the expected top-level keys', async () => {
      const res = await req.get('/api/statistics');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('patients');
      expect(res.body).toHaveProperty('appointments');
    });

    it('patients section has the correct keys', async () => {
      const res = await req.get('/api/statistics');
      const { patients } = res.body;

      expect(patients).toHaveProperty('totalCreated');
      expect(patients).toHaveProperty('activePatients');
      expect(patients).toHaveProperty('deletedPatients');
    });

    it('appointments section has the correct keys', async () => {
      const res = await req.get('/api/statistics');
      const { appointments } = res.body;

      expect(appointments).toHaveProperty('total');
      expect(appointments).toHaveProperty('byStatus');
      expect(appointments).toHaveProperty('byType');
      expect(appointments).toHaveProperty('byDoctor');
    });
  });

  // ─── Patient counts ──────────────────────────────────────────
  describe('Patient statistics', () => {
    it('returns zero counts when the database is empty', async () => {
      await cleanDatabase();
      const res = await req.get('/api/statistics');

      expect(res.body.patients.totalCreated).toBe(0);
      expect(res.body.patients.activePatients).toBe(0);
      expect(res.body.patients.deletedPatients).toBe(0);
    });

    it('counts one active patient after creation', async () => {
      // patient is already created in beforeEach
      const res = await req.get('/api/statistics');

      expect(res.body.patients.activePatients).toBe(1);
      expect(res.body.patients.deletedPatients).toBe(0);
      expect(res.body.patients.totalCreated).toBe(1);
    });

    it('moves patient from active to deleted after soft delete', async () => {
      await req.delete(`/api/patients/${patient.id}`);

      const res = await req.get('/api/statistics');

      expect(res.body.patients.activePatients).toBe(0);
      expect(res.body.patients.deletedPatients).toBe(1);
      expect(res.body.patients.totalCreated).toBe(1);
    });

    it('tracks multiple patients correctly', async () => {
      await createTestPatient({ email: `p2${Date.now()}@test.com` });
      const p3 = await createTestPatient({ email: `p3${Date.now()}@test.com` });
      await req.delete(`/api/patients/${p3.id}`);

      const res = await req.get('/api/statistics');

      expect(res.body.patients.totalCreated).toBe(3);
      expect(res.body.patients.activePatients).toBe(2);
      expect(res.body.patients.deletedPatients).toBe(1);
    });
  });

  // ─── Appointment total ───────────────────────────────────────
  describe('Appointment total', () => {
    it('returns 0 when no appointments exist', async () => {
      const res = await req.get('/api/statistics');
      expect(res.body.appointments.total).toBe(0);
    });

    it('counts active appointments', async () => {
      await createAppointment();
      await createAppointment({ time: '11:00' });

      const res = await req.get('/api/statistics');
      expect(res.body.appointments.total).toBe(2);
    });

    it('excludes soft-deleted appointments from total', async () => {
      const apt = await createAppointment();
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      const res = await req.get('/api/statistics');
      expect(res.body.appointments.total).toBe(0);
    });
  });

  // ─── Appointments by status ──────────────────────────────────
  describe('Appointments byStatus', () => {
    it('returns empty object when no appointments exist', async () => {
      const res = await req.get('/api/statistics');
      expect(res.body.appointments.byStatus).toEqual({});
    });

    it('counts confirmed appointments', async () => {
      await createAppointment({ status: 'CONFIRMED' });
      await createAppointment({ status: 'CONFIRMED', time: '11:00' });

      const res = await req.get('/api/statistics');
      expect(res.body.appointments.byStatus.confirmed).toBe(2);
    });

    it('counts appointments across all statuses', async () => {
      await createAppointment({ status: 'CONFIRMED' });
      await createAppointment({ status: 'PENDING',   time: '11:00' });
      await createAppointment({ status: 'COMPLETED', time: '12:00' });
      await createAppointment({ status: 'CANCELLED', time: '13:00' });

      const res = await req.get('/api/statistics');
      const { byStatus } = res.body.appointments;

      expect(byStatus.confirmed).toBe(1);
      expect(byStatus.pending).toBe(1);
      expect(byStatus.completed).toBe(1);
      expect(byStatus.cancelled).toBe(1);
    });

    it('does not count soft-deleted appointments in status totals', async () => {
      const apt = await createAppointment({ status: 'CONFIRMED' });
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      const res = await req.get('/api/statistics');
      expect(res.body.appointments.byStatus.confirmed).toBeUndefined();
    });
  });

  // ─── Appointments by type ─────────────────────────────────────
  describe('Appointments byType', () => {
    it('returns empty object when no appointments exist', async () => {
      const res = await req.get('/api/statistics');
      expect(res.body.appointments.byType).toEqual({});
    });

    it('counts each appointment type', async () => {
      await createAppointment({ type: 'Control de Rutină' });
      await createAppointment({ type: 'Control de Rutină', time: '11:00' });
      await createAppointment({ type: 'Igienizare Dentară', time: '12:00' });

      const res = await req.get('/api/statistics');
      const { byType } = res.body.appointments;

      expect(byType['Control de Rutină']).toBe(2);
      expect(byType['Igienizare Dentară']).toBe(1);
    });
  });

  // ─── Appointments by doctor ──────────────────────────────────
  describe('Appointments byDoctor', () => {
    it('returns empty array when no appointments exist', async () => {
      const res = await req.get('/api/statistics');
      expect(res.body.appointments.byDoctor).toEqual([]);
    });

    it('includes doctor name and appointment count', async () => {
      await createAppointment();
      await createAppointment({ time: '11:00' });

      const res = await req.get('/api/statistics');
      const { byDoctor } = res.body.appointments;

      expect(byDoctor).toHaveLength(1);
      expect(byDoctor[0].doctorId).toBe(doctor.id);
      expect(byDoctor[0].doctorName).toContain('Doctor');
      expect(byDoctor[0].count).toBe(2);
    });

    it('separates counts per doctor', async () => {
      const doctor2 = await createTestDoctor({ email: `dr2${Date.now()}@test.com` });
      await createAppointment({ doctorId: doctor.id });
      await createAppointment({ doctorId: doctor.id,  time: '11:00' });
      await createAppointment({ doctorId: doctor2.id, time: '12:00' });

      const res = await req.get('/api/statistics');
      const { byDoctor } = res.body.appointments;

      const d1 = byDoctor.find(d => d.doctorId === doctor.id);
      const d2 = byDoctor.find(d => d.doctorId === doctor2.id);

      expect(d1.count).toBe(2);
      expect(d2.count).toBe(1);
    });
  });
});
