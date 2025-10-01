import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// バリデーションスキーマ
const createTaskSchema = z.object({
  customerId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().optional(),
  dueDate: z.string().datetime('Invalid date format'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

/**
 * タスク一覧取得
 */
export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const customerId = req.query.customerId as string;

    const skip = (page - 1) * limit;

    // フィルタ条件
    const where: any = {};

    // 権限による絞り込み
    if (req.user.role === 'SALES') {
      where.userId = req.user.id;
    } else if (req.user.role === 'MANAGER') {
      // MANAGERはチームのタスクを表示（将来実装）
      where.userId = req.user.id;
    }

    // ステータスフィルタ
    if (status) {
      where.status = status;
    }

    // 顧客フィルタ
    if (customerId) {
      where.customerId = customerId;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get tasks',
    });
  }
}

/**
 * 期限切れタスク取得
 */
export async function getOverdueTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const where: any = {
      dueDate: { lt: new Date() },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    // 権限による絞り込み
    if (req.user.role === 'SALES') {
      where.userId = req.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get overdue tasks',
    });
  }
}

/**
 * タスク詳細取得
 */
export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Not Found', message: 'Task not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && task.userId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get task',
    });
  }
}

/**
 * タスク作成
 */
export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // バリデーション
    const validatedData = createTaskSchema.parse(req.body);

    // 顧客の存在確認（顧客紐付けがある場合）
    if (validatedData.customerId) {
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
    }

    // タスク作成
    const task = await prisma.task.create({
      data: {
        ...validatedData,
        dueDate: new Date(validatedData.dueDate),
        userId: req.user.id,
        status: 'TODO',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
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
        action: 'CREATE',
        resourceType: 'Task',
        resourceId: task.id,
        changes: { new: task },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
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

    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create task',
    });
  }
}

/**
 * タスク更新
 */
export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Not Found', message: 'Task not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && existingTask.userId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    // バリデーション
    const validatedData = updateTaskSchema.parse(req.body);

    const updateData: any = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    // タスク更新
    const task = await prisma.task.update({
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
        user: {
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
        resourceType: 'Task',
        resourceId: task.id,
        changes: {
          old: existingTask,
          new: task,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task updated successfully',
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

    console.error('Update task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update task',
    });
  }
}

/**
 * タスク完了
 */
export async function completeTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Not Found', message: 'Task not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && existingTask.userId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    // タスク完了
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
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
        resourceType: 'Task',
        resourceId: task.id,
        changes: {
          old: existingTask,
          new: task,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task completed successfully',
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete task',
    });
  }
}

/**
 * タスク削除
 */
export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({ error: 'Not Found', message: 'Task not found' });
      return;
    }

    // 権限チェック
    if (req.user.role === 'SALES' && task.userId !== req.user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    if (req.user.role === 'COMPLIANCE') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Compliance role cannot delete tasks',
      });
      return;
    }

    // タスク削除
    await prisma.task.delete({
      where: { id },
    });

    // 監査ログ記録
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        resourceType: 'Task',
        resourceId: id,
        changes: { deleted: task },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete task',
    });
  }
}

/**
 * 期限間近のタスク取得（今日から3日以内）
 */
export async function getUpcomingTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    // クエリ条件
    const where: any = {
      dueDate: {
        gte: today,
        lte: threeDaysFromNow,
      },
      status: {
        not: 'COMPLETED',
      },
    };

    // SALES roleの場合は自分のタスクのみ
    if (req.user.role === 'SALES') {
      where.userId = req.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        dueDate: 'asc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get upcoming tasks',
    });
  }
}