'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>ロード中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">証券CRM</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="font-medium">{user.name}</p>
              <p className="text-gray-500">{user.role}</p>
            </div>
            <Button variant="outline" onClick={logout}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-6 text-3xl font-bold">ダッシュボード</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>顧客管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">顧客情報の登録・管理</p>
              <Button className="mt-4 w-full" variant="outline">
                顧客一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>商談履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">商談記録の管理</p>
              <Button className="mt-4 w-full" variant="outline">
                商談一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>タスク管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">タスク・リマインダー</p>
              <Button className="mt-4 w-full" variant="outline">
                タスク一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>承認ワークフロー</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">商品提案の承認管理</p>
              <Button className="mt-4 w-full" variant="outline">
                承認一覧へ
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>レポート</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">営業実績レポート</p>
              <Button className="mt-4 w-full" variant="outline">
                レポートへ
              </Button>
            </CardContent>
          </Card>

          {user.role === 'COMPLIANCE' && (
            <Card>
              <CardHeader>
                <CardTitle>監査ログ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">操作履歴の閲覧</p>
                <Button className="mt-4 w-full" variant="outline">
                  ログ一覧へ
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}