import { Router } from 'express';
import { state } from '../store/memory.js';

const router = Router();

router.get('/', (req, res) => {
  const totalCreated = state.patients.length;
  const activePatients = state.patients.filter(p => !p.is_deleted).length;
  const deletedPatients = state.patients.filter(p => p.is_deleted).length;
  
  res.json({
    totalCreated,
    activePatients,
    deletedPatients
  });
});

export default router;
