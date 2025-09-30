import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

// Get dashboard statistics
export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Filter based on role
    const customerFilter: any = {};
    const meetingFilter: any = {};
    const taskFilter: any = {};
    const approvalFilter: any = {};

    if (userRole === 'SALES') {
      customerFilter.assignedSalesId = userId;
      meetingFilter.salesId = userId;
      taskFilter.userId = userId;
      approvalFilter.requesterId = userId;
    }

    // Get counts
    const [
      totalCustomers,
      totalMeetings,
      totalTasks,
      completedTasks,
      overdueTasks,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals,
    ] = await Promise.all([
      prisma.customer.count({ where: customerFilter }),
      prisma.meeting.count({ where: meetingFilter }),
      prisma.task.count({ where: taskFilter }),
      prisma.task.count({
        where: {
          ...taskFilter,
          status: 'COMPLETED'
        }
      }),
      prisma.task.count({
        where: {
          ...taskFilter,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      }),
      prisma.approvalRequest.count({
        where: {
          ...approvalFilter,
          status: 'PENDING'
        }
      }),
      prisma.approvalRequest.count({
        where: {
          ...approvalFilter,
          status: 'APPROVED'
        }
      }),
      prisma.approvalRequest.count({
        where: {
          ...approvalFilter,
          status: 'REJECTED'
        }
      }),
    ]);

    res.json({
      data: {
        customers: {
          total: totalCustomers,
        },
        meetings: {
          total: totalMeetings,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: totalTasks - completedTasks,
          overdue: overdueTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        approvals: {
          total: pendingApprovals + approvedApprovals + rejectedApprovals,
          pending: pendingApprovals,
          approved: approvedApprovals,
          rejected: rejectedApprovals,
          approvalRate: (approvedApprovals + rejectedApprovals) > 0
            ? Math.round((approvedApprovals / (approvedApprovals + rejectedApprovals)) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
}

// Get sales performance metrics
export async function getSalesMetrics(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Parse date range from query
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // Filter based on role
    const meetingFilter: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userRole === 'SALES') {
      meetingFilter.salesId = userId;
    }

    // Get meetings by sales person
    const meetingsBySales = await prisma.meeting.groupBy({
      by: ['salesId'],
      where: meetingFilter,
      _count: {
        id: true,
      },
    });

    // Get sales person details
    const salesIds = meetingsBySales.map(m => m.salesId);
    const salesUsers = await prisma.user.findMany({
      where: {
        id: { in: salesIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Combine data
    const metrics = meetingsBySales.map(m => {
      const sales = salesUsers.find(s => s.id === m.salesId);
      return {
        salesId: m.salesId,
        salesName: sales?.name || 'Unknown',
        salesEmail: sales?.email || '',
        meetingCount: m._count.id,
      };
    }).sort((a, b) => b.meetingCount - a.meetingCount);

    res.json({
      data: metrics,
      dateRange: {
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Get sales metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch sales metrics' });
  }
}

// Get task completion trends
export async function getTaskTrends(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Parse date range from query (default: last 30 days)
    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date(new Date().setDate(endDate.getDate() - days));

    // Filter based on role
    const taskFilter: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userRole === 'SALES') {
      taskFilter.userId = userId;
    }

    // Get tasks grouped by date
    const tasks = await prisma.task.findMany({
      where: taskFilter,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, { created: number; completed: number }>();

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dateMap.set(dateKey, { created: 0, completed: 0 });
    }

    // Count tasks by date
    tasks.forEach(task => {
      const createdDate = task.createdAt.toISOString().split('T')[0];
      if (dateMap.has(createdDate)) {
        const entry = dateMap.get(createdDate)!;
        entry.created++;
      }

      if (task.completedAt) {
        const completedDate = task.completedAt.toISOString().split('T')[0];
        if (dateMap.has(completedDate)) {
          const entry = dateMap.get(completedDate)!;
          entry.completed++;
        }
      }
    });

    // Convert to array
    const trends = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      created: counts.created,
      completed: counts.completed,
    }));

    res.json({
      data: trends,
      dateRange: {
        startDate,
        endDate,
        days,
      },
    });
  } catch (error) {
    console.error('Get task trends error:', error);
    res.status(500).json({ error: 'Failed to fetch task trends' });
  }
}

// Get approval statistics
export async function getApprovalStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Filter based on role
    const approvalFilter: any = {};

    if (userRole === 'SALES') {
      approvalFilter.requesterId = userId;
    }

    // Get approval statistics by status
    const approvalsByStatus = await prisma.approvalRequest.groupBy({
      by: ['status'],
      where: approvalFilter,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    // Get recent approvals
    const recentApprovals = await prisma.approvalRequest.findMany({
      where: approvalFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        productName: true,
        amount: true,
        status: true,
        createdAt: true,
        processedAt: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      data: {
        byStatus: approvalsByStatus.map(a => ({
          status: a.status,
          count: a._count.id,
          totalAmount: a._sum.amount || 0,
        })),
        recent: recentApprovals,
      },
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ error: 'Failed to fetch approval statistics' });
  }
}

// Export data to CSV
export async function exportDataCSV(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { type } = req.params; // customers, meetings, tasks, approvals
    const userId = req.user.id;
    const userRole = req.user.role;

    let data: any[] = [];
    let headers: string[] = [];

    switch (type) {
      case 'customers':
        const customerFilter: any = userRole === 'SALES' ? { assignedSalesId: userId } : {};
        const customers = await prisma.customer.findMany({
          where: customerFilter,
          include: {
            assignedSales: {
              select: { name: true },
            },
          },
        });
        headers = ['ID', '名前', 'メール', '電話', '住所', '投資プロファイル', 'リスク許容度', '投資経験', '担当営業', '作成日'];
        data = customers.map(c => [
          c.id,
          c.name,
          c.email,
          c.phone || '',
          c.address || '',
          c.investmentProfile || '',
          c.riskTolerance || '',
          c.investmentExperience || '',
          c.assignedSales?.name || '',
          c.createdAt.toISOString(),
        ]);
        break;

      case 'meetings':
        const meetingFilter: any = userRole === 'SALES' ? { salesId: userId } : {};
        const meetings = await prisma.meeting.findMany({
          where: meetingFilter,
          include: {
            customer: { select: { name: true } },
            sales: { select: { name: true } },
          },
        });
        headers = ['ID', '顧客名', '担当営業', '日付', '要約', '次回アクション', '次回アクション日', '作成日'];
        data = meetings.map(m => [
          m.id,
          m.customer.name,
          m.sales.name,
          m.date.toISOString(),
          m.summary,
          m.nextAction || '',
          m.nextActionDate?.toISOString() || '',
          m.createdAt.toISOString(),
        ]);
        break;

      case 'tasks':
        const taskFilter: any = userRole === 'SALES' ? { userId } : {};
        const tasks = await prisma.task.findMany({
          where: taskFilter,
          include: {
            user: { select: { name: true } },
            customer: { select: { name: true } },
          },
        });
        headers = ['ID', 'タイトル', '説明', 'ステータス', '優先度', '期限', '担当者', '顧客名', '完了日', '作成日'];
        data = tasks.map(t => [
          t.id,
          t.title,
          t.description || '',
          t.status,
          t.priority,
          t.dueDate?.toISOString() || '',
          t.user.name,
          t.customer?.name || '',
          t.completedAt?.toISOString() || '',
          t.createdAt.toISOString(),
        ]);
        break;

      case 'approvals':
        const approvalFilter: any = userRole === 'SALES' ? { requesterId: userId } : {};
        const approvals = await prisma.approvalRequest.findMany({
          where: approvalFilter,
          include: {
            customer: { select: { name: true } },
            requester: { select: { name: true } },
            approver: { select: { name: true } },
          },
        });
        headers = ['ID', '顧客名', '商品名', '金額', 'ステータス', '申請者', '承認者', 'コメント', '申請日', '処理日'];
        data = approvals.map(a => [
          a.id,
          a.customer.name,
          a.productName,
          a.amount,
          a.status,
          a.requester.name,
          a.approver?.name || '',
          a.comment || '',
          a.createdAt.toISOString(),
          a.processedAt?.toISOString() || '',
        ]);
        break;

      default:
        res.status(400).json({ error: 'Invalid export type' });
        return;
    }

    // Create CSV content
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const csvRow = row.map((field: any) => {
        // Escape fields containing commas or quotes
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(csvRow.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_${new Date().toISOString().split('T')[0]}.csv"`);

    // Add BOM for Excel compatibility with Japanese characters
    res.write('\uFEFF');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
}