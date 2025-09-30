import express from 'express';
import { requireRole } from '../middleware/auth';
import {
  getAuditLogs,
  getAuditLog,
  getAuditStats,
  getEntityActivity,
  getUserActivity,
} from '../controllers/auditController';

const router = express.Router();

// All audit routes require ADMIN or COMPLIANCE role
router.use(requireRole(['ADMIN', 'COMPLIANCE']));

// Get all audit logs with filtering
router.get('/', getAuditLogs);

// Get audit statistics
router.get('/stats', getAuditStats);

// Get specific audit log
router.get('/:id', getAuditLog);

// Get activity for a specific entity
router.get('/entity/:entity/:entityId', getEntityActivity);

// Get user activity history
router.get('/user/:userId', getUserActivity);

export default router;