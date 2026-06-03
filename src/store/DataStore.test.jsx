import { renderHook, act, waitFor } from '@testing-library/react';
import { DataProvider, useData } from './DataStore';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sampleAppointment = {
  id: 1, patientName: 'Ion Popescu', doctor: 'Dr. Maria', contact: '0712345678',
  date: '2026-01-15', time: '10:00', type: 'Control', status: 'confirmed', is_deleted: false,
};
const samplePatient = {
  id: 1, firstName: 'Ion', lastName: 'Popescu', email: 'ion@test.com', phone: '0712345678',
};

const makeFetch = () =>
  vi.fn().mockImplementation((url) => {
    if (url.includes('/api/appointments')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [sampleAppointment], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
      });
    }
    if (url.includes('/api/patients')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [samplePatient] }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });

describe('DataStore', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetch());
    vi.stubGlobal('WebSocket', class { onmessage = null; close() {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>;

  it('provides initial data', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.appointments.length).toBeGreaterThan(0));
    expect(result.current.patients.length).toBeGreaterThan(0);
  });

  it('adds an appointment', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.appointments.length).toBeGreaterThan(0));
    const initialLength = result.current.appointments.length;

    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...sampleAppointment, id: 99, patientName: 'Test Patient' }),
      })
    );

    act(() => {
      result.current.addAppointment({ patientName: 'Test Patient', doctor: 'Test Doctor' });
    });

    expect(result.current.appointments.length).toBe(initialLength + 1);
    expect(result.current.appointments[result.current.appointments.length - 1].patientName).toBe('Test Patient');
  });

  it('updates an appointment', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.appointments.length).toBeGreaterThan(0));
    const targetId = result.current.appointments[0].id;

    act(() => {
      result.current.updateAppointment(targetId, { patientName: 'Updated Name' });
    });

    const updated = result.current.getAppointmentById(targetId);
    expect(updated.patientName).toBe('Updated Name');
  });

  it('deletes an appointment', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.appointments.length).toBeGreaterThan(0));
    const initialLength = result.current.appointments.length;
    const targetId = result.current.appointments[0].id;

    act(() => {
      result.current.deleteAppointment(targetId);
    });

    expect(result.current.appointments.length).toBe(initialLength - 1);
    expect(result.current.getAppointmentById(targetId)).toBeUndefined();
  });
});
