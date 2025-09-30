import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import { z } from 'zod';

// Validation schemas
const createApprovalSchema = z.object({
  customerId: z.string().cuid(),
  productName: z.string().min(1),
  amount: z.number().positive(),
  comment: z.string().optional(),
});

const updateApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

// Get all approval requests with pagination
export async function getApprovals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by status if provided
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    // Role-based filtering
    if (req.user!.role === 'SALES') {
      // Sales can only see their own requests
      where.requesterId = req.user!.id;
    } else if (req.user!.role === 'MANAGER') {
      // Managers can see all requests
    } else if (req.user!.role === 'COMPLIANCE') {
      // Compliance can see all requests
    }

    const [approvals, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    res.json({
      data: approvals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
}

// Get single approval request
export async function getApproval(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            investmentProfile: true,
            riskTolerance: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!approval) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    // Check permissions
    if (
      req.user!.role === 'SALES' &&
      approval.requesterId !== req.user!.id
    ) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ data: approval });
  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({ error: 'Failed to fetch approval request' });
  }
}

// Create approval request
export async function createApproval(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Only SALES can create approval requests
    if (req.user!.role !== 'SALES') {
      res.status(403).json({ error: 'Only sales staff can create approval requests' });
      return;
    }

    const validatedData = createApprovalSchema.parse(req.body);

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Create approval request
    const approval = await prisma.approvalRequest.create({
      data: {
        customerId: validatedData.customerId,
        requesterId: req.user!.id,
        productName: validatedData.productName,
        amount: validatedData.amount,
        comment: validatedData.comment,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        resourceType: 'ApprovalRequest',
        resourceId: approval.id,
        changes: `Created approval request for ${customer.name} - ${validatedData.productName}`,
      },
    });

    res.status(201).json({ data: approval });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    console.error('Create approval error:', error);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
}

// Update approval request (approve/reject)
export async function updateApproval(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Only MANAGER and COMPLIANCE can approve/reject
    if (!['MANAGER', 'COMPLIANCE'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Only managers and compliance can review approval requests' });
      return;
    }

    const validatedData = updateApprovalSchema.parse(req.body);

    // Check if approval request exists
    const existingApproval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!existingApproval) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    // Check if already reviewed
    if (existingApproval.status !== 'PENDING') {
      res.status(400).json({ error: 'Approval request already reviewed' });
      return;
    }

    // Update approval request
    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: validatedData.status,
        approverId: req.user!.id,
        processedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        resourceType: 'ApprovalRequest',
        resourceId: approval.id,
        changes: `${validatedData.status} approval request for ${existingApproval.customer.name} - ${existingApproval.productName}`,
      },
    });

    res.json({ data: approval });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    console.error('Update approval error:', error);
    res.status(500).json({ error: 'Failed to update approval request' });
  }
}

// Delete approval request (only pending ones)
export async function deleteApproval(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    // Only requester can delete their own pending requests
    if (approval.requesterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Can only delete pending requests
    if (approval.status !== 'PENDING') {
      res.status(400).json({ error: 'Cannot delete reviewed approval request' });
      return;
    }

    await prisma.approvalRequest.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        resourceType: 'ApprovalRequest',
        resourceId: id,
        changes: `Deleted approval request`,
      },
    });

    res.json({ message: 'Approval request deleted' });
  } catch (error) {
    console.error('Delete approval error:', error);
    res.status(500).json({ error: 'Failed to delete approval request' });
  }
}