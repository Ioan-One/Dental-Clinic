import { Router } from 'express';
import { prisma } from '../store/db.js';

const router = Router();

const isStaff = (user) => ['admin', 'doctor', 'assistant'].includes(user?.role);

// IMPORTANT: Specific routes MUST come before parameterized /:id routes

// POST create tooth records for a patient (bulk - all 32 teeth)
router.post('/patient/:patientId/initialize', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);

    // Check if records already exist
    const existing = await prisma.toothRecord.count({ where: { patientId } });
    if (existing > 0) {
      return res.status(400).json({ error: 'Tooth records already exist for this patient' });
    }

    const records = [];
    for (let num = 1; num <= 32; num++) {
      records.push({ toothNumber: num, status: 'HEALTHY', patientId });
    }

    await prisma.toothRecord.createMany({ data: records });

    const created = await prisma.toothRecord.findMany({
      where: { patientId },
      orderBy: { toothNumber: 'asc' },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/teeth/patient/:id/initialize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all tooth records for a patient
router.get('/patient/:patientId', async (req, res) => {
  const patientId = parseInt(req.params.patientId);
  if (!isStaff(req.user) && req.user.patientId !== patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
  }
  try {
    const records = await prisma.toothRecord.findMany({
      where: { patientId },
      orderBy: { toothNumber: 'asc' },
      include: {
        history: {
          orderBy: { date: 'desc' },
          include: {
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    res.json(records);
  } catch (error) {
    console.error('GET /api/teeth/patient/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST add tooth history entry (procedure log)
router.post('/:id/history', async (req, res) => {
  try {
    const { procedure, date, notes, doctorId } = req.body;
    if (!procedure || !date || !doctorId) {
      return res.status(400).json({ error: 'Required: procedure, date, doctorId' });
    }

    const toothRecord = await prisma.toothRecord.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!toothRecord) return res.status(404).json({ error: 'Tooth record not found' });

    const entry = await prisma.toothHistory.create({
      data: {
        procedure,
        date: new Date(date),
        notes: notes || null,
        toothRecordId: parseInt(req.params.id),
        doctorId: parseInt(doctorId),
      },
      include: {
        doctor: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('POST /api/teeth/:id/history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single tooth record
router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.toothRecord.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        history: {
          orderBy: { date: 'desc' },
          include: {
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!record) return res.status(404).json({ error: 'Tooth record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update tooth status and notes
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.toothRecord.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!existing) return res.status(404).json({ error: 'Tooth record not found' });

    const { status, notes } = req.body;
    const updateData = {};
    if (status) updateData.status = status.toUpperCase();
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.toothRecord.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
