import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,

  base: {
    service: 'analytics-service',
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
      'password',
      'token',
      'authorization',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
