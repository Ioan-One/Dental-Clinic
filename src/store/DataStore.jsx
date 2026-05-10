import React, { createContext, useState, useEffect, useContext } from 'react';
import { initialPatients, initialAppointments } from '../utils/mockData'; 

const DataContext = createContext(null);

const SYNC_QUEUE_KEY = 'dental_offline_sync_queue';
const CACHE_KEY = 'dental_appointments_cache';

const safeGetLocal = (key, fallback) => {
  try {
    const val = window.localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
};

const safeSetLocal = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
};

export const DataProvider = ({ children }) => {
  const [appointments, setAppointments] = useState(() => safeGetLocal(CACHE_KEY, initialAppointments));
  const [patients, setPatients] = useState(initialPatients);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    safeSetLocal(CACHE_KEY, appointments);
  }, [appointments]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => { setIsOffline(false); syncQueue(); };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchAppointments();
    
    let ws;
    try {
      ws = new WebSocket('ws://localhost:3001');
      ws.onmessage = (event) => {
          try {
              const data = JSON.parse(event.data);
              if (data.type === 'NEW_BATCH') {
                  setAppointments(prev => {
                      const updated = [...prev, ...data.payload];
                      return updated;
                  });
              }
          } catch(e) {}
      };
    } catch(e) {}

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws) ws.close();
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/appointments');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
            setAppointments(data);
        }
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (e) {
      setIsOffline(true);
    }
  };

  const syncQueue = async () => {
    const queue = safeGetLocal(SYNC_QUEUE_KEY, []);
    if (queue.length === 0) return;

    const remainingQueue = [];
    
    for (const item of queue) {
      try {
        await fetch(`http://localhost:3001/api/appointments${item.method === 'POST' ? '' : `/${item.id}`}`, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: item.method !== 'DELETE' ? JSON.stringify(item.payload) : undefined
        });
      } catch (e) {
        remainingQueue.push(item);
      }
    }
    
    safeSetLocal(SYNC_QUEUE_KEY, remainingQueue);
    if (remainingQueue.length === 0) {
        fetchAppointments(); 
    }
  };

  const addToQueue = (method, id, payload) => {
      const queue = safeGetLocal(SYNC_QUEUE_KEY, []);
      queue.push({ method, id, payload });
      safeSetLocal(SYNC_QUEUE_KEY, queue);
      setIsOffline(true);
  };

  const addAppointment = async (appointment) => {
    const tempId = `TEMP-${Date.now()}`;
    const newApt = { ...appointment, id: tempId, is_deleted: false };
    
    setAppointments(prev => [...prev, newApt]);
    
    try {
        const res = await fetch('http://localhost:3001/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointment)
        });
        if (!res.ok) throw new Error('Server unreachable');
        const created = await res.json();
        setAppointments(prev => prev.map(a => a.id === tempId ? created : a));
    } catch(e) {
        addToQueue('POST', null, appointment);
    }
  };

  const updateAppointment = async (id, updatedFields) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...updatedFields } : apt));
    
    if (id.toString().startsWith('TEMP-')) return; 

    try {
        const res = await fetch(`http://localhost:3001/api/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFields)
        });
        if (!res.ok) throw new Error('Server unreachable');
    } catch(e) {
        addToQueue('PUT', id, updatedFields);
    }
  };

  const deleteAppointment = async (id) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
    
    if (id.toString().startsWith('TEMP-')) return;

    try {
        const res = await fetch(`http://localhost:3001/api/appointments/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Server unreachable');
    } catch(e) {
        addToQueue('DELETE', id, null);
    }
  };

  const getAppointmentById = (id) => appointments.find(apt => apt.id === id);
  const getPatientById = (id) => patients.find(p => p.id === id);

  return (
    <DataContext.Provider value={{
      appointments, addAppointment, updateAppointment, deleteAppointment, getAppointmentById,
      patients, getPatientById, isOffline, syncQueue
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
