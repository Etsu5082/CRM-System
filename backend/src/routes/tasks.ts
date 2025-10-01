import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getOverdueTasks,
  getUpcomingTasks,
} from '../controllers/taskController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * @route   GET /api/tasks
 * @desc    タスク一覧取得
 * @access  Private (All authenticated users)
 */
router.get('/', getTasks);

/**
 * @route   GET /api/tasks/overdue
 * @desc    期限切れタスク取得
 * @access  Private
 */
router.get('/overdue', getOverdueTasks);

/**
 * @route   GET /api/tasks/upcoming
 * @desc    期限間近のタスク取得（3日以内）
 * @access  Private
 */
router.get('/upcoming', getUpcomingTasks);

/**
 * @route   GET /api/tasks/:id
 * @desc    タスク詳細取得
 * @access  Private
 */
router.get('/:id', getTask);

/**
 * @route   POST /api/tasks
 * @desc    タスク作成
 * @access  Private (ADMIN, MANAGER, SALES)
 */
router.post('/', requireRole(['ADMIN', 'MANAGER', 'SALES']), createTask);

/**
 * @route   PUT /api/tasks/:id
 * @desc    タスク更新
 * @access  Private (ADMIN, MANAGER, own SALES)
 */
router.put('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES']), updateTask);

/**
 * @route   PUT/PATCH /api/tasks/:id/complete
 * @desc    タスク完了
 * @access  Private (ADMIN, MANAGER, own SALES)
 */
router.put('/:id/complete', requireRole(['ADMIN', 'MANAGER', 'SALES']), completeTask);
router.patch('/:id/complete', requireRole(['ADMIN', 'MANAGER', 'SALES']), completeTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    タスク削除
 * @access  Private (ADMIN, MANAGER, own SALES)
 */
router.delete('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES']), deleteTask);

export default router;