import { Router } from 'express';
import { faker } from '@faker-js/faker';
import { prisma } from '../store/db.js';
import { broadcastBatch } from '../websocket.js';

const router = Router();
let generatorInterval = null;

router.post('/start', async (req, res) => {
  if (generatorInterval) {
    return res.status(400).json({ error: 'Generator is already running' });
  }

  // Get all doctors and patients to use for FK relationships
  const doctors = await prisma.doctor.findMany({ where: { isDeleted: false } });
  const patients = await prisma.patient.findMany({ where: { isDeleted: false } });

  if (doctors.length === 0 || patients.length === 0) {
    return res.status(400).json({ error: 'Need at least one doctor and one patient in the database' });
  }

  // Generate a batch every 5 seconds
  generatorInterval = setInterval(async () => {
    try {
      const batchedItems = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items

      for (let i = 0; i < numItems; i++) {
        const types = ['Control de Rutină', 'Tratament de Canal', 'Igienizare Dentară', 'Consultație'];
        const statuses = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'];
        const randomDoctor = faker.helpers.arrayElement(doctors);
        const randomPatient = faker.helpers.arrayElement(patients);

        const newApt = await prisma.appointment.create({
          data: {
            date: faker.date.soon({ days: 30 }),
            time: `${faker.number.int({ min: 8, max: 17 })}:${faker.helpers.arrayElement(['00', '30'])}`,
            type: faker.helpers.arrayElement(types),
            status: faker.helpers.arrayElement(statuses),
            patientId: randomPatient.id,
            doctorId: randomDoctor.id,
          },
          include: {
            patient: { select: { firstName: true, lastName: true, phone: true } },
            doctor: { select: { lastName: true } },
          },
        });

        batchedItems.push({
          id: newApt.id,
          patientName: `${newApt.patient.firstName} ${newApt.patient.lastName}`,
          contact: newApt.patient.phone,
          date: newApt.date.toISOString().split('T')[0],
          time: newApt.time,
          type: newApt.type,
          doctor: `Dr. ${newApt.doctor.lastName}`,
          status: newApt.status.toLowerCase(),
          is_deleted: false,
          createdAt: newApt.createdAt.toISOString(),
        });
      }

      // Broadcast newly generated batch to all WebSocket clients
      broadcastBatch(batchedItems);
    } catch (error) {
      console.error('Faker generation error:', error);
    }
  }, 5000);

  res.json({ message: 'Generator started' });
});

router.post('/stop', (req, res) => {
  if (generatorInterval) {
    clearInterval(generatorInterval);
    generatorInterval = null;
    return res.json({ message: 'Generator stopped' });
  }
  res.status(400).json({ error: 'Generator is not running' });
});

export default router;
