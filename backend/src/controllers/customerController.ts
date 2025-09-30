import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// バリデーションスキーマ
const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  address: z.string().optional(),
  investmentProfile: z.enum(['conservative', 'moderate', 'aggressive']),
  riskTolerance: z.number().min(1).max(10),
  investmentExperience: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

/**
 * 顧客一覧取得
 */
export async function getCustomers(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // クエリパラメータ
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const investmentProfile = req.query.investmentProfile as string;

    const skip = (page - 1) * limit;

    // フィルタ条件
    const where: any = {
      deletedAt: null,
    };

    // 権限による絞り込み
    if (req.user.role === 'SALES') {
      where.assignedSalesId = req.user.id;
    }

    // 検索条件
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (investmentProfile) {
      where.investmentProfile = investmentProfile;
    }

    // データ取得
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedSales: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get customers',
    });
  }
}

/**
 * 顧客詳細取得
 */
export async function getCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        assignedSales: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        meetings: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
          where: { status: { not: 'COMPLETED' } },
          take: 10,
        },
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

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get customer',
    });
  }
}

/**
 * 顧客作成
 */
export async function createCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // バリデーション
    const validatedData = createCustomerSchema.parse(req.body);

    // メールアドレスの重複チェック
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: validatedData.email,
        deletedAt: null,
      },
    });

    if (existingCustomer) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already exists',
      });
      return;
    }

    // 顧客作成
    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        assignedSalesId: req.user.id,
      },
      include: {
        assignedSales: {
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
        resourceType: 'Customer',
        resourceId: customer.id,
        changes: { new: customer },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
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

    console.error('Create customer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create customer',
    });
  }
}

/**
 * 顧客更新
 */
export async function updateCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // 既存の顧客を取得
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingCustomer) {
      res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      return;
    }

    // 権限チェック
    if (
      req.user.role === 'SALES' &&
      existingCustomer.assignedSalesId !== req.user.id
    ) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    // バリデーション
    const validatedData = updateCustomerSchema.parse(req.body);

    // メールアドレスの重複チェック（変更時のみ）
    if (validatedData.email && validatedData.email !== existingCustomer.email) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          email: validatedData.email,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (duplicateCustomer) {
        res.status(409).json({
          error: 'Conflict',
          message: 'Email already exists',
        });
        return;
      }
    }

    // 顧客更新
    const customer = await prisma.customer.update({
      where: { id },
      data: validatedData,
      include: {
        assignedSales: {
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
        resourceType: 'Customer',
        resourceId: customer.id,
        changes: {
          old: existingCustomer,
          new: customer,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
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

    console.error('Update customer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update customer',
    });
  }
}

/**
 * 顧客削除（論理削除）
 */
export async function deleteCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // ADMIN以外は削除不可
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can delete customers',
      });
      return;
    }

    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      return;
    }

    // 論理削除
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 監査ログ記録
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        resourceType: 'Customer',
        resourceId: id,
        changes: { deleted: customer },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete customer',
    });
  }
}