import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  await redis.connect();
  console.log('✅ Redis connected');
};

export const disconnectRedis = async () => {
  await redis.disconnect();
  console.log('✅ Redis disconnected');
};

export default redis;
