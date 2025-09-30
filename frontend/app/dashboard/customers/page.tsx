'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/axios';
import { Customer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/customers', {
        params: { page, limit: 10, search },
      });
      setCustomers(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">顧客管理</h1>
          <Button onClick={() => router.push('/dashboard')}>ダッシュボードへ戻る</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>顧客一覧</CardTitle>
              <Button onClick={() => router.push('/dashboard/customers/new')}>
                新規顧客登録
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                type="text"
                placeholder="顧客名またはメールアドレスで検索"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="max-w-md"
              />
            </div>

            {loading ? (
              <div className="py-8 text-center">読み込み中...</div>
            ) : customers.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                顧客が見つかりませんでした
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>顧客名</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>電話番号</TableHead>
                      <TableHead>投資プロファイル</TableHead>
                      <TableHead>リスク許容度</TableHead>
                      <TableHead>登録日</TableHead>
                      <TableHead>アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getProfileBadgeVariant(customer.investmentProfile)}>
                            {getProfileLabel(customer.investmentProfile)}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.riskTolerance} / 10</TableCell>
                        <TableCell>
                          {new Date(customer.createdAt).toLocaleDateString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                          >
                            詳細
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      前へ
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}