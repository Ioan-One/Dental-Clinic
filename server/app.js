import express from 'express';
import cors from 'cors';
import patientsRouter from './routes/patients.js';
import statisticsRouter from './routes/statistics.js';
import appointmentsRouter from './routes/appointments.js';
import generateRouter from './routes/generate.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/patients', patientsRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/generate', generateRouter);

// Fallback for 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;
