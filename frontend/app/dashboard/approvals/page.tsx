'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/ui/layout';
import apiClient from '@/lib/axios';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Approval = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  comment?: string;
  createdAt: string;
  processedAt?: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (user) {
      fetchApprovals();
    }
  }, [user, filter]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filter !== 'all') {
        params.status = filter.toUpperCase();
      }
      const response = await apiClient.get('/api/approvals', { params });
      setApprovals(response.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || '承認リクエストの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '承認待ち',
      APPROVED: '承認済み',
      REJECTED: '却下',
    };
    return labels[status] || status;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'warning';
    }
  };


  if (!user) {
    return null;
  }

  const canCreateApproval = user.role === 'SALES';
  const canReviewApproval = ['MANAGER', 'COMPLIANCE'].includes(user.role);

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">承認ワークフロー</h1>
          <p className="text-gray-600 mt-1">商品提案の承認申請を管理します</p>
        </div>
        {canCreateApproval && (
          <Button onClick={() => router.push('/dashboard/approvals/new')}>
            承認申請を作成
          </Button>
        )}
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
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          承認待ち
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          承認済み
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          却下
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {approvals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {filter === 'all' ? '承認リクエストがありません' : `${getStatusLabel(filter.toUpperCase())}の承認リクエストがありません`}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {approvals.map((approval) => (
                <div key={approval.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {approval.productName}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(approval.status)}>
                          {getStatusLabel(approval.status)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">顧客:</span>{' '}
                          <Link
                            href={`/dashboard/customers/${approval.customer.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {approval.customer.name}
                          </Link>
                        </div>
                        <div>
                          <span className="text-gray-500">投資金額:</span>{' '}
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(approval.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">申請者:</span>{' '}
                          <span className="text-gray-700">{approval.requester.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">申請日:</span>{' '}
                          <span className="text-gray-700">{formatDate(approval.createdAt)}</span>
                        </div>
                      </div>
                      {approval.comment && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm mb-2">
                          <p className="text-gray-500 font-semibold mb-1">申請コメント:</p>
                          <p className="text-gray-700">{approval.comment}</p>
                        </div>
                      )}
                      {approval.approver && approval.processedAt && (
                        <div className={`p-3 rounded-lg text-sm ${
                          approval.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <p className="text-gray-500 font-semibold mb-1">
                            審査者: {approval.approver.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(approval.processedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      {canReviewApproval && approval.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/dashboard/approvals/${approval.id}`)}
                        >
                          レビュー
                        </Button>
                      )}
                      {approval.status !== 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/approvals/${approval.id}`)}
                        >
                          詳細
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}