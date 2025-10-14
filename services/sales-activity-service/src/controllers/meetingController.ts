import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { publishEvent } from '../config/kafka';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const createMeetingSchema = z.object({
  customerId: z.string(),
  date: z.string().datetime(),
  summary: z.string().min(1),
  nextAction: z.string().optional(),
  nextActionDate: z.string().datetime().optional(),
});

const updateMeetingSchema = z.object({
  date: z.string().datetime().optional(),
  summary: z.string().min(1).optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().datetime().optional(),
});

export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const data = createMeetingSchema.parse(req.body);

    // Get userId from header (set by API Gateway) or from req.user (for backward compatibility)
    const userId = req.headers['x-user-id'] as string || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify customer exists
    try {
      await axios.get(
        `${process.env.CUSTOMER_SERVICE_URL}/customers/${data.customerId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
    } catch (error) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const meeting = await prisma.meeting.create({
      data: {
        ...data,
        salesId: userId,
        date: new Date(data.date),
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : null,
      },
    });

    // Publish event
    await publishEvent('sales.events', {
      eventId: uuidv4(),
      eventType: 'meeting.created',
      timestamp: new Date().toISOString(),
      data: {
        meetingId: meeting.id,
        customerId: meeting.customerId,
        salesId: meeting.salesId,
        date: meeting.date,
      },
    });

    res.status(201).json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, salesId, startDate, endDate } = req.query;

    const where: any = {};
    if (customerId) where.customerId = customerId as string;
    if (salesId) where.salesId = salesId as string;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMeetingSchema.parse(req.body);

    const existing = await prisma.meeting.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
      },
    });

    // Publish event
    await publishEvent('sales.events', {
      eventId: uuidv4(),
      eventType: 'meeting.updated',
      timestamp: new Date().toISOString(),
      data: {
        meetingId: meeting.id,
        customerId: meeting.customerId,
      },
    });

    res.json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    await prisma.meeting.delete({ where: { id: req.params.id } });

    // Publish event
    await publishEvent('sales.events', {
      eventId: uuidv4(),
      eventType: 'meeting.deleted',
      timestamp: new Date().toISOString(),
      data: {
        meetingId: meeting.id,
        customerId: meeting.customerId,
      },
    });

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
