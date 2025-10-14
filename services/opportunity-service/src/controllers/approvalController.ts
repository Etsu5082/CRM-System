import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { publishEvent } from '../config/kafka';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const createApprovalSchema = z.object({
  customerId: z.string(),
  productName: z.string().min(1),
  amount: z.number().positive(),
  comment: z.string().optional(),
});

const processApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

export const createApproval = async (req: AuthRequest, res: Response) => {
  try {
    const data = createApprovalSchema.parse(req.body);

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

    const approval = await prisma.approvalRequest.create({
      data: {
        ...data,
        requesterId: userId,
      },
    });

    // Publish event
    await publishEvent('approval.events', {
      eventId: uuidv4(),
      eventType: 'approval.requested',
      timestamp: new Date().toISOString(),
      data: {
        approvalId: approval.id,
        requesterId: approval.requesterId,
        customerId: approval.customerId,
        productName: approval.productName,
        amount: approval.amount,
      },
    });

    res.status(201).json(approval);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Create approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const { status, requesterId, approverId, customerId } = req.query;

    const where: any = {};
    if (status) where.status = status as string;
    if (requesterId) where.requesterId = requesterId as string;
    if (approverId) where.approverId = approverId as string;
    if (customerId) where.customerId = customerId as string;

    const approvals = await prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(approvals);
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApproval = async (req: AuthRequest, res: Response) => {
  try {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    res.json(approval);
  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { productName, amount, comment } = req.body;

    const existing = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot update processed approval' });
    }

    const approval = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: { productName, amount, comment },
    });

    res.json(approval);
  } catch (error) {
    console.error('Update approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const processApproval = async (req: AuthRequest, res: Response) => {
  try {
    const data = processApprovalSchema.parse(req.body);

    const existing = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Approval already processed' });
    }

    // Get userId from header (set by API Gateway) or from req.user (for backward compatibility)
    const userId = req.headers['x-user-id'] as string || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const approval = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        comment: data.comment,
        approverId: userId,
        processedAt: new Date(),
      },
    });

    // Publish event
    const eventType = data.status === 'APPROVED' ? 'approval.approved' : 'approval.rejected';
    await publishEvent('approval.events', {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      data: {
        approvalId: approval.id,
        requesterId: approval.requesterId,
        approverId: approval.approverId,
        customerId: approval.customerId,
        status: approval.status,
        amount: approval.amount,
      },
    });

    res.json(approval);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Process approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const recallApproval = async (req: AuthRequest, res: Response) => {
  try {
    // Get userId from header (set by API Gateway) or from req.user (for backward compatibility)
    const userId = req.headers['x-user-id'] as string || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (existing.requesterId !== userId) {
      return res.status(403).json({ error: 'Not authorized to recall this approval' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only recall pending approvals' });
    }

    const approval = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: { status: 'RECALLED' },
    });

    // Publish event
    await publishEvent('approval.events', {
      eventId: uuidv4(),
      eventType: 'approval.recalled',
      timestamp: new Date().toISOString(),
      data: {
        approvalId: approval.id,
        requesterId: approval.requesterId,
        customerId: approval.customerId,
      },
    });

    res.json(approval);
  } catch (error) {
    console.error('Recall approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    res.json(approvals);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApprovalsByRequester = async (req: AuthRequest, res: Response) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { requesterId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(approvals);
  } catch (error) {
    console.error('Get approvals by requester error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApprovalsByApprover = async (req: AuthRequest, res: Response) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { approverId: req.params.userId },
      orderBy: { processedAt: 'desc' },
    });

    res.json(approvals);
  } catch (error) {
    console.error('Get approvals by approver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
