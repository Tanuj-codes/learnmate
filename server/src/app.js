import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from './config/env.js';
import prisma from './config/prisma.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import asyncHandler from './utils/asyncHandler.js';
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import lessonRoutes from './routes/lesson.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import flashcardRoutes from './routes/flashcard.routes.js';
import gameRoutes from './routes/game.routes.js';
import goalRoutes from './routes/goal.routes.js';
import protectedRoutes from './routes/index.js';

const app = express();

app.disable('x-powered-by');
if (config.TRUST_PROXY) app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin) and configured origins only.
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      if (!config.isProduction) {
        console.warn(`[cors] Blocked origin: ${origin}`);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    exposedHeaders: ['x-request-id'],
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
}

app.get(
  '/api/v1/health',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
          environment: config.NODE_ENV,
          emailConfigured: config.EMAIL_ENABLED,
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is not reachable.' },
      });
    }
  })
);

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1', quizRoutes);
app.use('/api/v1', flashcardRoutes);
app.use('/api/v1', gameRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1', protectedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
