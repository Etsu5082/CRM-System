import { Router } from 'express';
import {
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meetingController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * @route   GET /api/meetings
 * @desc    商談一覧取得
 * @access  Private (All authenticated users)
 */
router.get('/', getMeetings);

/**
 * @route   GET /api/meetings/:id
 * @desc    商談詳細取得
 * @access  Private
 */
router.get('/:id', getMeeting);

/**
 * @route   POST /api/meetings
 * @desc    商談作成
 * @access  Private (ADMIN, MANAGER, SALES)
 */
router.post('/', requireRole(['ADMIN', 'MANAGER', 'SALES']), createMeeting);

/**
 * @route   PUT /api/meetings/:id
 * @desc    商談更新
 * @access  Private (ADMIN, MANAGER, own SALES)
 */
router.put('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES']), updateMeeting);

/**
 * @route   DELETE /api/meetings/:id
 * @desc    商談削除
 * @access  Private (ADMIN, MANAGER, own SALES)
 */
router.delete('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES']), deleteMeeting);

export default router;