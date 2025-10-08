import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import meetingRoutes from './routes/meetings';
import taskRoutes from './routes/tasks';
import { initKafkaProducer, initKafkaConsumer, disconnectKafka } from './config/kafka';
import { startDueDateChecker } from './jobs/dueDateChecker';
import { handleCustomerDeleted, handleUserDeleted } from './events/eventHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3102;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sales-activity-service', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    const prisma = require('./config/database').default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', service: 'sales-activity-service' });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: 'Database not available' });
  }
});

// Routes
app.use('/meetings', meetingRoutes);
app.use('/tasks', taskRoutes);

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
    if (process.env.KAFKA_ENABLED !== 'false') { try { await initKafkaProducer(); console.log('✓ Kafka initialized'); } catch (error: any) { console.warn('⚠️  Kafka disabled:', error.message); } } else { console.log('ℹ️  Kafka disabled'); }

    // Start Kafka consumer
    const consumer = await initKafkaConsumer();
    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value?.toString() || '{}');
        console.log(`📥 Received event: ${event.eventType}`);

        try {
          switch (event.eventType) {
            case 'customer.deleted':
              await handleCustomerDeleted(event);
              break;
            case 'user.deleted':
              await handleUserDeleted(event);
              break;
            default:
              console.log(`Unhandled event type: ${event.eventType}`);
          }
        } catch (error: any) {
          console.error(`Error handling event ${event.eventType}:`, error);
        }
      },
    });

    // Start cron jobs
    startDueDateChecker();

    app.listen(PORT, () => {
      console.log(`🚀 Sales Activity Service running on port ${PORT}`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

startServer();

export default app;
