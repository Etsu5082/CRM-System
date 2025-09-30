'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/axios';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  priority: string;
  completedAt?: string;
  customer?: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
  createdAt: string;
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchTasks = async (page = 1, filterType = filter) => {
    try {
      setLoading(true);
      const endpoint = filterType === 'overdue' ? '/api/tasks/overdue' : '/api/tasks';
      const response = await apiClient.get(endpoint, {
        params: filterType === 'overdue' ? {} : { page, limit: 10 },
      });

      if (filterType === 'overdue') {
        setTasks(response.data.data);
        setPagination({ page: 1, limit: 10, total: response.data.data.length, totalPages: 1 });
      } else {
        setTasks(response.data.data);
        setPagination(response.data.pagination);
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'タスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, filter]);

  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await apiClient.patch(`/api/tasks/${taskId}/complete`);
      fetchTasks(pagination.page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'タスクの完了に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      TODO: '未着手',
      IN_PROGRESS: '進行中',
      COMPLETED: '完了',
      CANCELLED: 'キャンセル',
    };
    return labels[status] || status;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'CANCELLED':
        return 'default';
      default:
        return 'danger';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: '低',
      MEDIUM: '中',
      HIGH: '高',
      URGENT: '緊急',
    };
    return labels[priority] || priority;
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'default';
      default:
        return 'success';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') return false;
    return new Date(dueDate) < new Date();
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">タスク管理</h1>
            <p className="text-gray-600 mt-1">タスクとリマインダーを管理します</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/tasks/calendar')}
            >
              カレンダー表示
            </Button>
            <Button
              onClick={() => router.push('/dashboard/tasks/new')}
            >
              タスクを作成
            </Button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'overdue'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            期限切れ
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {filter === 'overdue' ? '期限切れのタスクはありません' : 'タスクがありません'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        {isOverdue(task.dueDate, task.status) && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                            期限切れ
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>期限: {formatDate(task.dueDate)}</span>
                        <span>担当: {task.user.name}</span>
                        {task.customer && (
                          <Link
                            href={`/dashboard/customers/${task.customer.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {task.customer.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                      >
                        編集
                      </Button>
                      {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          完了
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {filter === 'all' && pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                前へ
              </button>
              <span className="px-4 py-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 transition"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}