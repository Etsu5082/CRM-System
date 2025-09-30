'use client';


import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/ui/layout';
import apiClient from '@/lib/axios';

const approvalSchema = z.object({
  customerId: z.string().min(1, '顧客を選択してください'),
  productName: z.string().min(3, '商品名は3文字以上で入力してください'),
  amount: z.number().positive('投資金額は正の数で入力してください'),
  comment: z.string().optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

type Customer = {
  id: string;
  name: string;
  email: string;
  investmentProfile: string;
  riskTolerance: number;
};

export default function NewApprovalPage() {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCustomerId = searchParams.get('customerId');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
  });

  const selectedCustomerId = watch('customerId');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await apiClient.get('/api/customers', {
          params: { limit: 1000 },
        });
        setCustomers(response.data.data);

        if (preSelectedCustomerId) {
          setValue('customerId', preSelectedCustomerId);
        }
      } catch (err: any) {
        setError('顧客リストの取得に失敗しました');
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [preSelectedCustomerId, setValue]);

  const onSubmit = async (data: ApprovalFormData) => {
    try {
      setError('');
      setLoading(true);

      await apiClient.post('/api/approvals', data);
      router.push('/dashboard/approvals');
    } catch (err: any) {
      setError(err.response?.data?.message || '承認申請の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">承認申請作成</h1>
      </header>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>商品提案承認申請</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCustomers ? (
            <div className="text-center py-8">顧客リストを読み込み中...</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="customerId" className="text-sm font-medium">
                  顧客 <span className="text-red-500">*</span>
                </label>
                <select
                  id="customerId"
                  {...register('customerId')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">顧客を選択してください</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="text-sm text-red-500">{errors.customerId.message}</p>
                )}
                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="font-semibold text-blue-900">顧客情報:</p>
                    <p className="text-blue-800">
                      投資プロファイル: {selectedCustomer.investmentProfile} |
                      リスク許容度: {selectedCustomer.riskTolerance}/10
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="productName" className="text-sm font-medium">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="productName"
                  {...register('productName')}
                  placeholder="例: 投資信託A、株式Bなど"
                />
                {errors.productName && (
                  <p className="text-sm text-red-500">{errors.productName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  投資金額（円） <span className="text-red-500">*</span>
                </label>
                <Input
                  id="amount"
                  type="number"
                  step="10000"
                  {...register('amount', { valueAsNumber: true })}
                  placeholder="1000000"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="comment" className="text-sm font-medium">
                  コメント・備考
                </label>
                <textarea
                  id="comment"
                  {...register('comment')}
                  rows={4}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="商品の詳細、推奨理由などを記入してください"
                />
                {errors.comment && (
                  <p className="text-sm text-red-500">{errors.comment.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? '申請中...' : '承認申請を作成'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/approvals')}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}