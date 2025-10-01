'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/ui/layout';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/axios';

type DashboardStats = {
  totalCustomers: number;
  totalMeetings: number;
  totalTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
};

type Task = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  customer?: {
    name: string;
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [customersRes, meetingsRes, tasksRes, overdueRes, upcomingRes] = await Promise.all([
          apiClient.get('/api/customers', { params: { limit: 1 } }),
          apiClient.get('/api/meetings', { params: { limit: 1 } }),
          apiClient.get('/api/tasks', { params: { limit: 1 } }),
          apiClient.get('/api/tasks/overdue'),
          apiClient.get('/api/tasks/upcoming'),
        ]);

        setStats({
          totalCustomers: customersRes.data.pagination.total,
          totalMeetings: meetingsRes.data.pagination.total,
          totalTasks: tasksRes.data.pagination.total,
          overdueTasks: overdueRes.data.data.length,
          upcomingTasks: upcomingRes.data.data.length,
        });
        setUpcomingTasks(upcomingRes.data.data.slice(0, 5)); // 最大5件表示
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>ロード中...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <h2 className="mb-4 md:mb-6 text-2xl md:text-3xl font-bold">ダッシュボード</h2>

        {/* Stats Overview */}
        {!loading && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card>
              <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-xs text-gray-500 mt-1">顧客数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold">{stats.totalMeetings}</div>
                <p className="text-xs text-gray-500 mt-1">商談数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold">{stats.totalTasks}</div>
                <p className="text-xs text-gray-500 mt-1">タスク数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
                <div className="text-xl md:text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
                <p className="text-xs text-gray-500 mt-1">期限切れタスク</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 期限間近のタスクアラート */}
        {!loading && upcomingTasks.length > 0 && (
          <Card className="mb-6 md:mb-8 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <span className="mr-2">⚠️</span>
                期限間近のタスク（3日以内）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 cursor-pointer transition-colors"
                    onClick={() => { window.location.href = '/dashboard/tasks'; }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.customer && (
                        <p className="text-sm text-gray-600">顧客: {task.customer.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-yellow-700">
                        {new Date(task.dueDate).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-500">期限</p>
                    </div>
                  </div>
                ))}
              </div>
              {stats && stats.upcomingTasks > 5 && (
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => { window.location.href = '/dashboard/tasks'; }}
                >
                  さらに{stats.upcomingTasks - 5}件のタスクを表示
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>顧客管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">顧客情報の登録・管理</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => { window.location.href = '/dashboard/customers'; }}
              >
                顧客一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>商談履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">商談記録の管理</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => { window.location.href = '/dashboard/meetings'; }}
              >
                商談一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>タスク管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">タスク・リマインダー</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => { window.location.href = '/dashboard/tasks'; }}
              >
                タスク一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>承認ワークフロー</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">商品提案の承認管理</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => { window.location.href = '/dashboard/approvals'; }}
              >
                承認一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>レポート</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">営業実績レポート</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => { window.location.href = '/dashboard/reports'; }}
              >
                レポートへ
              </Button>
            </CardContent>
          </Card>

          {user.role === 'COMPLIANCE' && (
            <Card>
              <CardHeader>
                <CardTitle>監査ログ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">操作履歴の閲覧</p>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => { window.location.href = '/dashboard/audit'; }}
                >
                  ログ一覧へ
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
    </DashboardLayout>
  );
}