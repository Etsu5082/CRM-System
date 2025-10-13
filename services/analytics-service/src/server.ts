import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import { initKafkaConsumer, disconnectKafka } from './config/kafka';
import { connectRedis, disconnectRedis } from './config/redis';
import * as eventHandler from './events/eventHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3104;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-service', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    const prisma = require('./config/database').default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', service: 'analytics-service' });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: 'Database not available' });
  }
});

// Routes
app.use('/notifications', notificationRoutes);
app.use('/reports', reportRoutes);

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
    // Initialize Redis if available
    try {
      await connectRedis();
      console.log('✓ Redis connected');
    } catch (error: any) {
      console.warn('⚠️  Redis connection failed, continuing without Redis:', error.message);
    }

    // Initialize Kafka only if enabled
    if (process.env.KAFKA_ENABLED !== 'false') {
      try {
        const consumer = await initKafkaConsumer();
        console.log('✓ Kafka consumer initialized');

        consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value?.toString() || '{}');
            console.log(`📥 Received event: ${event.eventType}`);

            try {
              switch (event.eventType) {
                case 'approval.requested':
                  await eventHandler.handleApprovalRequested(event);
                  break;
                case 'approval.approved':
                  await eventHandler.handleApprovalApproved(event);
                  break;
                case 'approval.rejected':
                  await eventHandler.handleApprovalRejected(event);
                  break;
                case 'task.due_soon':
                  await eventHandler.handleTaskDueSoon(event);
                  break;
                case 'task.completed':
                  await eventHandler.handleTaskCompleted(event);
                  break;
                case 'customer.created':
                  await eventHandler.handleCustomerCreated(event);
                  break;
                case 'meeting.created':
                  await eventHandler.handleMeetingCreated(event);
                  break;
                default:
                  console.log(`Unhandled event type: ${event.eventType}`);
              }
            } catch (error: any) {
              console.error(`Error handling event ${event.eventType}:`, error);
            }
          },
        });
      } catch (error: any) {
        console.warn('⚠️  Kafka connection failed, continuing without Kafka:', error.message);
      }
    } else {
      console.log('ℹ️  Kafka disabled by configuration');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Analytics Service running on port ${PORT}`);
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
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectKafka();
  await disconnectRedis();
  process.exit(0);
});

startServer();

export default app;
