import express from 'express';
import * as reportController from '../controllers/reportController';
// Authentication is handled by API Gateway, no need for duplicate auth here

const router = express.Router();

// Remove duplicate authentication - API Gateway already handles this
// router.use(authenticate);

router.get('/sales-summary', reportController.getSalesSummary);
router.get('/customer-statistics', reportController.getCustomerStatistics);
router.get('/approval-statistics', reportController.getApprovalStatistics);
router.get('/task-completion', reportController.getTaskCompletion);

export default router;
