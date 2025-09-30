'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/lib/axios';

const customerSchema = z.object({
  name: z.string().min(2, '名前は2文字以上で入力してください').max(50, '名前が長すぎます'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().optional(),
  address: z.string().optional(),
  investmentProfile: z.enum(['conservative', 'moderate', 'aggressive'], {
    message: '投資プロファイルを選択してください',
  }),
  riskTolerance: z.number().min(1).max(10),
  investmentExperience: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function NewCustomerPage() {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      riskTolerance: 5,
      investmentProfile: 'moderate',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setError('');
      setLoading(true);
      await apiClient.post('/api/customers', data);
      router.push('/dashboard/customers');
    } catch (err: any) {
      setError(err.response?.data?.message || '顧客の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">新規顧客登録</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard/customers')}>
            キャンセル
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>顧客情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    顧客名 <span className="text-red-500">*</span>
                  </label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    電話番号
                  </label>
                  <Input id="phone" {...register('phone')} />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="investmentExperience" className="text-sm font-medium">
                    投資経験
                  </label>
                  <Input
                    id="investmentExperience"
                    placeholder="例: 5年"
                    {...register('investmentExperience')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium">
                  住所
                </label>
                <Input id="address" {...register('address')} />
              </div>

              <div className="space-y-2">
                <label htmlFor="investmentProfile" className="text-sm font-medium">
                  投資プロファイル <span className="text-red-500">*</span>
                </label>
                <select
                  id="investmentProfile"
                  {...register('investmentProfile')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="conservative">保守的</option>
                  <option value="moderate">中庸</option>
                  <option value="aggressive">積極的</option>
                </select>
                {errors.investmentProfile && (
                  <p className="text-sm text-red-500">{errors.investmentProfile.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="riskTolerance" className="text-sm font-medium">
                  リスク許容度 (1-10) <span className="text-red-500">*</span>
                </label>
                <Input
                  id="riskTolerance"
                  type="number"
                  min="1"
                  max="10"
                  {...register('riskTolerance', { valueAsNumber: true })}
                />
                {errors.riskTolerance && (
                  <p className="text-sm text-red-500">{errors.riskTolerance.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? '登録中...' : '登録'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/customers')}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}