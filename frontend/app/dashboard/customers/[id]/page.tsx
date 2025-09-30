'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/axios';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  investmentProfile: string;
  riskTolerance: number;
  investmentExperience?: string;
  assignedSales: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

type Meeting = {
  id: string;
  date: string;
  summary: string;
  nextAction?: string;
  nextActionDate?: string;
  sales: {
    id: string;
    name: string;
  };
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  priority: string;
  completedAt?: string;
  createdAt: string;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && customerId) {
      fetchCustomerData();
    }
  }, [user, customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [customerRes, meetingsRes, tasksRes] = await Promise.all([
        apiClient.get(`/api/customers/${customerId}`),
        apiClient.get('/api/meetings', { params: { customerId, limit: 10 } }),
        apiClient.get('/api/tasks', { params: { customerId, limit: 10 } }),
      ]);

      setCustomer(customerRes.data.data);
      setMeetings(meetingsRes.data.data);
      setTasks(tasksRes.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || '顧客情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getProfileLabel = (profile: string) => {
    const labels: Record<string, string> = {
      conservative: '保守的',
      moderate: '中庸',
      aggressive: '積極的',
    };
    return labels[profile] || profile;
  };

  const getProfileBadgeVariant = (profile: string) => {
    switch (profile) {
      case 'conservative':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'aggressive':
        return 'danger';
      default:
        return 'default';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || '顧客が見つかりません'}
          </div>
          <div className="mt-4">
            <Link href="/dashboard/customers" className="text-blue-600 hover:text-blue-800">
              ← 顧客一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/customers" className="text-blue-600 hover:text-blue-800">
            ← 顧客一覧に戻る
          </Link>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-600 mt-1">{customer.email}</p>
            </div>
            <Badge variant={getProfileBadgeVariant(customer.investmentProfile)}>
              {getProfileLabel(customer.investmentProfile)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-500">電話番号</p>
              <p className="text-gray-900">{customer.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">住所</p>
              <p className="text-gray-900">{customer.address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">リスク許容度</p>
              <p className="text-gray-900">{customer.riskTolerance} / 10</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">投資経験</p>
              <p className="text-gray-900">{customer.investmentExperience || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">担当営業</p>
              <p className="text-gray-900">{customer.assignedSales.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">登録日</p>
              <p className="text-gray-900">{formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">商談履歴</h2>
              <Link
                href={`/dashboard/meetings/new?customerId=${customerId}`}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
              >
                商談を記録
              </Link>
            </div>

            {meetings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">商談履歴がありません</p>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-gray-900">{formatDate(meeting.date)}</p>
                      <p className="text-sm text-gray-500">{meeting.sales.name}</p>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{meeting.summary}</p>
                    {meeting.nextAction && (
                      <div className="bg-yellow-50 p-2 rounded text-sm">
                        <p className="font-semibold text-gray-700">次回アクション:</p>
                        <p className="text-gray-600">{meeting.nextAction}</p>
                        {meeting.nextActionDate && (
                          <p className="text-gray-500 text-xs mt-1">
                            予定日: {formatDate(meeting.nextActionDate)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">タスク</h2>
            </div>

            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">タスクがありません</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{task.title}</h3>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>期限: {formatDate(task.dueDate)}</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}