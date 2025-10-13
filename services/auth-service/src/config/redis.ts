import { createClient, RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

export const initRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.log('ℹ️  Redis disabled (no REDIS_URL)');
    return null;
  }

  try {
    redis = createClient({
      url: process.env.REDIS_URL,
    });

    redis.on('error', (err) => console.error('❌ Redis Client Error:', err));

    await redis.connect();
    console.log('✅ Redis connected');
    return redis;
  } catch (error: any) {
    console.warn('⚠️  Redis connection failed, continuing without cache:', error.message);
    redis = null;
    return null;
  }
};

export const disconnectRedis = async () => {
  if (redis) {
    await redis.disconnect();
    console.log('✅ Redis disconnected');
  }
};

export const getRedis = (): RedisClientType | null => redis;

// Cache helper functions
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<boolean> => {
  if (!redis) return false;

  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

export const cacheDel = async (key: string): Promise<boolean> => {
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

export const cacheDelPattern = async (pattern: string): Promise<number> => {
  if (!redis) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(keys);
  } catch (error) {
    console.error('Redis DEL pattern error:', error);
    return 0;
  }
};

export default redis;
