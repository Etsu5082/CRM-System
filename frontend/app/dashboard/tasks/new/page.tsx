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

const taskSchema = z.object({
  title: z.string().min(3, 'タイトルは3文字以上で入力してください'),
  description: z.string().optional(),
  customerId: z.string().optional(),
  dueDate: z.string().min(1, '期限を入力してください'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

type TaskFormData = z.infer<typeof taskSchema>;

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function NewTaskPage() {
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
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'MEDIUM',
      dueDate: new Date().toISOString().split('T')[0],
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

  const onSubmit = async (data: TaskFormData) => {
    try {
      setError('');
      setLoading(true);

      const taskData = {
        ...data,
        customerId: data.customerId || undefined,
        dueDate: new Date(data.dueDate).toISOString(),
      };

      await apiClient.post('/api/tasks', taskData);
      router.push('/dashboard/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'タスクの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">タスク作成</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard/tasks')}>
            キャンセル
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>タスク情報</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCustomers ? (
              <div className="text-center py-8">顧客リストを読み込み中...</div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <Input id="title" {...register('title')} />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    説明
                  </label>
                  <textarea
                    id="description"
                    {...register('description')}
                    rows={4}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="タスクの詳細を記入してください"
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="dueDate" className="text-sm font-medium">
                      期限 <span className="text-red-500">*</span>
                    </label>
                    <Input id="dueDate" type="date" {...register('dueDate')} />
                    {errors.dueDate && (
                      <p className="text-sm text-red-500">{errors.dueDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="priority" className="text-sm font-medium">
                      優先度 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="priority"
                      {...register('priority')}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">低</option>
                      <option value="MEDIUM">中</option>
                      <option value="HIGH">高</option>
                      <option value="URGENT">緊急</option>
                    </select>
                    {errors.priority && (
                      <p className="text-sm text-red-500">{errors.priority.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="customerId" className="text-sm font-medium">
                    関連顧客（オプション）
                  </label>
                  <select
                    id="customerId"
                    {...register('customerId')}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">顧客を選択（任意）</option>
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

                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? '作成中...' : '作成する'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/tasks')}
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