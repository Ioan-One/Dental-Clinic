import { Router } from 'express';
import { prisma } from '../store/db.js';
import { validatePatient } from '../validators/patientValidator.js';

const router = Router();

// Helpers for role-based access
const isStaff = (user) => ['admin', 'doctor', 'assistant'].includes(user?.role);

// GET all active patients with pagination, search, sort, and filters
router.get('/', async (req, res) => {
  // Patients can only see their own record, not the full list
  if (!isStaff(req.user)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order || 'desc';
    const skip = (page - 1) * limit;

    // Build the where clause
    const where = {
      isDeleted: false,
    };

    // Search filter: match firstName, lastName, or email
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build valid orderBy (only allow known columns)
    const allowedSortFields = ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = order === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: orderDir },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET patient by id
router.get('/:id', async (req, res) => {
  const requestedId = parseInt(req.params.id);
    const patient = await prisma.patient.findFirst({
      where: {
        id: requestedId,
        isDeleted: false,
      },
      include: {
        toothRecords: {
          orderBy: { toothNumber: 'asc' },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // A patient can only access their own record. Fallback to userId if patientId is missing in token.
    if (!isStaff(req.user) && req.user.patientId !== requestedId && patient.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(patient);
  } catch (error) {
    console.error('GET /api/patients/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new patient
router.post('/', validatePatient, async (req, res) => {
  try {
    const newPatient = await prisma.patient.create({
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
      },
    });

    // Initialize 32 default teeth for the patient
    const teeth = [];
    for (let num = 1; num <= 32; num++) {
      teeth.push({ toothNumber: num, status: 'HEALTHY', patientId: newPatient.id });
    }
    await prisma.toothRecord.createMany({ data: teeth });

    res.status(201).json(newPatient);
  } catch (error) {
    // Handle unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already in use' });
    }
    console.error('POST /api/patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update patient
router.put('/:id', validatePatient, async (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: 'Access denied.' });
  try {
    const existing = await prisma.patient.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const updated = await prisma.patient.update({
      where: { id: parseInt(req.params.id) },
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already in use' });
    }
    console.error('PUT /api/patients/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE patient (soft delete — admin only)
router.delete('/:id', async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const existing = await prisma.patient.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await prisma.patient.update({
      where: { id: parseInt(req.params.id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Also soft-delete the patient's appointments
    await prisma.appointment.updateMany({
      where: { patientId: parseInt(req.params.id), isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('DELETE /api/patients/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
