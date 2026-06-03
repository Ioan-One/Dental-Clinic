import { Router } from 'express';
import { prisma } from '../store/db.js';

const router = Router();

// GET all appointments with pagination, filters, and includes
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status; // filter by status
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const doctorId = req.query.doctorId;
    const patientId = req.query.patientId;
    const search = req.query.search || '';

    // Build where clause
    const where = { isDeleted: false };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (doctorId) {
      where.doctorId = parseInt(doctorId);
    }

    if (patientId) {
      where.patientId = parseInt(patientId);
    }

    if (search) {
      where.OR = [
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true, specialization: true },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    // Format response to match frontend expectations
    const formattedData = data.map(apt => ({
      id: apt.id,
      patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      patientId: apt.patientId,
      contact: apt.patient.phone,
      date: apt.date.toISOString().split('T')[0],
      time: apt.time,
      type: apt.type,
      doctor: `Dr. ${apt.doctor.lastName}`,
      doctorId: apt.doctorId,
      status: apt.status.toLowerCase(),
      is_deleted: apt.isDeleted,
      createdAt: apt.createdAt.toISOString(),
    }));

    res.json({
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET booked slots for a doctor in a date range
router.get('/slots/:doctorId', async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);
    if (isNaN(doctorId)) {
      return res.status(400).json({ error: 'Invalid doctorId' });
    }

    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo query params are required' });
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    // Fetch all non-deleted, non-cancelled appointments for this doctor in range
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
        date: { gte: from, lte: to },
      },
      select: { date: true, time: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    // Group by date string
    const bookedSlots = {};
    for (const apt of appointments) {
      const dateKey = apt.date.toISOString().split('T')[0];
      if (!bookedSlots[dateKey]) bookedSlots[dateKey] = [];
      bookedSlots[dateKey].push(apt.time);
    }

    res.json({
      doctorId,
      dateFrom,
      dateTo,
      bookedSlots,
    });
  } catch (error) {
    console.error('GET /api/appointments/slots/:doctorId error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single appointment by id
router.get('/:id', async (req, res) => {
  try {
    const apt = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      id: apt.id,
      patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      patientId: apt.patientId,
      contact: apt.patient.phone,
      date: apt.date.toISOString().split('T')[0],
      time: apt.time,
      type: apt.type,
      doctor: `Dr. ${apt.doctor.lastName}`,
      doctorId: apt.doctorId,
      status: apt.status.toLowerCase(),
      is_deleted: apt.isDeleted,
      createdAt: apt.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/appointments/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new appointment
router.post('/', async (req, res) => {
  try {
    const { patientId, doctorId, date, time, type, status, notes } = req.body;

    // Validate required fields
    if (!patientId || !doctorId || !date || !time || !type) {
      return res.status(400).json({ error: 'Missing required fields: patientId, doctorId, date, time, type' });
    }

    // Validate date is not in the past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({ error: 'Cannot book appointments for past dates' });
    }

    // Validate time is within clinic hours (08:00 - 18:00)
    const [hours] = time.split(':').map(Number);
    if (hours < 8 || hours >= 18) {
      return res.status(400).json({ error: 'Appointments must be between 08:00 and 18:00' });
    }

    // Check patient exists
    const patient = await prisma.patient.findFirst({
      where: { id: parseInt(patientId), isDeleted: false },
    });
    if (!patient) {
      return res.status(400).json({ error: 'Patient not found' });
    }

    // Check doctor exists
    const doctor = await prisma.doctor.findFirst({
      where: { id: parseInt(doctorId), isDeleted: false },
    });
    if (!doctor) {
      return res.status(400).json({ error: 'Doctor not found' });
    }

    const newApt = await prisma.appointment.create({
      data: {
        date: appointmentDate,
        time,
        type,
        status: (status || 'PENDING').toUpperCase(),
        notes: notes || null,
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      id: newApt.id,
      patientName: `${newApt.patient.firstName} ${newApt.patient.lastName}`,
      patientId: newApt.patientId,
      contact: newApt.patient.phone,
      date: newApt.date.toISOString().split('T')[0],
      time: newApt.time,
      type: newApt.type,
      doctor: `Dr. ${newApt.doctor.lastName}`,
      doctorId: newApt.doctorId,
      status: newApt.status.toLowerCase(),
      is_deleted: newApt.isDeleted,
      createdAt: newApt.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('POST /api/appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update appointment
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const updateData = {};
    if (req.body.date) updateData.date = new Date(req.body.date);
    if (req.body.time) updateData.time = req.body.time;
    if (req.body.type) updateData.type = req.body.type;
    if (req.body.status) updateData.status = req.body.status.toUpperCase();
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.doctorId) updateData.doctorId = parseInt(req.body.doctorId);
    if (req.body.patientId) updateData.patientId = parseInt(req.body.patientId);

    const updated = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({
      id: updated.id,
      patientName: `${updated.patient.firstName} ${updated.patient.lastName}`,
      patientId: updated.patientId,
      contact: updated.patient.phone,
      date: updated.date.toISOString().split('T')[0],
      time: updated.time,
      type: updated.type,
      doctor: `Dr. ${updated.doctor.lastName}`,
      doctorId: updated.doctorId,
      status: updated.status.toLowerCase(),
      is_deleted: updated.isDeleted,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/appointments/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE appointment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('DELETE /api/appointments/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
