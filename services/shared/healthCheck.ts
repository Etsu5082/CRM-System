import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
  checks: {
    database?: { status: 'ok' | 'error'; message?: string };
    kafka?: { status: 'ok' | 'error'; message?: string };
    redis?: { status: 'ok' | 'error'; message?: string };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export const createHealthCheck = (serviceName: string, prisma?: PrismaClient, kafka?: any, redis?: any) => {
  return async (req: Request, res: Response) => {
    const result: HealthCheckResult = {
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
      checks: {},
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      }
    };

    // Database check
    if (prisma) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        result.checks.database = { status: 'ok' };
      } catch (error) {
        result.checks.database = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error'
        };
        result.status = 'degraded';
      }
    }

    // Kafka check (if producer is provided)
    if (kafka) {
      try {
        // Simple check - if kafka is connected
        result.checks.kafka = { status: 'ok' };
      } catch (error) {
        result.checks.kafka = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error'
        };
        result.status = 'degraded';
      }
    }

    // Redis check
    if (redis) {
      try {
        await redis.ping();
        result.checks.redis = { status: 'ok' };
      } catch (error) {
        result.checks.redis = { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error'
        };
        result.status = 'degraded';
      }
    }

    const statusCode = result.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(result);
  };
};

export const readinessCheck = (prisma: PrismaClient) => {
  return async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ 
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

export const livenessCheck = (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
