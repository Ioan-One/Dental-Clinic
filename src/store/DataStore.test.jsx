import { renderHook, act } from '@testing-library/react';
import { DataProvider, useData } from './DataStore';
import { describe, it, expect } from 'vitest';

describe('DataStore', () => {
  const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>;

  it('provides initial data', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    expect(result.current.appointments.length).toBeGreaterThan(0);
    expect(result.current.patients.length).toBeGreaterThan(0);
  });

  it('adds an appointment', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    const initialLength = result.current.appointments.length;
    
    act(() => {
      result.current.addAppointment({
        patientName: 'Test Patient',
        doctor: 'Test Doctor'
      });
    });

    expect(result.current.appointments.length).toBe(initialLength + 1);
    expect(result.current.appointments[result.current.appointments.length - 1].patientName).toBe('Test Patient');
  });

  it('updates an appointment', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    const targetId = result.current.appointments[0].id;

    act(() => {
      result.current.updateAppointment(targetId, { patientName: 'Updated Name' });
    });

    const updated = result.current.getAppointmentById(targetId);
    expect(updated.patientName).toBe('Updated Name');
  });

  it('deletes an appointment', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    const initialLength = result.current.appointments.length;
    const targetId = result.current.appointments[0].id;

    act(() => {
      result.current.deleteAppointment(targetId);
    });

    expect(result.current.appointments.length).toBe(initialLength - 1);
    expect(result.current.getAppointmentById(targetId)).toBeUndefined();
  });
});
