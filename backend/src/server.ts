import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import meetingRoutes from './routes/meetings';
import taskRoutes from './routes/tasks';
import approvalRoutes from './routes/approvals';
import reportRoutes from './routes/reports';
import auditRoutes from './routes/audit';
import notificationRoutes from './routes/notifications';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Securities CRM API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      customers: '/api/customers',
      meetings: '/api/meetings',
      tasks: '/api/tasks',
      approvals: '/api/approvals',
      reports: '/api/reports',
      audit: '/api/audit',
      notifications: '/api/notifications',
    },
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Customer routes
app.use('/api/customers', customerRoutes);

// Meeting routes
app.use('/api/meetings', meetingRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// Approval routes
app.use('/api/approvals', approvalRoutes);

// Report routes
app.use('/api/reports', reportRoutes);

// Audit routes
app.use('/api/audit', auditRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});