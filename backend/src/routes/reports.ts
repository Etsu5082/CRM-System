import express from 'express';
import {
  getDashboardStats,
  getSalesMetrics,
  getTaskTrends,
  getApprovalStats,
  exportDataCSV,
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// Get dashboard statistics
router.get('/dashboard', getDashboardStats);

// Get sales performance metrics
router.get('/sales-metrics', getSalesMetrics);

// Get task completion trends
router.get('/task-trends', getTaskTrends);

// Get approval statistics
router.get('/approval-stats', getApprovalStats);

// Export data to CSV
router.get('/export/:type', exportDataCSV);

export default router;