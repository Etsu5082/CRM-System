'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/ui/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
};

type NotificationListResponse = {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filter === 'unread') {
        params.isRead = 'false';
      }

      const response = await apiClient.get<NotificationListResponse>('/api/notifications', { params });
      setNotifications(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, filter, page]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この通知を削除しますか?')) return;

    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL_REQUEST': return '📋';
      case 'APPROVAL_APPROVED': return '✅';
      case 'APPROVAL_REJECTED': return '❌';
      case 'TASK_ASSIGNED': return '📌';
      case 'TASK_DUE_SOON': return '⏰';
      case 'MEETING_REMINDER': return '📅';
      case 'SYSTEM': return 'ℹ️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'APPROVAL_REQUEST': return 'bg-blue-50 border-blue-200';
      case 'APPROVAL_APPROVED': return 'bg-green-50 border-green-200';
      case 'APPROVAL_REJECTED': return 'bg-red-50 border-red-200';
      case 'TASK_ASSIGNED': return 'bg-purple-50 border-purple-200';
      case 'TASK_DUE_SOON': return 'bg-yellow-50 border-yellow-200';
      case 'MEETING_REMINDER': return 'bg-indigo-50 border-indigo-200';
      case 'SYSTEM': return 'bg-gray-50 border-gray-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) {
    return <div>ロード中...</div>;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">通知</h2>
        <p className="text-gray-600 text-sm">承認リクエストやタスクの通知を確認できます</p>
      </div>

      {/* Filter and Actions */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter('all'); setPage(1); }}
          >
            すべて
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter('unread'); setPage(1); }}
          >
            未読 {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
          >
            すべて既読にする
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            読み込み中...
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            {filter === 'unread' ? '未読の通知はありません' : '通知はありません'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.isRead ? 'border-l-4 border-l-blue-500' : ''
              } ${getNotificationColor(notification.type)}`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>

                    <p className={`text-sm mb-3 ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {notification.link && (
                        <Link href={notification.link}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                          >
                            詳細を見る
                          </Button>
                        </Link>
                      )}

                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          既読にする
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(notification.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </Button>

          <span className="px-4 py-2 text-sm">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            次へ
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
