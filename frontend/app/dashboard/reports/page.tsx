'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/ui/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  customers: { total: number };
  meetings: { total: number };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  approvals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
}

interface TaskTrend {
  date: string;
  created: number;
  completed: number;
}

interface SalesMetric {
  salesId: string;
  salesName: string;
  salesEmail: string;
  meetingCount: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskTrends, setTaskTrends] = useState<TaskTrend[]>([]);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendsRes, metricsRes] = await Promise.all([
        apiClient.get('/api/reports/dashboard'),
        apiClient.get(`/api/reports/task-trends?days=${dateRange}`),
        apiClient.get('/api/reports/sales-metrics'),
      ]);

      setStats(statsRes.data.data);
      setTaskTrends(trendsRes.data.data);
      setSalesMetrics(metricsRes.data.data);
      setError('');
    } catch (err: any) {
      setError('データの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const response = await apiClient.get(`/api/reports/export/${type}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('エクスポートに失敗しました');
      console.error(err);
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  const approvalPieData = stats
    ? [
        { name: '承認済み', value: stats.approvals.approved, color: '#10b981' },
        { name: '却下', value: stats.approvals.rejected, color: '#ef4444' },
        { name: '審査中', value: stats.approvals.pending, color: '#f59e0b' },
      ]
    : [];

  const taskPieData = stats
    ? [
        { name: '完了', value: stats.tasks.completed, color: '#10b981' },
        { name: '期限切れ', value: stats.tasks.overdue, color: '#ef4444' },
        { name: '進行中', value: stats.tasks.pending - stats.tasks.overdue, color: '#f59e0b' },
      ]
    : [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-8 text-center">読み込み中...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">レポート・分析</h1>
            <p className="text-gray-600 mt-1">システムの利用状況とパフォーマンスを確認</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('customers')} variant="outline">
              顧客CSV
            </Button>
            <Button onClick={() => handleExport('meetings')} variant="outline">
              商談CSV
            </Button>
            <Button onClick={() => handleExport('tasks')} variant="outline">
              タスクCSV
            </Button>
            <Button onClick={() => handleExport('approvals')} variant="outline">
              承認CSV
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* サマリーカード */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">総顧客数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.customers.total || 0}</div>
              <p className="text-xs text-gray-500 mt-1">登録顧客</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">総商談数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.meetings.total || 0}</div>
              <p className="text-xs text-gray-500 mt-1">実施済み商談</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">タスク完了率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.tasks.completionRate || 0}%</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.tasks.completed || 0} / {stats?.tasks.total || 0} タスク
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">承認率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.approvals.approvalRate || 0}%</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.approvals.approved || 0} / {(stats?.approvals.approved || 0) + (stats?.approvals.rejected || 0)} 件
              </p>
            </CardContent>
          </Card>
        </div>

        {/* タスクトレンド */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>タスク作成・完了トレンド</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={dateRange === 7 ? 'default' : 'outline'}
                  onClick={() => setDateRange(7)}
                >
                  7日
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === 30 ? 'default' : 'outline'}
                  onClick={() => setDateRange(30)}
                >
                  30日
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === 90 ? 'default' : 'outline'}
                  onClick={() => setDateRange(90)}
                >
                  90日
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={taskTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  name="作成"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="完了"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 営業パフォーマンス */}
          <Card>
            <CardHeader>
              <CardTitle>営業別商談数</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="salesName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="meetingCount" fill="#3b82f6" name="商談数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* タスクステータス */}
          <Card>
            <CardHeader>
              <CardTitle>タスクステータス内訳</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) =>
                      `${props.name}: ${props.value} (${((props.percent || 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 承認ステータス */}
          <Card>
            <CardHeader>
              <CardTitle>承認リクエスト内訳</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={approvalPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) =>
                      `${props.name}: ${props.value} (${((props.percent || 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {approvalPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 営業パフォーマンステーブル */}
          <Card>
            <CardHeader>
              <CardTitle>営業パフォーマンスランキング</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesMetrics.map((metric, index) => (
                  <div key={metric.salesId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : index === 1
                            ? 'bg-gray-100 text-gray-800'
                            : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{metric.salesName}</p>
                        <p className="text-sm text-gray-500">{metric.salesEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{metric.meetingCount}</p>
                      <p className="text-xs text-gray-500">商談</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}