import express from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', authController.createUser);
router.post('/login', authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

// Admin only routes
router.post('/users', authenticate, authorize('ADMIN'), authController.createUser);
router.get('/users', authenticate, authorize('ADMIN', 'MANAGER'), authController.getUsers);
router.get('/users/:id', authenticate, authorize('ADMIN', 'MANAGER'), authController.getUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), authController.updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), authController.deleteUser);
router.get('/audit-logs', authenticate, authorize('ADMIN', 'COMPLIANCE'), authController.getAuditLogs);

export default router;
