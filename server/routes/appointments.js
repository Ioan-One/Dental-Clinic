import { Router } from 'express';
import { state } from '../store/memory.js';

const router = Router();

// GET all appointments
router.get('/', (req, res) => {
  res.json(state.appointments.filter(a => !a.is_deleted));
});

// POST new appointment
router.post('/', (req, res) => {
  const newAppointment = {
    id: `APT-${String(state.nextAptId++).padStart(3, '0')}`,
    ...req.body,
    is_deleted: false,
    createdAt: new Date().toISOString()
  };
  state.appointments.push(newAppointment);
  res.status(201).json(newAppointment);
});

// PUT update appointment
router.put('/:id', (req, res) => {
  const index = state.appointments.findIndex(a => a.id === req.params.id && !a.is_deleted);
  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  state.appointments[index] = {
    ...state.appointments[index],
    ...req.body,
    id: state.appointments[index].id, // Ensure ID cannot be overridden
    updatedAt: new Date().toISOString()
  };
  
  res.json(state.appointments[index]);
});

// DELETE appointment (soft delete)
router.delete('/:id', (req, res) => {
  const index = state.appointments.findIndex(a => a.id === req.params.id && !a.is_deleted);
  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  state.appointments[index].is_deleted = true;
  state.appointments[index].deletedAt = new Date().toISOString();
  res.status(204).send();
});

export default router;
