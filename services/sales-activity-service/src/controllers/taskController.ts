import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { publishEvent } from '../config/kafka';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

const createTaskSchema = z.object({
  customerId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);

    // Get userId from header (set by API Gateway) or from req.user (for backward compatibility)
    const userId = req.headers['x-user-id'] as string || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        userId: userId,
        dueDate: new Date(data.dueDate),
      },
    });

    // Publish event
    await publishEvent('sales.events', {
      eventId: uuidv4(),
      eventType: 'task.created',
      timestamp: new Date().toISOString(),
      data: {
        taskId: task.id,
        userId: task.userId,
        customerId: task.customerId,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, customerId, status, priority } = req.query;

    const where: any = {};
    if (userId) where.userId = userId as string;
    if (customerId) where.customerId = customerId as string;
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Publish event
    await publishEvent('sales.events', {
      eventId: uuidv4(),
      eventType: 'task.updated',
      timestamp: new Date().toISOString(),
      data: {
        taskId: task.id,
        userId: task.userId,
        status: task.status,
      },
    });

    // If completed, publish specific event
    if (data.status === 'COMPLETED') {
      await publishEvent('sales.events', {
        eventId: uuidv4(),
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          taskId: task.id,
          userId: task.userId,
          title: task.title,
        },
      });
    }

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOverdueTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
