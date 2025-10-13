# Redis キャッシング実装ガイド

このガイドでは、全マイクロサービスにRedisキャッシングを統合する方法を説明します。

## 📋 目次

1. [概要](#概要)
2. [Redisセットアップ](#redisセットアップ)
3. [キャッシング戦略](#キャッシング戦略)
4. [実装例](#実装例)
5. [キャッシュ無効化戦略](#キャッシュ無効化戦略)

---

## 概要

### Redis構成

すべてのマイクロサービスに以下が追加済み:

- ✅ `src/config/redis.ts` - Redis接続とヘルパー関数
- ✅ `package.json` - redis依存関係 (v4.6.0)
- ⏳ `server.ts` - Redisの初期化（次のステップ）
- ⏳ コントローラー - キャッシュロジックの実装（次のステップ）

### キャッシュヘルパー関数

各サービスの `redis.ts` には以下の関数が実装済み:

```typescript
// Redis接続
initRedis(): Promise<RedisClientType | null>
disconnectRedis(): Promise<void>
getRedis(): RedisClientType | null

// キャッシュ操作
cacheGet<T>(key: string): Promise<T | null>
cacheSet(key: string, value: any, ttlSeconds?: number): Promise<boolean>
cacheDel(key: string): Promise<boolean>
cacheDelPattern(pattern: string): Promise<number>
```

---

## Redisセットアップ

### Render での Redis セットアップ

1. Render Dashboard を開く
2. 「New +」→「Redis」をクリック
3. 以下の設定:

```
Name: crm-redis
Plan: Free (25MB, 最大接続数20)
Region: Oregon (US West) - API Gatewayと同じ
```

4. 「Create Redis」をクリック
5. 「Internal Redis URL」をコピー:

```
rediss://red-xxx:xxx@oregon-redis.render.com:6379
```

### 環境変数設定

**全5サービス** (auth, customer, sales-activity, opportunity, analytics) に以下を追加:

```bash
REDIS_URL=rediss://red-xxx:xxx@oregon-redis.render.com:6379
```

---

## キャッシング戦略

### キャッシュすべきデータ

#### 1. Auth Service

| データ | キャッシュキー | TTL | 理由 |
|--------|---------------|-----|------|
| ユーザー情報 | `user:{id}` | 300秒 | 頻繁にアクセスされる |
| ユーザー一覧 | `users:list:{page}` | 60秒 | 管理画面で使用 |

#### 2. Customer Service

| データ | キャッシュキー | TTL | 理由 |
|--------|---------------|-----|------|
| 顧客詳細 | `customer:{id}` | 600秒 | 変更頻度低い |
| 顧客一覧 | `customers:list:{page}:{filter}` | 120秒 | フィルター付き |
| 顧客数 | `customers:count` | 300秒 | ダッシュボード表示 |

#### 3. Sales Activity Service

| データ | キャッシュキー | TTL | 理由 |
|--------|---------------|-----|------|
| タスク一覧 | `tasks:user:{userId}:status:{status}` | 60秒 | リアルタイム性重視 |
| 会議一覧 | `meetings:user:{userId}:upcoming` | 120秒 | 変更頻度中 |
| 期限切れタスク | `tasks:overdue` | 60秒 | アラート表示 |

#### 4. Opportunity Service

| データ | キャッシュキー | TTL | 理由 |
|--------|---------------|-----|------|
| 承認フロー | `approvals:user:{userId}:pending` | 30秒 | リアルタイム性最重視 |
| 承認履歴 | `approvals:history:{id}` | 600秒 | 変更なし |

#### 5. Analytics Service

| データ | キャッシュキー | TTL | 理由 |
|--------|---------------|-----|------|
| ダッシュボード統計 | `analytics:dashboard:{userId}` | 180秒 | 計算コスト高 |
| レポートデータ | `reports:{type}:{startDate}:{endDate}` | 3600秒 | 重い集計クエリ |
| 通知一覧 | `notifications:user:{userId}:unread` | 30秒 | リアルタイム性重視 |

### TTL (Time To Live) ガイドライン

- **30秒**: リアルタイム性が最重要（承認、通知）
- **60秒**: 変更が頻繁（タスク、会議）
- **120-300秒**: 標準的なデータ（顧客一覧、ユーザー情報）
- **600秒以上**: ほぼ変更されないデータ（履歴、レポート）

---

## 実装例

### 1. Auth Service - ユーザー情報キャッシング

#### `src/controllers/authController.ts`

```typescript
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Step 1: キャッシュチェック
    const cached = await cacheGet<User>(`user:${id}`);
    if (cached) {
      console.log(`✅ Cache HIT: user:${id}`);
      return res.json(cached);
    }

    console.log(`❌ Cache MISS: user:${id}`);

    // Step 2: データベースクエリ
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Step 3: キャッシュに保存 (TTL: 5分)
    await cacheSet(`user:${id}`, user, 300);

    res.json(user);
  } catch (error: any) {
    console.error('Error in getUser:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // データベース更新
    const user = await prisma.user.update({
      where: { id },
      data,
    });

    // 🔄 キャッシュ無効化
    await cacheDel(`user:${id}`);
    await cacheDelPattern(`users:list:*`); // ユーザー一覧も無効化

    res.json(user);
  } catch (error: any) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ error: error.message });
  }
};
```

### 2. Customer Service - 顧客一覧キャッシング

#### `src/controllers/customerController.ts`

```typescript
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const industry = req.query.industry as string;

    // キャッシュキー生成
    const cacheKey = `customers:list:${page}:${limit}:${industry || 'all'}`;

    // Step 1: キャッシュチェック
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return res.json(cached);
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    // Step 2: データベースクエリ
    const where = industry ? { industry } : {};
    const customers = await prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.customer.count({ where });

    const result = {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Step 3: キャッシュに保存 (TTL: 2分)
    await cacheSet(cacheKey, result, 120);

    res.json(result);
  } catch (error: any) {
    console.error('Error in getCustomers:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // 顧客作成
    const customer = await prisma.customer.create({ data });

    // 🔄 すべての顧客一覧キャッシュを無効化
    await cacheDelPattern(`customers:list:*`);
    await cacheDel(`customers:count`);

    // Kafka イベント発行
    await publishEvent('customer.events', {
      eventType: 'CUSTOMER_CREATED',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      data: customer,
    });

    res.status(201).json(customer);
  } catch (error: any) {
    console.error('Error in createCustomer:', error);
    res.status(500).json({ error: error.message });
  }
};
```

### 3. Analytics Service - ダッシュボード統計

#### `src/controllers/analyticsController.ts`

```typescript
import { cacheGet, cacheSet } from '../config/redis';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cacheKey = `analytics:dashboard:${userId}`;

    // Step 1: キャッシュチェック
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return res.json({ ...cached, cached: true });
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    // Step 2: 重い集計クエリ
    const [
      totalCustomers,
      activeTasks,
      completedTasks,
      upcomingMeetings,
      pendingApprovals,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.meeting.count({
        where: {
          scheduledAt: { gte: new Date() },
        },
      }),
      prisma.approvalRequest.count({
        where: { status: 'PENDING' },
      }),
      prisma.opportunity.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    const dashboard = {
      totalCustomers,
      activeTasks,
      completedTasks,
      upcomingMeetings,
      pendingApprovals,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      generatedAt: new Date().toISOString(),
    };

    // Step 3: キャッシュに保存 (TTL: 3分)
    await cacheSet(cacheKey, dashboard, 180);

    res.json({ ...dashboard, cached: false });
  } catch (error: any) {
    console.error('Error in getDashboard:', error);
    res.status(500).json({ error: error.message });
  }
};
```

---

## キャッシュ無効化戦略

### パターン1: 個別キャッシュ削除

```typescript
// ユーザー更新時
await cacheDel(`user:${id}`);
```

### パターン2: パターンマッチング削除

```typescript
// 顧客が作成/更新/削除された時、すべての一覧キャッシュを削除
await cacheDelPattern(`customers:list:*`);
```

### パターン3: 関連キャッシュの連鎖削除

```typescript
// タスク完了時
await cacheDel(`tasks:user:${userId}:status:PENDING`);
await cacheDel(`tasks:user:${userId}:status:COMPLETED`);
await cacheDel(`analytics:dashboard:${userId}`); // ダッシュボードも更新
```

### パターン4: イベント駆動の無効化

Kafkaイベントを受信したときにキャッシュを無効化:

```typescript
// Customer Service - ユーザー作成イベント受信
consumer.on('message', async (message) => {
  const event = JSON.parse(message.value);

  if (event.eventType === 'USER_CREATED') {
    // 新しいユーザーの顧客を自動作成
    const customer = await prisma.customer.create({
      data: {
        name: event.data.name,
        email: event.data.email,
        userId: event.data.id,
      },
    });

    // 🔄 関連キャッシュ無効化
    await cacheDelPattern(`customers:list:*`);
    await cacheDel(`customers:count`);
  }
});
```

---

## パフォーマンス測定

### キャッシュヒット率の追跡

```typescript
let cacheHits = 0;
let cacheMisses = 0;

export const getCacheStats = (req: Request, res: Response) => {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;

  res.json({
    hits: cacheHits,
    misses: cacheMisses,
    total,
    hitRate: `${hitRate.toFixed(2)}%`,
  });
};
```

### ログ出力

```typescript
console.log(`✅ Cache HIT: ${cacheKey} (saved ${executionTime}ms)`);
console.log(`❌ Cache MISS: ${cacheKey} (query took ${executionTime}ms)`);
```

---

## ベストプラクティス

### 1. キャッシュキーの命名規則

```
{service}:{resource}:{id}:{qualifier}

例:
- auth:user:cm123:profile
- customer:list:page:1:filter:tech
- analytics:dashboard:user:cm456
```

### 2. エラーハンドリング

```typescript
// Redisがダウンしていても動作を継続
const cached = await cacheGet<User>(`user:${id}`);
if (cached) {
  return res.json(cached);
}
// Redisがnullを返してもDBクエリに進む
```

### 3. キャッシュウォーミング

```typescript
// サーバー起動時によく使われるデータをプリロード
const warmCache = async () => {
  const topCustomers = await prisma.customer.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  for (const customer of topCustomers) {
    await cacheSet(`customer:${customer.id}`, customer, 600);
  }

  console.log(`✅ Cache warmed: ${topCustomers.length} customers`);
};
```

---

## 次のステップ

1. ✅ Redis設定ファイル作成完了
2. ⏳ 各サービスの `server.ts` に `initRedis()` を追加
3. ⏳ コントローラーにキャッシングロジックを実装
4. ⏳ Render に Redis インスタンスを作成
5. ⏳ 環境変数 `REDIS_URL` を設定
6. ⏳ パフォーマンステスト実施

---

## トラブルシューティング

### 問題1: Redis接続エラー

```
❌ Redis Client Error: connect ECONNREFUSED
```

**解決策**: `REDIS_URL` 環境変数を確認

### 問題2: キャッシュがヒットしない

```
❌ Cache MISS が連続で発生
```

**解決策**:
1. キャッシュキーのタイポを確認
2. TTLが短すぎないか確認
3. キャッシュが正しく保存されているか確認

### 問題3: メモリ不足

```
⚠️  Redis memory limit exceeded
```

**解決策**:
1. TTLを短縮
2. キャッシュするデータを減らす
3. Render の Redis プランをアップグレード（Free → Standard $10/月）

---

## 参考リンク

- [Redis Node.js Client Documentation](https://github.com/redis/node-redis)
- [Render Redis Documentation](https://render.com/docs/redis)
- [Caching Best Practices](https://redis.io/docs/manual/patterns/)
