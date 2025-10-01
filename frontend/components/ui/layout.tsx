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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

    const fetchUnreadNotifications = async () => {
      try {
        const response = await apiClient.get('/api/notifications/unread-count');
        setUnreadCount(response.data.data.count);
      } catch (error) {
        console.error('Failed to fetch unread notifications:', error);
      }
    };

    if (user) {
      fetchOverdueTasks();
      fetchUnreadNotifications();
      // 5分ごとに更新
      const interval = setInterval(() => {
        fetchOverdueTasks();
        fetchUnreadNotifications();
      }, 5 * 60 * 1000);
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
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="メニュー"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-bold text-blue-600">証券CRM</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Notification Bell */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="通知"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            {overdueTasks > 0 && (
              <Link
                href="/dashboard/tasks?filter=overdue"
                className="hidden sm:flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
              >
                <span className="text-sm font-semibold">⚠️ 期限切れ {overdueTasks}件</span>
              </Link>
            )}
            {overdueTasks > 0 && (
              <Link
                href="/dashboard/tasks?filter=overdue"
                className="sm:hidden p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition relative"
                aria-label="期限切れタスク"
              >
                <span className="text-sm">⚠️</span>
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {overdueTasks}
                </span>
              </Link>
            )}
            <div className="hidden md:block text-sm text-right">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="text-xs md:text-sm">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden lg:block bg-white border-b">
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

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="lg:hidden fixed top-[57px] left-0 right-0 bg-white border-b shadow-lg z-40 max-h-[calc(100vh-57px)] overflow-y-auto">
            <div className="px-4 py-2">
              <div className="md:hidden mb-3 pb-3 border-b">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-gray-500 text-xs">{user.role}</p>
              </div>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-lg transition mb-1 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}

      {/* Alert Banner */}
      {showAlert && overdueTasks > 0 && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-red-800 flex-1">
                <span className="font-semibold">⚠️ 期限切れのタスクが {overdueTasks} 件あります</span>
                <Link href="/dashboard/tasks?filter=overdue" className="underline hover:no-underline">
                  確認する →
                </Link>
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="text-red-600 hover:text-red-800 text-xl flex-shrink-0"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-4 md:py-8">{children}</main>

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