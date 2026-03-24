import React, { createContext, useState, useContext } from 'react';
import { initialAppointments, initialPatients } from '../utils/mockData';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [patients, setPatients] = useState(initialPatients);

  // --- Appointments CRUD ---
  const addAppointment = (appointment) => {
    const newApt = {
      ...appointment,
      id: `APT-${String(appointments.length + 1).padStart(3, '0')}`,
    };
    setAppointments([...appointments, newApt]);
  };

  const updateAppointment = (id, updatedFields) => {
    setAppointments(appointments.map(apt => apt.id === id ? { ...apt, ...updatedFields } : apt));
  };

  const deleteAppointment = (id) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
  };

  const getAppointmentById = (id) => appointments.find(apt => apt.id === id);


  // --- Patients CRUD (Minimal for detail view) ---
  const getPatientById = (id) => patients.find(p => p.id === id);

  return (
    <DataContext.Provider value={{
      appointments, addAppointment, updateAppointment, deleteAppointment, getAppointmentById,
      patients, getPatientById
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
