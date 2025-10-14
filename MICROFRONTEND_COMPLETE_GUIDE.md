# Module Federation完全実装ガイド - CRMシステム

## 🎯 実装概要

本ガイドは、CRMシステムにModule Federationベースのマイクロフロントエンドを**完全に実装**するための包括的な手順書です。

---

## 📦 アーキテクチャ

### 構成
```
┌─────────────────────────────────────────┐
│     Shell App (Host) - Port 3000        │
│  - ルーティング                          │
│  - 認証管理                              │
│  - レイアウト                            │
│  - Remote App動的ロード                  │
└─────────────────────────────────────────┘
      ↓          ↓          ↓          ↓
┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│Customer  ││Sales     ││Opportun- ││Analytics │
│MFE       ││Activity  ││ity MFE   ││MFE       │
│:3001     ││MFE :3002 ││:3003     ││:3004     │
└──────────┘└──────────┘└──────────┘└──────────┘
```

---

## 🚀 完全実装手順

### Phase 1: 環境準備（5分）

```bash
cd /Users/kohetsuwatanabe/Library/CloudStorage/OneDrive-個人用/ETSU-DX/CRMシステム開発/frontend

# 既存のfrontendをshell-appとしてリネーム
mv /Users/kohetsuwatanabe/Library/CloudStorage/OneDrive-個人用/ETSU-DX/CRMシステム開発/frontend /Users/kohetsuwatanabe/Library/CloudStorage/OneDrive-個人用/ETSU-DX/CRMシステム開発/frontend-backup
mkdir frontend
cd frontend
```

---

### Phase 2: Shell App作成（60分）

#### 2-1. プロジェクト初期化
```bash
mkdir shell-app && cd shell-app
npm init -y
npm install next@14.2.0 react@18 react-dom@18
npm install typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 2-2. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 2-3. next.config.js（Module Federation設定）
```javascript
const NextFederationPlugin = require('@module-federation/nextjs-mf');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    const { isServer } = options;

    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './AuthContext': './contexts/AuthContext.tsx',
          './useAuth': './hooks/useAuth.ts',
          './apiClient': './lib/apiClient.ts',
        },
        remotes: {
          customerMfe: `customerMfe@http://localhost:3001/_next/static/${isServer ? 'ssr' : 'chunks'}/remoteEntry.js`,
          salesActivityMfe: `salesActivityMfe@http://localhost:3002/_next/static/${isServer ? 'ssr' : 'chunks'}/remoteEntry.js`,
          opportunityMfe: `opportunityMfe@http://localhost:3003/_next/static/${isServer ? 'ssr' : 'chunks'}/remoteEntry.js`,
          analyticsMfe: `analyticsMfe@http://localhost:3004/_next/static/${isServer ? 'ssr' : 'chunks'}/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        },
      })
    );

    return config;
  },
};

module.exports = nextConfig;
```

#### 2-4. ディレクトリ構造
```bash
mkdir -p app contexts hooks lib components
```

#### 2-5. contexts/AuthContext.tsx
```typescript
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

#### 2-6. app/layout.tsx
```typescript
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM System',
  description: 'Microservices-based CRM with Micro Frontends',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### 2-7. app/page.tsx（ダッシュボード）
```typescript
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(
  () => import('analyticsMfe/Dashboard').catch(() => () => <div>Loading...</div>),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">CRM Dashboard</h1>
      <Dashboard />
    </main>
  );
}
```

#### 2-8. package.json scripts
```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  }
}
```

---

### Phase 3: Customer MFE作成（90分）

#### 3-1. プロジェクト初期化
```bash
cd ..
mkdir customer-mfe && cd customer-mfe
npm init -y
npm install next@14.2.0 react@18 react-dom@18
npm install typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 3-2. next.config.js
```javascript
const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'customerMfe',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './CustomerList': './components/CustomerList.tsx',
          './CustomerDetail': './components/CustomerDetail.tsx',
          './CustomerForm': './components/CustomerForm.tsx',
        },
        remotes: {
          shell: `shell@http://localhost:3000/_next/static/${options.isServer ? 'ssr' : 'chunks'}/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        },
      })
    );
    return config;
  },
};
```

#### 3-3. components/CustomerList.tsx
```typescript
'use client';

import { useEffect, useState } from 'react';

interface Customer {
  id: string;
  name: string;
  email: string;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">顧客一覧</h2>
      <div className="grid gap-4">
        {customers.map(customer => (
          <div key={customer.id} className="border p-4 rounded">
            <h3 className="font-bold">{customer.name}</h3>
            <p className="text-gray-600">{customer.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 3-4. app/page.tsx
```typescript
import CustomerList from '@/components/CustomerList';

export default function CustomersPage() {
  return <CustomerList />;
}
```

---

### Phase 4-6: 残り3つのRemote App作成（各60分、合計180分）

**同様の手順で作成:**
- Sales Activity MFE (Port 3002)
- Opportunity MFE (Port 3003)
- Analytics MFE (Port 3004)

各MFEの構成:
```
mfe-name/
├── components/
│   ├── [Feature]List.tsx
│   ├── [Feature]Detail.tsx
│   └── [Feature]Form.tsx
├── app/
│   └── page.tsx
├── next.config.js
├── tsconfig.json
└── package.json
```

---

### Phase 7: 統合テスト（60分）

#### 7-1. 全アプリ起動
```bash
# ターミナル1
cd shell-app && npm run dev

# ターミナル2
cd customer-mfe && npm run dev

# ターミナル3
cd sales-activity-mfe && npm run dev

# ターミナル4
cd opportunity-mfe && npm run dev

# ターミナル5
cd analytics-mfe && npm run dev
```

#### 7-2. 動作確認
```bash
# Shell Appにアクセス
open http://localhost:3000

# 各MFEを個別にアクセス
open http://localhost:3001
open http://localhost:3002
open http://localhost:3003
open http://localhost:3004
```

#### 7-3. Module Federation確認
```javascript
// ブラウザコンソールで確認
console.log(window.customerMfe);
console.log(window.salesActivityMfe);
console.log(window.opportunityMfe);
console.log(window.analyticsMfe);
```

---

## 🐳 Docker & Kubernetes対応

### Dockerfile（各MFE共通）
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### K8s Deployment（各MFE用）
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: customer-mfe
  namespace: crm-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: customer-mfe
  template:
    metadata:
      labels:
        app: customer-mfe
    spec:
      containers:
      - name: customer-mfe
        image: crm/customer-mfe:latest
        ports:
        - containerPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: customer-mfe
  namespace: crm-system
spec:
  selector:
    app: customer-mfe
  ports:
  - port: 3001
    targetPort: 3001
```

---

## ✅ 検証チェックリスト

### 機能検証
- [ ] Shell Appが起動する
- [ ] 各Remote Appが個別に起動する
- [ ] Shell AppからRemote Appをロードできる
- [ ] 認証コンテキストが共有される
- [ ] ルーティングが正常に動作する
- [ ] APIコール が成功する

### パフォーマンス検証
- [ ] 初期ロード時間 < 3秒
- [ ] Remote Appの動的ロード < 1秒
- [ ] メモリ使用量が適切
- [ ] CPU使用率が適切

### セキュリティ検証
- [ ] JWT認証が動作する
- [ ] CORS設定が正しい
- [ ] XSS対策が実装されている
- [ ] CSRF対策が実装されている

---

## 📊 推定時間

| Phase | 内容 | 時間 |
|-------|------|------|
| Phase 1 | 環境準備 | 5分 |
| Phase 2 | Shell App作成 | 60分 |
| Phase 3 | Customer MFE | 90分 |
| Phase 4 | Sales Activity MFE | 60分 |
| Phase 5 | Opportunity MFE | 60分 |
| Phase 6 | Analytics MFE | 60分 |
| Phase 7 | 統合テスト | 60分 |
| **合計** | | **6.5時間** |

---

## 🎯 要件達成状況

実装完了後:
- ✅ マイクロフロントエンドアーキテクチャ採用
- ✅ Module Federation使用
- ✅ 各マイクロサービスに対応するフロントエンド
- ✅ ランタイム動的統合
- ✅ 独立したデプロイ可能
- ✅ Kubernetes対応

**必須要件達成率: 100%** 🎉

---

## 📚 参考資料

- [Module Federation公式](https://webpack.js.org/concepts/module-federation/)
- [Next.js Module Federation](https://github.com/module-federation/nextjs-mf)
- [マイクロフロントエンド設計パターン](https://micro-frontends.org/)

---

**作成日**: 2025-10-14
**バージョン**: 1.0.0
**ステータス**: 実装準備完了 ✅
