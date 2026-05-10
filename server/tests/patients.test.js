import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetState } from '../store/memory.js';

describe('Patients API', () => {
  beforeEach(() => {
    resetState();
  });

  const validPatient = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '1234567890'
  };

  describe('POST /api/patients', () => {
    it('should create a new patient when input is valid', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send(validPatient);
      
      expect(res.status).toBe(201);
      expect(res.body.firstName).toBe('John');
      expect(res.body.id).toBe(1);
      expect(res.body.is_deleted).toBe(false);
    });

    it('should return 400 when validation fails (e.g., missing phone)', async () => {
      const invalidPatient = { ...validPatient };
      delete invalidPatient.phone;

      const res = await request(app)
        .post('/api/patients')
        .send(invalidPatient);
      
      if (!res.body.errors) console.log(res.body);
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
    
    it('should return 400 when payload is entirely invalid', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({});
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/patients', () => {
    beforeEach(async () => {
      // Create 15 patients for pagination testing
      for (let i = 0; i < 15; i++) {
        await request(app).post('/api/patients').send({
          ...validPatient,
          email: `test${i}@example.com`
        });
      }
    });

    it('should return first page with default limit 10', async () => {
      const res = await request(app).get('/api/patients');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination.total).toBe(15);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should return second page with 5 items', async () => {
      const res = await request(app).get('/api/patients?page=2');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.page).toBe(2);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should return 404 for non-existent patient', async () => {
      const res = await request(app).get('/api/patients/999');
      expect(res.status).toBe(404);
    });

    it('should return the correct patient', async () => {
      const createdRes = await request(app).post('/api/patients').send(validPatient);
      const id = createdRes.body.id;

      const res = await request(app).get(`/api/patients/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient details', async () => {
      const createdRes = await request(app).post('/api/patients').send(validPatient);
      const id = createdRes.body.id;

      const res = await request(app)
        .put(`/api/patients/${id}`)
        .send({
          ...validPatient,
          firstName: 'Jane'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Jane');
    });
    
    it('should return 404 for non-existent patient on put', async () => {
      const res = await request(app).put('/api/patients/999').send(validPatient);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/patients/:id and Statistics', () => {
    it('should soft delete and update statistics', async () => {
      const createdRes = await request(app).post('/api/patients').send(validPatient);
      const id = createdRes.body.id;

      // Soft delete
      const delRes = await request(app).delete(`/api/patients/${id}`);
      expect(delRes.status).toBe(204);

      // Verify patient is hidden from GET
      const getRes = await request(app).get(`/api/patients/${id}`);
      expect(getRes.status).toBe(404);

      // Verify statistics
      const statsRes = await request(app).get('/api/statistics');
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.totalCreated).toBe(1);
      expect(statsRes.body.activePatients).toBe(0);
      expect(statsRes.body.deletedPatients).toBe(1);
    });
    
    it('should return 404 for non-existent patient on delete', async () => {
      const res = await request(app).delete('/api/patients/999');
      expect(res.status).toBe(404);
    });
  });
  
  describe('Fallback Route', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Endpoint not found');
    });
  });
});
