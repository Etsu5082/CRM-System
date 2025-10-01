'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/ui/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/axios';
import { useAuth } from '@/lib/auth-context';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    userId: '',
  });

  useEffect(() => {
    // authLoadingがfalseになるまで待つ
    if (authLoading) {
      return;
    }

    if (user && ['ADMIN', 'COMPLIANCE'].includes(user.role)) {
      fetchLogs();
    } else if (user) {
      setError('このページへのアクセス権限がありません');
      setLoading(false);
    }
  }, [user, authLoading, page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (filters.action) params.action = filters.action;
      if (filters.entity) params.entity = filters.entity;
      if (filters.userId) params.userId = filters.userId;

      const response = await apiClient.get('/api/audit', { params });
      setLogs(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '監査ログの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-800'}>
        {action}
      </Badge>
    );
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE: '作成',
      UPDATE: '更新',
      DELETE: '削除',
      LOGIN: 'ログイン',
      LOGOUT: 'ログアウト',
    };
    return labels[action] || action;
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      User: 'ユーザー',
      Customer: '顧客',
      Meeting: '商談',
      Task: 'タスク',
      ApprovalRequest: '承認リクエスト',
    };
    return labels[entity] || entity;
  };

  // 認証の読み込み中は何も表示しない
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="py-8 text-center">読み込み中...</div>
      </DashboardLayout>
    );
  }

  // 認証後に権限チェック
  if (!user || !['ADMIN', 'COMPLIANCE'].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="py-8 text-center">
          <p className="text-red-600">このページへのアクセス権限がありません</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">監査ログ</h1>
          <p className="text-gray-600 mt-1">システムの操作履歴を確認</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700">アクション</label>
                <select
                  value={filters.action}
                  onChange={(e) => {
                    setFilters({ ...filters, action: e.target.value });
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">すべて</option>
                  <option value="CREATE">作成</option>
                  <option value="UPDATE">更新</option>
                  <option value="DELETE">削除</option>
                  <option value="LOGIN">ログイン</option>
                  <option value="LOGOUT">ログアウト</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">エンティティ</label>
                <select
                  value={filters.entity}
                  onChange={(e) => {
                    setFilters({ ...filters, entity: e.target.value });
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">すべて</option>
                  <option value="User">ユーザー</option>
                  <option value="Customer">顧客</option>
                  <option value="Meeting">商談</option>
                  <option value="Task">タスク</option>
                  <option value="ApprovalRequest">承認リクエスト</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ action: '', entity: '', userId: '' });
                    setPage(1);
                  }}
                  className="w-full"
                >
                  フィルタークリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center">読み込み中...</div>
        ) : (
          <>
            {/* Logs Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ユーザー
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          アクション
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          エンティティ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          詳細
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            監査ログがありません
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(log.createdAt).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {log.user.name}
                              </div>
                              <div className="text-sm text-gray-500">{log.user.email}</div>
                              <div className="text-xs text-gray-400">{log.user.role}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getActionBadge(log.action)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getEntityLabel(log.entity)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                              <div className="truncate" title={log.details}>
                                {log.details}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  前へ
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    ページ {page} / {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  次へ
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}