'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from './button';
import apiClient from '@/lib/axios';

type LayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const fetchOverdueTasks = async () => {
      try {
        const response = await apiClient.get('/api/tasks/overdue');
        const count = response.data.data.length;
        setOverdueTasks(count);
        if (count > 0) {
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Failed to fetch overdue tasks:', error);
      }
    };

    if (user) {
      fetchOverdueTasks();
      // 5分ごとに更新
      const interval = setInterval(fetchOverdueTasks, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const navigation = [
    { name: 'ダッシュボード', href: '/dashboard', icon: '📊' },
    { name: '顧客管理', href: '/dashboard/customers', icon: '👥' },
    { name: '商談履歴', href: '/dashboard/meetings', icon: '💼' },
    { name: 'タスク管理', href: '/dashboard/tasks', icon: '✓', badge: overdueTasks },
    { name: '承認ワークフロー', href: '/dashboard/approvals', icon: '✔️' },
    { name: 'レポート', href: '/dashboard/reports', icon: '📈' },
  ];

  if (user?.role === 'COMPLIANCE') {
    navigation.push({ name: '監査ログ', href: '/dashboard/audit', icon: '🔍' });
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (!user) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">証券CRM</span>
          </Link>
          <div className="flex items-center gap-4">
            {overdueTasks > 0 && (
              <Link
                href="/dashboard/tasks?filter=overdue"
                className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
              >
                <span className="text-sm font-semibold">⚠️ 期限切れ {overdueTasks}件</span>
              </Link>
            )}
            <div className="text-sm text-right">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                  isActive(item.href)
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Alert Banner */}
      {showAlert && overdueTasks > 0 && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-red-800">
                <span className="font-semibold">⚠️ 期限切れのタスクが {overdueTasks} 件あります</span>
                <Link href="/dashboard/tasks?filter=overdue" className="underline hover:no-underline">
                  確認する →
                </Link>
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="text-red-600 hover:text-red-800 text-xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 証券CRMシステム. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}