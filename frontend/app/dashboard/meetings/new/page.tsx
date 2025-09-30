'use client';


import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/lib/axios';

const meetingSchema = z.object({
  customerId: z.string().min(1, '顧客を選択してください'),
  date: z.string().min(1, '日付を入力してください'),
  summary: z.string().min(10, '商談内容は10文字以上で入力してください'),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.nextAction && !data.nextActionDate) {
      return false;
    }
    return true;
  },
  {
    message: '次回アクションを入力した場合は、次回予定日も入力してください',
    path: ['nextActionDate'],
  }
);

type MeetingFormData = z.infer<typeof meetingSchema>;

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function NewMeetingPage() {
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
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

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

  const onSubmit = async (data: MeetingFormData) => {
    try {
      setError('');
      setLoading(true);

      // ISO形式に変換
      const meetingData = {
        ...data,
        date: new Date(data.date).toISOString(),
        nextActionDate: data.nextActionDate
          ? new Date(data.nextActionDate).toISOString()
          : undefined,
      };

      await apiClient.post('/api/meetings', meetingData);
      router.push('/dashboard/meetings');
    } catch (err: any) {
      setError(err.response?.data?.message || '商談の記録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">商談記録</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard/meetings')}>
            キャンセル
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>商談情報</CardTitle>
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
                </div>

                <div className="space-y-2">
                  <label htmlFor="date" className="text-sm font-medium">
                    商談日 <span className="text-red-500">*</span>
                  </label>
                  <Input id="date" type="date" {...register('date')} />
                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="summary" className="text-sm font-medium">
                    商談内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="summary"
                    {...register('summary')}
                    rows={6}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="商談の内容を詳しく記録してください"
                  />
                  {errors.summary && (
                    <p className="text-sm text-red-500">{errors.summary.message}</p>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">次回アクション</h3>

                  <div className="space-y-2 mb-4">
                    <label htmlFor="nextAction" className="text-sm font-medium">
                      次回アクション
                    </label>
                    <textarea
                      id="nextAction"
                      {...register('nextAction')}
                      rows={3}
                      className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="次回のフォローアップ内容を記入（自動でタスクが作成されます）"
                    />
                    {errors.nextAction && (
                      <p className="text-sm text-red-500">{errors.nextAction.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="nextActionDate" className="text-sm font-medium">
                      次回予定日
                    </label>
                    <Input id="nextActionDate" type="date" {...register('nextActionDate')} />
                    {errors.nextActionDate && (
                      <p className="text-sm text-red-500">{errors.nextActionDate.message}</p>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-2">
                    ※ 次回アクションと予定日を入力すると、自動的にタスクが作成されます
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? '記録中...' : '記録する'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/meetings')}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}