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
    ],

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // リリース追跡
    release: process.env.RENDER_GIT_COMMIT || 'dev',

    // サービス名
    serverName: 'analytics-service',

    // エラーフィルタリング
    beforeSend(event, hint) {
      // 特定のエラーを無視
      if (event.exception) {
        const error = hint.originalException as Error;
        if (error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('ECONNRESET')) {
          return null; // 接続エラーは無視
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized');
};

export default Sentry;
