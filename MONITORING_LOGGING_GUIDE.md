# 監視・ロギングシステム実装ガイド

このガイドでは、CRMマイクロサービスに監視・ロギングシステムを統合する方法を説明します。

## 📋 目次

1. [概要](#概要)
2. [Sentry統合（エラー追跡）](#sentry統合エラー追跡)
3. [構造化ロギング](#構造化ロギング)
4. [メトリクス収集](#メトリクス収集)
5. [アラート設定](#アラート設定)

---

## 概要

### 監視スタック

| ツール | 用途 | プラン |
|--------|------|--------|
| **Sentry** | エラー追跡、パフォーマンス監視 | Free (5,000 errors/月) |
| **Pino** | 構造化ロギング | オープンソース |
| **Render Logs** | 集約ログ表示 | 無料 |

### 実装する機能

1. ✅ エラー追跡（Sentry）
2. ✅ 構造化ログ（Pino）
3. ✅ リクエストトレーシング
4. ✅ パフォーマンスメトリクス
5. ✅ アラート通知

---

## Sentry統合（エラー追跡）

### ステップ1: Sentryアカウント作成

1. https://sentry.io/ にアクセス
2. 「Get Started」をクリック
3. GitHub/Google でサインイン
4. プロジェクト作成:
   - **Platform**: Node.js
   - **Project Name**: `crm-microservices`

### ステップ2: DSN取得

Sentry Console から以下をコピー:

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### ステップ3: Sentry設定ファイル

#### `services/auth-service/src/config/sentry.ts`

```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.log('ℹ️  Sentry disabled (no SENTRY_DSN)');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
    ],

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // リリース追跡
    release: process.env.RENDER_GIT_COMMIT || 'dev',

    // サービス名
    serverName: 'auth-service',

    // エラーフィルタリング
    beforeSend(event, hint) {
      // 特定のエラーを無視
      if (event.exception) {
        const error = hint.originalException as Error;
        if (error.message?.includes('ECONNREFUSED')) {
          return null; // 接続エラーは無視
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized');
};

export default Sentry;
```

### ステップ4: Express統合

#### `services/auth-service/src/server.ts`

```typescript
import express from 'express';
import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry';

// Sentryを最初に初期化
initSentry();

const app = express();

// Sentryリクエストハンドラ（最初のミドルウェア）
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// 通常のミドルウェア
app.use(express.json());
// ...

// ルート
app.use('/auth', authRoutes);

// Sentryエラーハンドラ（エラーハンドラの前）
app.use(Sentry.Handlers.errorHandler());

// カスタムエラーハンドラ
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Sentryにエラーを送信
  Sentry.captureException(err, {
    tags: {
      service: 'auth-service',
      endpoint: req.path,
      method: req.method,
    },
    extra: {
      body: req.body,
      query: req.query,
      user: (req as any).user?.id,
    },
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});
```

### ステップ5: 手動エラー送信

```typescript
import * as Sentry from '@sentry/node';

// エラーをキャプチャ
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: 'user-registration' },
    extra: { userId: user.id },
  });
  throw error;
}

// カスタムメッセージ
Sentry.captureMessage('重要なイベントが発生しました', {
  level: 'warning',
  tags: { service: 'auth-service' },
});

// パフォーマンス計測
const transaction = Sentry.startTransaction({
  op: 'database-query',
  name: 'Get User by Email',
});

try {
  const user = await prisma.user.findUnique({ where: { email } });
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

---

## 構造化ロギング

### Pino統合

#### `services/auth-service/src/config/logger.ts`

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,

  base: {
    service: 'auth-service',
    environment: process.env.NODE_ENV || 'production',
  },

  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },

  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.token',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
```

#### 使用例

```typescript
import logger from './config/logger';

// 基本ログ
logger.info('User registered successfully');
logger.warn('Rate limit approaching');
logger.error('Database connection failed');

// 構造化ログ
logger.info(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
  },
  'User login successful'
);

// エラーログ
try {
  await operation();
} catch (error) {
  logger.error(
    {
      err: error,
      userId: user.id,
      operation: 'user-update',
    },
    'Operation failed'
  );
}

// リクエストログ
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: (req as any).user?.id,
      },
      'Request completed'
    );
  });

  next();
});
```

---

## メトリクス収集

### カスタムメトリクス

#### `services/auth-service/src/middleware/metrics.ts`

```typescript
interface Metrics {
  requests: {
    total: number;
    success: number;
    error: number;
    byPath: Record<string, number>;
  };
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  activeUsers: number;
}

const metrics: Metrics = {
  requests: {
    total: 0,
    success: 0,
    error: 0,
    byPath: {},
  },
  latency: {
    avg: 0,
    p50: 0,
    p95: 0,
    p99: 0,
  },
  activeUsers: 0,
};

const latencies: number[] = [];

export const metricsMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // リクエスト数
    metrics.requests.total++;
    metrics.requests.byPath[req.path] = (metrics.requests.byPath[req.path] || 0) + 1;

    if (res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.error++;
    }

    // レイテンシ記録
    latencies.push(duration);
    if (latencies.length > 1000) {
      latencies.shift(); // 最大1000件保持
    }

    // レイテンシ計算
    const sorted = [...latencies].sort((a, b) => a - b);
    metrics.latency.avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    metrics.latency.p50 = sorted[Math.floor(sorted.length * 0.5)];
    metrics.latency.p95 = sorted[Math.floor(sorted.length * 0.95)];
    metrics.latency.p99 = sorted[Math.floor(sorted.length * 0.99)];
  });

  next();
};

// メトリクスエンドポイント
export const getMetrics = (req: express.Request, res: express.Response) => {
  res.json({
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    metrics,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  });
};
```

#### メトリクスエンドポイント追加

```typescript
// server.ts
import { metricsMiddleware, getMetrics } from './middleware/metrics';

app.use(metricsMiddleware);

// メトリクス取得エンドポイント（認証不要）
app.get('/metrics', getMetrics);
```

---

## アラート設定

### Sentry アラート

1. Sentry Console → **Alerts** → **Create Alert**
2. 以下のアラートを設定:

#### エラー頻度アラート

```
条件: 5分間に10件以上のエラー
アクション: メール通知
```

#### パフォーマンス劣化アラート

```
条件: P95レイテンシが1秒を超える
アクション: メール通知
```

#### エラー率アラート

```
条件: エラー率が5%を超える
アクション: Slack通知
```

### カスタムアラート（Render）

Render Dashboard でアラート設定:

1. **CPU使用率**: 80%以上で通知
2. **メモリ使用率**: 90%以上で通知
3. **デプロイ失敗**: 即座に通知

---

## 環境変数設定

### 全サービスに追加

```bash
# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# ロギング
LOG_LEVEL=info
NODE_ENV=production

# Git情報（Renderが自動設定）
RENDER_GIT_COMMIT=auto
```

---

## デプロイ後の確認

### 1. Sentryでエラー確認

```bash
# テストエラーを送信
curl -X POST https://crm-api-gateway.onrender.com/api/test-error
```

Sentry Console で確認:
- **Issues** → 新しいエラーが表示される
- スタックトレース
- リクエスト情報
- ユーザー情報

### 2. ログ確認

Render Dashboard → サービス → Logs:

```json
{
  "level": 30,
  "time": 1633024800000,
  "service": "auth-service",
  "msg": "User login successful",
  "userId": "cm123",
  "email": "user@example.com"
}
```

### 3. メトリクス確認

```bash
curl https://crm-auth-service.onrender.com/metrics
```

レスポンス:
```json
{
  "service": "auth-service",
  "timestamp": "2025-10-13T12:00:00.000Z",
  "uptime": 3600,
  "metrics": {
    "requests": {
      "total": 1000,
      "success": 950,
      "error": 50,
      "byPath": {
        "/auth/login": 500,
        "/auth/register": 300,
        "/auth/me": 200
      }
    },
    "latency": {
      "avg": 150,
      "p50": 120,
      "p95": 300,
      "p99": 500
    }
  }
}
```

---

## ベストプラクティス

### 1. ログレベルの使い分け

```typescript
logger.trace('デバッグ用の詳細情報'); // 開発のみ
logger.debug('デバッグ情報'); // 開発のみ
logger.info('通常の情報'); // 本番でも出力
logger.warn('警告'); // 本番でも出力
logger.error('エラー'); // 本番でも出力
logger.fatal('致命的エラー'); // 本番でも出力
```

### 2. 機密情報の除外

```typescript
// パスワードをログに出力しない
logger.info(
  {
    email: user.email,
    // password: user.password, ❌ 絶対にしない
  },
  'User registered'
);

// Pinoの自動除外機能を使用
const logger = pino({
  redact: ['password', 'token', 'apiKey'],
});
```

### 3. エラーコンテキストの追加

```typescript
try {
  await operation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      service: 'auth-service',
      operation: 'user-registration',
      critical: 'true',
    },
    extra: {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    },
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
```

### 4. パフォーマンス測定

```typescript
const startTime = Date.now();

try {
  const result = await heavyOperation();

  const duration = Date.now() - startTime;

  logger.info(
    { duration, resultCount: result.length },
    'Heavy operation completed'
  );

  if (duration > 1000) {
    Sentry.captureMessage('Slow operation detected', {
      level: 'warning',
      tags: { operation: 'heavy-operation' },
      extra: { duration },
    });
  }
} catch (error) {
  logger.error({ err: error, duration: Date.now() - startTime }, 'Operation failed');
  throw error;
}
```

---

## コスト見積もり

### Sentry

| プラン | エラー/月 | トランザクション/月 | 料金 |
|--------|----------|-------------------|------|
| **Developer (Free)** | 5,000 | 10,000 | $0 |
| **Team** | 50,000 | 100,000 | $26/月 |
| **Business** | 100,000 | 500,000 | $80/月 |

### 推奨プラン

開発初期: **Developer (Free)**
- 1日あたり約166エラー
- 十分なトランザクション数

将来的なアップグレード: **Team**
- ユーザー数増加時
- より詳細なパフォーマンス分析が必要な場合

---

## トラブルシューティング

### Sentryにエラーが送信されない

```bash
# DSNを確認
echo $SENTRY_DSN

# テストエラーを送信
curl -X POST https://your-service.onrender.com/test-sentry
```

### ログが表示されない

```bash
# LOG_LEVELを確認
echo $LOG_LEVEL

# Render Logsを確認
# Dashboard → サービス → Logs
```

### メトリクスが更新されない

```bash
# メトリクスエンドポイントを確認
curl https://your-service.onrender.com/metrics
```

---

## 次のステップ

1. ✅ Sentry統合完了
2. ✅ 構造化ロギング実装
3. ✅ メトリクス収集実装
4. ⏳ ダッシュボード作成
5. ⏳ アラート設定完了
6. ⏳ パフォーマンス最適化

---

## 参考リンク

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Pino Documentation](https://getpino.io/)
- [Render Monitoring](https://render.com/docs/monitoring)
