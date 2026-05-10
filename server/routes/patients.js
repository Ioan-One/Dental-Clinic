import { Router } from 'express';
import { state } from '../store/memory.js';
import { validatePatient } from '../validators/patientValidator.js';

const router = Router();

// GET all active patients with pagination
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const activePatients = state.patients.filter(p => !p.is_deleted);
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = activePatients.slice(startIndex, endIndex);
  
  res.json({
    data: results,
    pagination: {
      total: activePatients.length,
      page,
      limit,
      totalPages: Math.ceil(activePatients.length / limit)
    }
  });
});

// GET patient by id
router.get('/:id', (req, res) => {
  const patient = state.patients.find(p => p.id === parseInt(req.params.id) && !p.is_deleted);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json(patient);
});

// POST new patient
router.post('/', validatePatient, (req, res) => {
  const newPatient = {
    id: state.nextId++,
    ...req.body,
    is_deleted: false,
    createdAt: new Date().toISOString()
  };
  
  state.patients.push(newPatient);
  res.status(201).json(newPatient);
});

// PUT update patient
router.put('/:id', validatePatient, (req, res) => {
  const index = state.patients.findIndex(p => p.id === parseInt(req.params.id) && !p.is_deleted);
  if (index === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  state.patients[index] = {
    ...state.patients[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json(state.patients[index]);
});

// DELETE patient (soft delete)
router.delete('/:id', (req, res) => {
  const index = state.patients.findIndex(p => p.id === parseInt(req.params.id) && !p.is_deleted);
  if (index === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  state.patients[index].is_deleted = true;
  state.patients[index].deletedAt = new Date().toISOString();
  
  res.status(204).send();
});

export default router;
