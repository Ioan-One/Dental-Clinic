import { Router } from 'express';
import { prisma } from '../store/db.js';

const router = Router();

// GET statistics — patient and appointment stats with aggregates
router.get('/', async (req, res) => {
  try {
    // Patient statistics
    const totalPatients = await prisma.patient.count();
    const activePatients = await prisma.patient.count({ where: { isDeleted: false } });
    const deletedPatients = await prisma.patient.count({ where: { isDeleted: true } });

    // Appointment statistics
    const totalAppointments = await prisma.appointment.count({ where: { isDeleted: false } });

    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: { isDeleted: false },
      _count: { status: true },
    });

    // Format status counts
    const statusCounts = {};
    appointmentsByStatus.forEach(item => {
      statusCounts[item.status.toLowerCase()] = item._count.status;
    });

    // Appointments by type
    const appointmentsByType = await prisma.appointment.groupBy({
      by: ['type'],
      where: { isDeleted: false },
      _count: { type: true },
    });

    const typeCounts = {};
    appointmentsByType.forEach(item => {
      typeCounts[item.type] = item._count.type;
    });

    // Appointments by doctor
    const appointmentsByDoctor = await prisma.appointment.groupBy({
      by: ['doctorId'],
      where: { isDeleted: false },
      _count: { doctorId: true },
    });

    // Resolve doctor names
    const doctorStats = await Promise.all(
      appointmentsByDoctor.map(async (item) => {
        const doctor = await prisma.doctor.findUnique({ where: { id: item.doctorId } });
        return {
          doctorId: item.doctorId,
          doctorName: doctor ? `Dr. ${doctor.lastName}` : 'Unknown',
          count: item._count.doctorId,
        };
      })
    );

    res.json({
      patients: {
        totalCreated: totalPatients,
        activePatients,
        deletedPatients,
      },
      appointments: {
        total: totalAppointments,
        byStatus: statusCounts,
        byType: typeCounts,
        byDoctor: doctorStats,
      },
    });
  } catch (error) {
    console.error('GET /api/statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
