import { describe, it, expect } from 'vitest';
import { validateAppointment } from './ValidationService';

describe('ValidationService - validateAppointment', () => {
  it('should return valid for a complete appointment object', () => {
    const validApt = {
      patientName: 'John Doe',
      contact: '+1 555-1234',
      date: '2026-04-10',
      time: '14:30',
      type: 'Checkup',
      doctor: 'Dr. Smith'
    };
    const result = validateAppointment(validApt);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('should invalidate empty patient name', () => {
    const invalidApt = { patientName: '', contact: '+1 555', date: '2026-04-10', time: '14:30', type: 'Checkup', doctor: 'Dr. Smith' };
    const result = validateAppointment(invalidApt);
    expect(result.isValid).toBe(false);
    expect(result.errors.patientName).toBe('Numele pacientului este obligatoriu.');
  });

  it('should invalidate incorrect contact format', () => {
    const invalidApt = { patientName: 'John', contact: 'invalid!', date: '2026-04-10', time: '14:30', type: 'Checkup', doctor: 'Dr. Smith' };
    const result = validateAppointment(invalidApt);
    expect(result.isValid).toBe(false);
    expect(result.errors.contact).toBe('Un număr de contact valid (7-15 cifre) este obligatoriu.');
  });

  it('should invalidate missing fields (date, time, type, doctor)', () => {
    const invalidApt = { patientName: 'John', contact: '+1 555' };
    const result = validateAppointment(invalidApt);
    expect(result.isValid).toBe(false);
    expect(result.errors.date).toBe('Data este obligatorie.');
    expect(result.errors.time).toBe('Ora este obligatorie.');
    expect(result.errors.type).toBe('Tipul programării este obligatoriu.');
    expect(result.errors.doctor).toBe('Numele medicului este obligatoriu.');
  });
});
