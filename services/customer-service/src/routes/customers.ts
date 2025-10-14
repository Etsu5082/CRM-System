import express from 'express';
import * as customerController from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Authentication is handled by API Gateway, no need for duplicate auth here
// router.use(authenticate);

// Authorization is handled by API Gateway, no need for role checks here
router.post('/', customerController.createCustomer);
router.get('/', customerController.getCustomers);
router.get('/search', customerController.searchCustomers);
router.get('/:id', customerController.getCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router;
