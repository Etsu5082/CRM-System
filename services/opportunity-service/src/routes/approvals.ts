import express from 'express';
import * as approvalController from '../controllers/approvalController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Authentication is handled by API Gateway, no need for duplicate auth here
// router.use(authenticate);

router.post('/', approvalController.createApproval);
router.get('/', approvalController.getApprovals);
router.get('/pending', approvalController.getPendingApprovals);
router.get('/requester/:userId', approvalController.getApprovalsByRequester);
router.get('/approver/:userId', approvalController.getApprovalsByApprover);
router.get('/:id', approvalController.getApproval);
router.put('/:id', approvalController.updateApproval);
router.patch('/:id/process', approvalController.processApproval);
router.patch('/:id/recall', approvalController.recallApproval);

export default router;
