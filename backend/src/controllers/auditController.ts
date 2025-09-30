import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

// Get audit logs with pagination and filtering
export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Only ADMIN and COMPLIANCE can view audit logs
    if (!['ADMIN', 'COMPLIANCE'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Forbidden: Only admins and compliance can view audit logs' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Filters
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const resourceType = req.query.resourceType as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

// Get audit log by ID
export async function getAuditLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Only ADMIN and COMPLIANCE can view audit logs
    if (!['ADMIN', 'COMPLIANCE'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Forbidden: Only admins and compliance can view audit logs' });
      return;
    }

    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
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

    if (!log) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }

    res.json({ data: log });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
}

// Get audit statistics
export async function getAuditStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Only ADMIN and COMPLIANCE can view audit stats
    if (!['ADMIN', 'COMPLIANCE'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Forbidden: Only admins and compliance can view audit statistics' });
      return;
    }

    // Get date range (default: last 30 days)
    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date(new Date().setDate(endDate.getDate() - days));

    // Get logs in date range
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        action: true,
        resourceType: true,
        userId: true,
        timestamp: true,
      },
    });

    // Group by action
    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by resourceType
    const byResourceType = logs.reduce((acc, log) => {
      acc[log.resourceType] = (acc[log.resourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by user
    const byUser = logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get user details for top users
    const topUserIds = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    const users = await prisma.user.findMany({
      where: {
        id: { in: topUserIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const topUsers = topUserIds.map((userId) => {
      const user = users.find((u) => u.id === userId);
      return {
        userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        userRole: user?.role || '',
        count: byUser[userId],
      };
    });

    // Group by date
    const byDate = logs.reduce((acc, log) => {
      const date = log.timestamp.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing dates
    const dateMap = new Map<string, number>();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dateMap.set(dateKey, byDate[dateKey] || 0);
    }

    const activityByDate = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    res.json({
      data: {
        total: logs.length,
        byAction: Object.entries(byAction).map(([action, count]) => ({ action, count })),
        byResourceType: Object.entries(byResourceType).map(([resourceType, count]) => ({ resourceType, count })),
        topUsers,
        activityByDate,
      },
      dateRange: {
        startDate,
        endDate,
        days,
      },
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
}

// Get recent activity for a specific entity
export async function getEntityActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { resourceType, resourceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const logs = await prisma.auditLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
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

    res.json({ data: logs });
  } catch (error) {
    console.error('Get entity activity error:', error);
    res.status(500).json({ error: 'Failed to fetch entity activity' });
  }
}

// Get user activity history
export async function getUserActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Only ADMIN and COMPLIANCE can view other users' activity
    const targetUserId = req.params.userId;
    if (
      targetUserId !== req.user!.id &&
      !['ADMIN', 'COMPLIANCE'].includes(req.user!.role)
    ) {
      res.status(403).json({ error: 'Forbidden: Cannot view other users\' activity' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          userId: targetUserId,
        },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({
        where: {
          userId: targetUserId,
        },
      }),
    ]);

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
}