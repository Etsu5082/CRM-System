import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getApprovals,
  getApproval,
  createApproval,
  updateApproval,
  deleteApproval,
} from '../controllers/approvalController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all approval requests
router.get('/', getApprovals);

// Get single approval request
router.get('/:id', getApproval);

// Create approval request (SALES only)
router.post('/', requireRole(['SALES']), createApproval);

// Update approval request (MANAGER, COMPLIANCE)
router.put('/:id', requireRole(['MANAGER', 'COMPLIANCE']), updateApproval);

// Delete approval request
router.delete('/:id', deleteApproval);

export default router;