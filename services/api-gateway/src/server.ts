import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3100';
const CUSTOMER_SERVICE = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3101';
const SALES_ACTIVITY_SERVICE = process.env.SALES_ACTIVITY_SERVICE_URL || 'http://localhost:3102';
const OPPORTUNITY_SERVICE = process.env.OPPORTUNITY_SERVICE_URL || 'http://localhost:3103';
const ANALYTICS_SERVICE = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3104';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Authentication middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token with Auth Service
    const response = await axios.get(`${AUTH_SERVICE}/auth/me`, {
      headers: { Authorization: token },
    });

    // Attach user to request
    (req as any).user = response.data;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check if all services are reachable
    await Promise.all([
      axios.get(`${AUTH_SERVICE}/health`),
      axios.get(`${CUSTOMER_SERVICE}/health`),
      axios.get(`${SALES_ACTIVITY_SERVICE}/health`),
      axios.get(`${OPPORTUNITY_SERVICE}/health`),
      axios.get(`${ANALYTICS_SERVICE}/health`),
    ]);
    res.json({ status: 'ready', service: 'api-gateway' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'One or more services are unavailable' });
  }
});

// Proxy configurations
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'warn' as const,
  timeout: 60000, // 60 seconds timeout
  proxyTimeout: 60000, // 60 seconds proxy timeout
  onError: (err: any, req: express.Request, res: express.Response) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Bad Gateway - Service unavailable' });
  },
};

// Auth Service (public routes)
app.use(
  '/api/auth/login',
  createProxyMiddleware({
    target: AUTH_SERVICE,
    pathRewrite: { '^/api/auth': '/auth' },
    ...proxyOptions,
  })
);

app.use(
  '/api/auth/register',
  createProxyMiddleware({
    target: AUTH_SERVICE,
    pathRewrite: { '^/api/auth': '/auth' },
    ...proxyOptions,
  })
);

// Auth Service (protected routes)
app.use(
  '/api/auth',
  authenticate,
  createProxyMiddleware({
    target: AUTH_SERVICE,
    pathRewrite: { '^/api/auth': '/auth' },
    ...proxyOptions,
  })
);

// Customer Service
app.use(
  '/api/customers',
  authenticate,
  createProxyMiddleware({
    target: CUSTOMER_SERVICE,
    pathRewrite: { '^/api/customers': '/customers' },
    ...proxyOptions,
  })
);

// Sales Activity Service
app.use(
  '/api/meetings',
  authenticate,
  createProxyMiddleware({
    target: SALES_ACTIVITY_SERVICE,
    pathRewrite: { '^/api/meetings': '/meetings' },
    ...proxyOptions,
  })
);

app.use(
  '/api/tasks',
  authenticate,
  createProxyMiddleware({
    target: SALES_ACTIVITY_SERVICE,
    pathRewrite: { '^/api/tasks': '/tasks' },
    ...proxyOptions,
  })
);

// Opportunity Service
app.use(
  '/api/approvals',
  authenticate,
  createProxyMiddleware({
    target: OPPORTUNITY_SERVICE,
    pathRewrite: { '^/api/approvals': '/approvals' },
    ...proxyOptions,
  })
);

// Analytics Service
app.use(
  '/api/reports',
  authenticate,
  createProxyMiddleware({
    target: ANALYTICS_SERVICE,
    pathRewrite: { '^/api/reports': '/reports' },
    ...proxyOptions,
  })
);

app.use(
  '/api/notifications',
  authenticate,
  createProxyMiddleware({
    target: ANALYTICS_SERVICE,
    pathRewrite: { '^/api/notifications': '/notifications' },
    ...proxyOptions,
  })
);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying to:`);
  console.log(`   - Auth Service: ${AUTH_SERVICE}`);
  console.log(`   - Customer Service: ${CUSTOMER_SERVICE}`);
  console.log(`   - Sales Activity Service: ${SALES_ACTIVITY_SERVICE}`);
  console.log(`   - Opportunity Service: ${OPPORTUNITY_SERVICE}`);
  console.log(`   - Analytics Service: ${ANALYTICS_SERVICE}`);
});

export default app;
