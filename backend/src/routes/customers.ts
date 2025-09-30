import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * @route   GET /api/customers
 * @desc    顧客一覧取得
 * @access  Private (All authenticated users)
 */
router.get('/', getCustomers);

/**
 * @route   GET /api/customers/:id
 * @desc    顧客詳細取得
 * @access  Private
 */
router.get('/:id', getCustomer);

/**
 * @route   POST /api/customers
 * @desc    顧客作成
 * @access  Private (ADMIN, MANAGER, SALES)
 */
router.post('/', requireRole(['ADMIN', 'MANAGER', 'SALES']), createCustomer);

/**
 * @route   PUT /api/customers/:id
 * @desc    顧客更新
 * @access  Private (ADMIN, MANAGER, own SALES)
 */
router.put('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES']), updateCustomer);

/**
 * @route   DELETE /api/customers/:id
 * @desc    顧客削除
 * @access  Private (ADMIN only)
 */
router.delete('/:id', requireRole(['ADMIN']), deleteCustomer);

export default router;