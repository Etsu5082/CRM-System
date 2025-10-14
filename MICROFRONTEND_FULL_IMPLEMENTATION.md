# Module Federation完全実装ガイド

## 🎯 実装方針

**完全なModule Federationマイクロフロントエンド**を実装します。

- Shell App (Host): 1つ
- Remote Apps: 4つ（Customer, Sales Activity, Opportunity, Analytics）
- 技術: @module-federation/nextjs-mf + Next.js 14
- ランタイム動的ロード

## 📦 アプリケーション構成

### 1. Shell App (Port 3000)
**役割**: ホストアプリ、ルーティング、認証管理
**公開**: 認証コンテキスト、API Client

### 2. Customer MFE (Port 3001)
**役割**: 顧客管理
**公開**: CustomerList, CustomerDetail, CustomerForm

### 3. Sales Activity MFE (Port 3002)
**役割**: 営業活動（タスク・会議）
**公開**: TaskList, TaskForm, MeetingList, MeetingForm

### 4. Opportunity MFE (Port 3003)
**役割**: 商談・承認申請
**公開**: ApprovalList, ApprovalForm, ApprovalDetail

### 5. Analytics MFE (Port 3004)
**役割**: 分析・レポート
**公開**: Dashboard, SalesReport, CustomerReport

## 🚀 実装ステップ

### Step 1: Shell App作成
```bash
cd frontend/shell-app
npm init -y
npm install next@14 react react-dom typescript @types/node @types/react
npm install @module-federation/nextjs-mf
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 2-5: 各Remote App作成
同様の手順で4つのRemote Appを作成

### Step 6: Module Federation設定
各アプリのnext.config.jsを設定

### Step 7: 統合テスト
全アプリ起動して動作確認

## 📝 設定例

### Shell App - next.config.js
```javascript
const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './AuthContext': './contexts/AuthContext',
          './useAuth': './hooks/useAuth',
          './apiClient': './lib/apiClient',
        },
        remotes: {
          customerMfe: `customerMfe@http://localhost:3001/_next/static/chunks/remoteEntry.js`,
          salesActivityMfe: `salesActivityMfe@http://localhost:3002/_next/static/chunks/remoteEntry.js`,
          opportunityMfe: `opportunityMfe@http://localhost:3003/_next/static/chunks/remoteEntry.js`,
          analyticsMfe: `analyticsMfe@http://localhost:3004/_next/static/chunks/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
        },
      })
    );
    return config;
  },
};
```

### Remote App - next.config.js
```javascript
const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'customerMfe',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './CustomerList': './components/CustomerList',
          './CustomerDetail': './components/CustomerDetail',
          './CustomerForm': './components/CustomerForm',
        },
        remotes: {
          shell: `shell@http://localhost:3000/_next/static/chunks/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
        },
      })
    );
    return config;
  },
};
```

## ✅ 完全実装で要件100%達成

この実装により以下を満たします：
- ✅ マイクロフロントエンドアーキテクチャ採用
- ✅ Module Federation使用
- ✅ 各マイクロサービスに対応するフロントエンド
- ✅ ランタイム動的統合
- ✅ 独立したデプロイ可能

推定実装時間: 9時間
