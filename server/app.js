import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import patientsRouter from './routes/patients.js';
import statisticsRouter from './routes/statistics.js';
import appointmentsRouter from './routes/appointments.js';
import generateRouter from './routes/generate.js';
import doctorsRouter from './routes/doctors.js';
import teethRouter from './routes/teeth.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import adminRouter from './routes/admin.js';
import { verifyToken } from './middleware/authMiddleware.js';

const app = express();

// Security headers — X-Frame-Options, HSTS, X-Content-Type-Options, CSP, etc.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: false, // CSP handled by the frontend build tool
}));

// Only allow requests from the Vite frontend (same host, port 5173)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || /^https?:\/\/[^/]+:5173$/;
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

// Global rate limit — blunts JMeter / DDoS attacks
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 200,              // max 200 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Tighter limit on auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // max 20 login/register attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);
app.use(express.json());
app.use(cookieParser());

// Public — no token required (but rate-limited harder)
app.use('/api/auth', authLimiter, authRouter);

// All routes below require a valid JWT
app.use('/api/patients', verifyToken, patientsRouter);
app.use('/api/statistics', verifyToken, statisticsRouter);
app.use('/api/appointments', verifyToken, appointmentsRouter);
app.use('/api/generate', verifyToken, generateRouter);
app.use('/api/doctors', verifyToken, doctorsRouter);
app.use('/api/teeth', verifyToken, teethRouter);
app.use('/api/chat', verifyToken, chatRouter);
app.use('/api/admin', verifyToken, adminRouter);

// Fallback for 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;
