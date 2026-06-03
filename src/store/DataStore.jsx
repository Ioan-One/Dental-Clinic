import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';
const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

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

const getAuthToken = () => {
  try {
    const raw = window.localStorage.getItem('dental_auth_user');
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
};

const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token) {
    window.localStorage.removeItem('dental_auth_user');
    window.location.href = '/login';
  }
  return res;
};

export const DataProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState(() => safeGetLocal(CACHE_KEY, []));
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  useEffect(() => {
    safeSetLocal(CACHE_KEY, appointments);
  }, [appointments]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return;

    const handleOnline = () => { setIsOffline(false); syncQueue(); };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchAppointments();
    fetchPatients();
    fetchDoctors();

    let ws;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
          try {
              const data = JSON.parse(event.data);
              if (data.type === 'NEW_BATCH') {
                  setAppointments(prev => {
                      const updated = [...prev, ...data.payload];
                      return updated;
                  });
              } else if (data.type === 'FORCE_LOGOUT' && data.payload.userId === user.id) {
                  logout();
                  window.location.href = '/login';
              }
          } catch(e) {}
      };
    } catch(e) {}

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws) ws.close();
    };
  }, [user]);

  const fetchAppointments = async (params = {}) => {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', params.page);
      if (params.limit) searchParams.set('limit', params.limit);
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);
      if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) searchParams.set('dateTo', params.dateTo);

      const url = `${API_BASE}/api/appointments?${searchParams.toString()}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const result = await res.json();
        setAppointments(result.data || []);
        if (result.pagination) setPagination(result.pagination);
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (e) {
      setIsOffline(true);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/patients?limit=100`);
      if (res.ok) {
        const result = await res.json();
        setPatients(result.data || []);
      }
    } catch (e) {}
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/doctors`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data || []);
      }
    } catch (e) {}
  };

  const syncQueue = async () => {
    const queue = safeGetLocal(SYNC_QUEUE_KEY, []);
    if (queue.length === 0) return;

    const remainingQueue = [];
    
    for (const item of queue) {
      try {
        await fetchWithAuth(`${API_BASE}/api/appointments${item.method === 'POST' ? '' : `/${item.id}`}`, {
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
        const res = await fetchWithAuth(`${API_BASE}/api/appointments`, {
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
        const res = await fetchWithAuth(`${API_BASE}/api/appointments/${id}`, {
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
        const res = await fetchWithAuth(`${API_BASE}/api/appointments/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Server unreachable');
    } catch(e) {
        addToQueue('DELETE', id, null);
    }
  };

  const getAppointmentById = (id) => appointments.find(apt => apt.id === id);
  
  const getPatientById = (id) => {
    // Support both numeric IDs (from DB) and string IDs (legacy)
    return patients.find(p => p.id === id || p.id === parseInt(id));
  };

  // Fetch booked slots for a doctor in a date range (used by slot picker)
  const fetchDoctorSlots = async (doctorId, dateFrom, dateTo) => {
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await fetchWithAuth(`${API_BASE}/api/appointments/slots/${doctorId}?${params}`);
      if (res.ok) return await res.json();
      return { bookedSlots: {} };
    } catch (e) {
      return { bookedSlots: {} };
    }
  };

  // Fetch appointments for a doctor in a date range (used by calendar view)
  const fetchDoctorAppointments = async (doctorId, dateFrom, dateTo) => {
    try {
      const params = new URLSearchParams({ doctorId: String(doctorId), dateFrom, dateTo, limit: '200' });
      const res = await fetchWithAuth(`${API_BASE}/api/appointments?${params}`);
      if (res.ok) {
        const result = await res.json();
        return result.data || [];
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  return (
    <DataContext.Provider value={{
      appointments, addAppointment, updateAppointment, deleteAppointment, getAppointmentById,
      patients, getPatientById, fetchPatients,
      doctors, fetchDoctors,
      isOffline, syncQueue, fetchAppointments, pagination,
      fetchDoctorSlots, fetchDoctorAppointments
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
