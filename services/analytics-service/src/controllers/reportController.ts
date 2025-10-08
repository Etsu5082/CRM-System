import { Response } from 'express';
import axios from 'axios';
import redis from '../config/redis';
import { AuthRequest } from '../types';

const CACHE_TTL = 300; // 5 minutes

export const getSalesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = 'report:sales-summary';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Fetch from multiple services
    const [customersRes, meetingsRes, tasksRes, approvalsRes] = await Promise.all([
      axios.get(`${process.env.CUSTOMER_SERVICE_URL}/customers`, {
        headers: { Authorization: req.headers.authorization },
      }),
      axios.get(`${process.env.SALES_ACTIVITY_SERVICE_URL}/meetings`, {
        headers: { Authorization: req.headers.authorization },
      }),
      axios.get(`${process.env.SALES_ACTIVITY_SERVICE_URL}/tasks`, {
        headers: { Authorization: req.headers.authorization },
      }),
      axios.get(`${process.env.OPPORTUNITY_SERVICE_URL}/approvals`, {
        headers: { Authorization: req.headers.authorization },
      }),
    ]);

    const report = {
      totalCustomers: customersRes.data.length,
      totalMeetings: meetingsRes.data.length,
      totalTasks: tasksRes.data.length,
      totalApprovals: approvalsRes.data.length,
      pendingApprovals: approvalsRes.data.filter((a: any) => a.status === 'PENDING').length,
      completedTasks: tasksRes.data.filter((t: any) => t.status === 'COMPLETED').length,
      generatedAt: new Date().toISOString(),
    };

    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(report));

    res.json(report);
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = 'report:customer-stats';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const customersRes = await axios.get(`${process.env.CUSTOMER_SERVICE_URL}/customers`, {
      headers: { Authorization: req.headers.authorization },
    });

    const customers = customersRes.data;

    const stats = {
      total: customers.length,
      byInvestmentProfile: {
        conservative: customers.filter((c: any) => c.investmentProfile === 'conservative').length,
        moderate: customers.filter((c: any) => c.investmentProfile === 'moderate').length,
        aggressive: customers.filter((c: any) => c.investmentProfile === 'aggressive').length,
      },
      averageRiskTolerance:
        customers.reduce((sum: number, c: any) => sum + (c.riskTolerance || 0), 0) / customers.length || 0,
      generatedAt: new Date().toISOString(),
    };

    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(stats));

    res.json(stats);
  } catch (error) {
    console.error('Get customer statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApprovalStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = 'report:approval-stats';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const approvalsRes = await axios.get(`${process.env.OPPORTUNITY_SERVICE_URL}/approvals`, {
      headers: { Authorization: req.headers.authorization },
    });

    const approvals = approvalsRes.data;

    const stats = {
      total: approvals.length,
      pending: approvals.filter((a: any) => a.status === 'PENDING').length,
      approved: approvals.filter((a: any) => a.status === 'APPROVED').length,
      rejected: approvals.filter((a: any) => a.status === 'REJECTED').length,
      recalled: approvals.filter((a: any) => a.status === 'RECALLED').length,
      totalAmount: approvals.reduce((sum: number, a: any) => sum + a.amount, 0),
      averageAmount: approvals.length > 0 ? approvals.reduce((sum: number, a: any) => sum + a.amount, 0) / approvals.length : 0,
      generatedAt: new Date().toISOString(),
    };

    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(stats));

    res.json(stats);
  } catch (error) {
    console.error('Get approval statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTaskCompletion = async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = 'report:task-completion';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const tasksRes = await axios.get(`${process.env.SALES_ACTIVITY_SERVICE_URL}/tasks`, {
      headers: { Authorization: req.headers.authorization },
    });

    const tasks = tasksRes.data;

    const stats = {
      total: tasks.length,
      byStatus: {
        todo: tasks.filter((t: any) => t.status === 'TODO').length,
        inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter((t: any) => t.status === 'COMPLETED').length,
        cancelled: tasks.filter((t: any) => t.status === 'CANCELLED').length,
      },
      byPriority: {
        low: tasks.filter((t: any) => t.priority === 'LOW').length,
        medium: tasks.filter((t: any) => t.priority === 'MEDIUM').length,
        high: tasks.filter((t: any) => t.priority === 'HIGH').length,
        urgent: tasks.filter((t: any) => t.priority === 'URGENT').length,
      },
      completionRate: tasks.length > 0 ? (tasks.filter((t: any) => t.status === 'COMPLETED').length / tasks.length) * 100 : 0,
      generatedAt: new Date().toISOString(),
    };

    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(stats));

    res.json(stats);
  } catch (error) {
    console.error('Get task completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
