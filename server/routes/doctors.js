import { Router } from 'express';
import { prisma } from '../store/db.js';

const router = Router();

// GET all active doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isDeleted: false },
      orderBy: { lastName: 'asc' },
    });
    res.json(doctors);
  } catch (error) {
    console.error('GET /api/doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET doctor by id
router.get('/:id', async (req, res) => {
  try {
    const doctor = await prisma.doctor.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new doctor
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, specialization } = req.body;
    if (!firstName || !lastName || !email || !phone || !specialization) {
      return res.status(400).json({ error: 'All fields required: firstName, lastName, email, phone, specialization' });
    }
    const doctor = await prisma.doctor.create({
      data: { firstName, lastName, email, phone, specialization },
    });
    res.status(201).json(doctor);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update doctor
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.doctor.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });
    if (!existing) return res.status(404).json({ error: 'Doctor not found' });
    const updated = await prisma.doctor.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE doctor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.doctor.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });
    if (!existing) return res.status(404).json({ error: 'Doctor not found' });
    await prisma.doctor.update({
      where: { id: parseInt(req.params.id) },
      data: { isDeleted: true },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
