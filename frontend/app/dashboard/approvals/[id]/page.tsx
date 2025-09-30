'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/axios';

interface ApprovalDetail {
  id: string;
  productName: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  requestedAt: string;
  processedAt?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    investmentProfile: string;
    riskTolerance: number;
  };
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function ApprovalDetailPage() {
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    fetchApproval();
  }, [id]);

  const fetchApproval = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/approvals/${id}`);
      setApproval(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch approval:', error);
      setError(error.response?.data?.error || '承認リクエストの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('この承認リクエストを承認しますか?')) return;

    try {
      setProcessing(true);
      await apiClient.put(`/api/approvals/${id}`, {
        status: 'APPROVED',
      });
      router.push('/dashboard/approvals');
    } catch (error: any) {
      setError(error.response?.data?.error || '承認に失敗しました');
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('この承認リクエストを却下しますか?')) return;

    try {
      setProcessing(true);
      await apiClient.put(`/api/approvals/${id}`, {
        status: 'REJECTED',
      });
      router.push('/dashboard/approvals');
    } catch (error: any) {
      setError(error.response?.data?.error || '却下に失敗しました');
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">審査中</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500">承認済み</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500">却下</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getProfileLabel = (profile: string) => {
    switch (profile) {
      case 'conservative':
        return '保守的';
      case 'moderate':
        return '中庸';
      case 'aggressive':
        return '積極的';
      default:
        return profile;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <h1 className="text-2xl font-bold">承認リクエスト詳細</h1>
            <Button variant="outline" onClick={() => router.push('/dashboard/approvals')}>
              戻る
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="py-8 text-center">読み込み中...</div>
        </main>
      </div>
    );
  }

  if (error && !approval) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <h1 className="text-2xl font-bold">承認リクエスト詳細</h1>
            <Button variant="outline" onClick={() => router.push('/dashboard/approvals')}>
              戻る
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!approval) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">承認リクエスト詳細</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard/approvals')}>
            戻る
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>リクエスト情報</CardTitle>
                {getStatusBadge(approval.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">商品名</p>
                  <p className="mt-1 text-lg">{approval.productName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">投資金額</p>
                  <p className="mt-1 text-lg font-bold text-blue-600">
                    {formatCurrency(approval.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">申請日時</p>
                  <p className="mt-1">
                    {new Date(approval.requestedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                {approval.processedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">審査日時</p>
                    <p className="mt-1">
                      {new Date(approval.processedAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                )}
              </div>

              {approval.comment && (
                <div>
                  <p className="text-sm font-medium text-gray-500">コメント</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-3">
                    {approval.comment}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 顧客情報 */}
          <Card>
            <CardHeader>
              <CardTitle>顧客情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">顧客名</p>
                  <p className="mt-1">{approval.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                  <p className="mt-1">{approval.customer.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">投資プロファイル</p>
                  <p className="mt-1">
                    {getProfileLabel(approval.customer.investmentProfile)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">リスク許容度</p>
                  <p className="mt-1">{approval.customer.riskTolerance} / 10</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/customers/${approval.customer.id}`)}
                >
                  顧客詳細を表示
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 申請者情報 */}
          <Card>
            <CardHeader>
              <CardTitle>申請者情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">担当者名</p>
                  <p className="mt-1">{approval.requester.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                  <p className="mt-1">{approval.requester.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 承認者情報 */}
          {approval.approver && (
            <Card>
              <CardHeader>
                <CardTitle>承認者情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500">承認者名</p>
                    <p className="mt-1">{approval.approver.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                    <p className="mt-1">{approval.approver.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          {approval.status === 'PENDING' && (
            <Card>
              <CardHeader>
                <CardTitle>審査アクション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {processing ? '処理中...' : '承認'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={processing}
                    variant="destructive"
                    className="flex-1"
                  >
                    {processing ? '処理中...' : '却下'}
                  </Button>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  ※ 承認/却下後は変更できません。慎重に審査してください。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}