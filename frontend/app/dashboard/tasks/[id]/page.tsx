'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

type TaskFormData = z.infer<typeof taskSchema>;

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function EditTaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, customersRes] = await Promise.all([
          apiClient.get(`/api/tasks/${taskId}`),
          apiClient.get('/api/customers', { params: { limit: 1000 } }),
        ]);

        const task = taskRes.data.data;
        setCustomers(customersRes.data.data);

        // フォームに値を設定
        setValue('title', task.title);
        setValue('description', task.description || '');
        setValue('customerId', task.customerId || '');
        setValue('dueDate', task.dueDate.split('T')[0]);
        setValue('priority', task.priority);
        setValue('status', task.status);

        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'タスクの取得に失敗しました');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [taskId, setValue]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      setError('');
      setLoading(true);

      const taskData = {
        ...data,
        customerId: data.customerId || undefined,
        dueDate: new Date(data.dueDate).toISOString(),
      };

      await apiClient.put(`/api/tasks/${taskId}`, taskData);
      router.push('/dashboard/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'タスクの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このタスクを削除してもよろしいですか？')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      await apiClient.delete(`/api/tasks/${taskId}`);
      router.push('/dashboard/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'タスクの削除に失敗しました');
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">タスク編集</h1>
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
                <label htmlFor="status" className="text-sm font-medium">
                  ステータス <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODO">未着手</option>
                  <option value="IN_PROGRESS">進行中</option>
                  <option value="COMPLETED">完了</option>
                  <option value="CANCELLED">キャンセル</option>
                </select>
                {errors.status && (
                  <p className="text-sm text-red-500">{errors.status.message}</p>
                )}
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
                  {loading ? '更新中...' : '更新する'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/tasks')}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-50 text-red-600 hover:bg-red-100"
                >
                  削除
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}