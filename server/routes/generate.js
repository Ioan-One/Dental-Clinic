import { Router } from 'express';
import { faker } from '@faker-js/faker';
import { state } from '../store/memory.js';
import { broadcastBatch } from '../websocket.js';

const router = Router();
let generatorInterval = null;

router.post('/start', (req, res) => {
  if (generatorInterval) {
    return res.status(400).json({ error: 'Generator is already running' });
  }

  // Generate a batch every 5 seconds
  generatorInterval = setInterval(() => {
    const batchedItems = [];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
    
    for (let i = 0; i < numItems; i++) {
        const types = ['Control de Rutină', 'Tratament de Canal', 'Igienizare Dentară', 'Consultație'];
        const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
        
        const newApt = {
            id: `APT-${String(state.nextAptId++).padStart(3, '0')}`,
            patientName: faker.person.fullName(),
            contact: faker.phone.number(),
            date: faker.date.soon().toISOString().split('T')[0],
            time: "10:00",
            type: faker.helpers.arrayElement(types),
            doctor: `Dr. ${faker.person.lastName()}`,
            status: faker.helpers.arrayElement(statuses),
            is_deleted: false,
            createdAt: new Date().toISOString()
        };
        state.appointments.push(newApt);
        batchedItems.push(newApt);
    }
    
    // Broadcast newly generated batch to all WebSocket clients
    broadcastBatch(batchedItems);
    
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
