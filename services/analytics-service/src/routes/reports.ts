import express from 'express';
import * as reportController from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/sales-summary', reportController.getSalesSummary);
router.get('/customer-statistics', reportController.getCustomerStatistics);
router.get('/approval-statistics', reportController.getApprovalStatistics);
router.get('/task-completion', reportController.getTaskCompletion);

export default router;
