import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    通知一覧取得
 * @access  Private
 */
router.get('/', authenticate, getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    未読通知数取得
 * @access  Private
 */
router.get('/unread-count', authenticate, getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    通知を既読にする
 * @access  Private
 */
router.put('/:id/read', authenticate, markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    全て既読にする
 * @access  Private
 */
router.put('/read-all', authenticate, markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    通知削除
 * @access  Private
 */
router.delete('/:id', authenticate, deleteNotification);

export default router;
