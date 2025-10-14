import express from 'express';
import * as customerController from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Authentication is handled by API Gateway, no need for duplicate auth here
// router.use(authenticate);

// Create customer (ADMIN, MANAGER, SALES)
router.post('/', authorize('ADMIN', 'MANAGER', 'SALES'), customerController.createCustomer);

// Get all customers (all authenticated users)
router.get('/', customerController.getCustomers);

// Search customers (all authenticated users)
router.get('/search', customerController.searchCustomers);

// Get single customer (all authenticated users)
router.get('/:id', customerController.getCustomer);

// Update customer (ADMIN, MANAGER, SALES)
router.put('/:id', authorize('ADMIN', 'MANAGER', 'SALES'), customerController.updateCustomer);

// Delete customer (ADMIN, MANAGER only)
router.delete('/:id', authorize('ADMIN', 'MANAGER'), customerController.deleteCustomer);

export default router;
