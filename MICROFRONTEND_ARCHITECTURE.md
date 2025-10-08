# マイクロフロントエンド アーキテクチャ

## 📦 Module Federation による統合

Webpack 5 の Module Federation を使用して、複数の独立したフロントエンドアプリケーションを統合します。

## 🏗️ アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    Shell (Host App)                          │
│                   Next.js 14 + React 18                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Navigation, Layout, Authentication State              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│  │              │              │              │          │ │
│  │  Customer    │   Sales      │  Opportunity │ Analytics│ │
│  │     MFE      │    MFE       │     MFE      │   MFE    │ │
│  │  (Remote)    │  (Remote)    │  (Remote)    │ (Remote) │ │
│  │              │              │              │          │ │
│  └──────────────┴──────────────┴──────────────┴──────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        Shared Components & Theme Library               │ │
│  │        (shadcn/ui, TanStack Query, Zustand)            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Shell (Host App) 実装

### package.json

```json
{
  "name": "crm-shell",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@module-federation/nextjs-mf": "^8.0.0",
    "typescript": "^5.9.2",
    "@types/react": "^18.3.0",
    "@types/node": "^24.6.0"
  }
}
```

### next.config.js

```javascript
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'shell',
          remotes: {
            customer: `customer@${process.env.NEXT_PUBLIC_CUSTOMER_MFE_URL || 'http://localhost:3201'}/_next/static/chunks/remoteEntry.js`,
            sales: `sales@${process.env.NEXT_PUBLIC_SALES_MFE_URL || 'http://localhost:3202'}/_next/static/chunks/remoteEntry.js`,
            opportunity: `opportunity@${process.env.NEXT_PUBLIC_OPPORTUNITY_MFE_URL || 'http://localhost:3203'}/_next/static/chunks/remoteEntry.js`,
            analytics: `analytics@${process.env.NEXT_PUBLIC_ANALYTICS_MFE_URL || 'http://localhost:3204'}/_next/static/chunks/remoteEntry.js`,
          },
          shared: {
            react: { singleton: true, requiredVersion: '^18.3.0' },
            'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
            '@tanstack/react-query': { singleton: true },
            'zustand': { singleton: true },
          },
          extraOptions: {
            automaticAsyncBoundary: true,
          },
        })
      );
    }
    return config;
  },
};
```

### app/layout.tsx

```typescript
import './globals.css';
import { Inter } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="flex h-screen">
              <Navigation />
              <main className="flex-1 overflow-auto p-8">
                {children}
              </main>
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### app/customers/page.tsx (Remote Loading)

```typescript
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the Customer MFE
const CustomerApp = dynamic(
  () => import('customer/CustomerApp').catch(() => {
    console.error('Failed to load Customer MFE');
    return () => <div>Customer module failed to load</div>;
  }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    ),
  }
);

export default function CustomersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerApp />
    </Suspense>
  );
}
```

---

## 🎨 Customer MFE (Remote) 実装

### package.json

```json
{
  "name": "customer-mfe",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 3201",
    "build": "next build",
    "start": "next start -p 3201"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@module-federation/nextjs-mf": "^8.0.0",
    "typescript": "^5.9.2"
  }
}
```

### next.config.js

```javascript
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'customer',
          filename: 'static/chunks/remoteEntry.js',
          exposes: {
            './CustomerApp': './src/components/CustomerApp.tsx',
          },
          shared: {
            react: { singleton: true, requiredVersion: '^18.3.0' },
            'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
            '@tanstack/react-query': { singleton: true },
          },
        })
      );
    }
    return config;
  },
};
```

### src/components/CustomerApp.tsx

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  investmentProfile: string;
  assignedSalesId: string;
}

export default function CustomerApp() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch customers
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (newCustomer: Partial<Customer>) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE}/customers`, newCustomer, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateModalOpen(false);
    },
  });

  if (isLoading) {
    return <div>Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">顧客管理</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          新規顧客追加
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers?.map((customer) => (
          <div key={customer.id} className="border rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg">{customer.name}</h3>
            <p className="text-gray-600">{customer.email}</p>
            <p className="text-sm text-gray-500">{customer.phone}</p>
            <div className="mt-2">
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {customer.investmentProfile}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">新規顧客作成</h2>
            {/* Form implementation */}
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="mt-4 bg-gray-300 px-4 py-2 rounded"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🔗 共有コンポーネントライブラリ

### packages/ui-components/package.json

```json
{
  "name": "@crm/ui-components",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "react": "^18.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.9.2"
  }
}
```

### packages/ui-components/src/Button.tsx

```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

---

## 🚀 開発・ビルド手順

### 1. 各MFEを独立して開発

```bash
# Shell
cd microfrontends/shell
npm install
npm run dev  # Port 3000

# Customer MFE
cd microfrontends/customer-mfe
npm install
npm run dev  # Port 3201

# Sales MFE
cd microfrontends/sales-mfe
npm install
npm run dev  # Port 3202

# Opportunity MFE
cd microfrontends/opportunity-mfe
npm install
npm run dev  # Port 3203

# Analytics MFE
cd microfrontends/analytics-mfe
npm install
npm run dev  # Port 3204
```

### 2. 統合テスト

```bash
# すべてのMFEを起動後、Shellにアクセス
open http://localhost:3000
```

### 3. プロダクションビルド

```bash
# 各MFEをビルド
cd microfrontends/customer-mfe && npm run build
cd microfrontends/sales-mfe && npm run build
cd microfrontends/opportunity-mfe && npm run build
cd microfrontends/analytics-mfe && npm run build

# Shellをビルド
cd microfrontends/shell && npm run build
```

---

## 🐳 Docker化

### Dockerfile (各MFE共通)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

---

## ☸️ Kubernetes デプロイ

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-shell
  namespace: crm-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend-shell
  template:
    metadata:
      labels:
        app: frontend-shell
    spec:
      containers:
      - name: shell
        image: crm-frontend-shell:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_GATEWAY_URL
          value: "https://api.crm.example.com"
        - name: NEXT_PUBLIC_CUSTOMER_MFE_URL
          value: "https://customer.crm.example.com"
        - name: NEXT_PUBLIC_SALES_MFE_URL
          value: "https://sales.crm.example.com"
        - name: NEXT_PUBLIC_OPPORTUNITY_MFE_URL
          value: "https://opportunity.crm.example.com"
        - name: NEXT_PUBLIC_ANALYTICS_MFE_URL
          value: "https://analytics.crm.example.com"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-shell
  namespace: crm-system
spec:
  selector:
    app: frontend-shell
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

---

## 🎯 利点

1. **独立したデプロイ**: 各MFEを独立してデプロイ可能
2. **チーム自律性**: チームごとに技術スタックを選択可能
3. **段階的移行**: 既存アプリからMFEへ段階的に移行
4. **スケーラビリティ**: 各MFEを独立してスケール
5. **障害分離**: 一つのMFEが落ちても他は動作

## ⚠️ 注意点

1. **複雑性の増加**: 統合の複雑さ
2. **バージョン管理**: 共有依存関係の管理
3. **パフォーマンス**: 初期ロード時間の増加
4. **テスト**: E2Eテストの複雑化
