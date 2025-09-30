import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// バリデーションスキーマ
const createMeetingSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  date: z.string().datetime('Invalid date format'),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  nextAction: z.string().optional(),
  nextActionDate: z.string().datetime('Invalid date format').optional(),
});

const updateMeetingSchema = createMeetingSchema.partial().omit({ customerId: true });

/**
 * 商談一覧取得
 */
export async function getMeetings(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const customerId = req.query.customerId as string;

    const skip = (page - 1) * limit;

    // フィルタ条件
    const where: any = {};

    // 顧客IDでフィルタ
    if (customerId) {
      where.customerId = customerId;
    }

    // 権限による絞り込み
    if (req.user.role === 'SALES') {
      where.salesId = req.user.id;
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sales: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get meetings',
    });
  }
}

/**
 * 商談詳細取得
 */
export async function getMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            investmentProfile: true,
          },
        },
        sales: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Not Found', message: 'Meeting not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && meeting.salesId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get meeting',
    });
  }
}

/**
 * 商談作成
 */
export async function createMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // バリデーション
    const validatedData = createMeetingSchema.parse(req.body);

    // 顧客の存在確認
    const customer = await prisma.customer.findFirst({
      where: {
        id: validatedData.customerId,
        deletedAt: null,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && customer.assignedSalesId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    // 商談作成
    const meeting = await prisma.meeting.create({
      data: {
        ...validatedData,
        date: new Date(validatedData.date),
        nextActionDate: validatedData.nextActionDate
          ? new Date(validatedData.nextActionDate)
          : null,
        salesId: req.user.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sales: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 次回アクションがあればタスク自動生成
    if (validatedData.nextAction && validatedData.nextActionDate) {
      await prisma.task.create({
        data: {
          userId: req.user.id,
          customerId: validatedData.customerId,
          title: `次回アクション: ${customer.name}`,
          description: validatedData.nextAction,
          dueDate: new Date(validatedData.nextActionDate),
          status: 'TODO',
          priority: 'MEDIUM',
        },
      });
    }

    // 監査ログ記録
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        resourceType: 'Meeting',
        resourceId: meeting.id,
        changes: { new: meeting },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.issues[0].message,
        changes: error.issues,
      });
      return;
    }

    console.error('Create meeting error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create meeting',
    });
  }
}

/**
 * 商談更新
 */
export async function updateMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const existingMeeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!existingMeeting) {
      res.status(404).json({ error: 'Not Found', message: 'Meeting not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && existingMeeting.salesId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    // バリデーション
    const validatedData = updateMeetingSchema.parse(req.body);

    const updateData: any = { ...validatedData };
    if (validatedData.date) {
      updateData.date = new Date(validatedData.date);
    }
    if (validatedData.nextActionDate) {
      updateData.nextActionDate = new Date(validatedData.nextActionDate);
    }

    // 商談更新
    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sales: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 監査ログ記録
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        resourceType: 'Meeting',
        resourceId: meeting.id,
        changes: {
          old: existingMeeting,
          new: meeting,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      data: meeting,
      message: 'Meeting updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.issues[0].message,
        changes: error.issues,
      });
      return;
    }

    console.error('Update meeting error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update meeting',
    });
  }
}

/**
 * 商談削除
 */
export async function deleteMeeting(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Not Found', message: 'Meeting not found' });
      return;
    }

    // 権限チェック（自分の商談または管理者のみ削除可能）
    if (req.user.role === 'SALES' && meeting.salesId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    if (req.user.role === 'COMPLIANCE') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Compliance role cannot delete meetings',
      });
      return;
    }

    // 商談削除
    await prisma.meeting.delete({
      where: { id },
    });

    // 監査ログ記録
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        resourceType: 'Meeting',
        resourceId: id,
        changes: { deleted: meeting },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete meeting',
    });
  }
}