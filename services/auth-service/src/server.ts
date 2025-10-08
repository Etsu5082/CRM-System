import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { initKafkaProducer, disconnectKafkaProducer } from './config/kafka';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const prisma = require('./config/database').default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', service: 'auth-service' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'Database not available' });
  }
});

// Routes
app.use('/auth', authRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const startServer = async () => {
  try {
    await initKafkaProducer();

    app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectKafkaProducer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectKafkaProducer();
  process.exit(0);
});

startServer();

export default app;
