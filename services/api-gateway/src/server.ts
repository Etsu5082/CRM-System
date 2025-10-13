import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - trust first proxy (Render's load balancer)
app.set('trust proxy', 1);

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
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  validate: { trustProxy: false },
});
app.use('/api/', limiter);

// Authentication middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const response = await axios.get(`${AUTH_SERVICE}/auth/me`, {
      headers: { Authorization: token },
      timeout: 10000,
    });
    (req as any).user = response.data;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Generic proxy function
const proxyRequest = async (
  req: express.Request,
  res: express.Response,
  targetUrl: string,
  pathPrefix: string
) => {
  try {
    const path = req.path.replace(pathPrefix, '');
    const url = `${targetUrl}${path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    console.log(`[Proxy] ${req.method} ${req.path} -> ${url}`);

    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header
      },
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
    });

    console.log(`[Proxy] ${req.method} ${req.path} <- ${response.status}`);

    // Forward response
    res.status(response.status);
    Object.keys(response.headers).forEach(key => {
      res.setHeader(key, response.headers[key]);
    });
    res.send(response.data);
  } catch (error: any) {
    console.error(`[Proxy Error] ${req.method} ${req.path}:`, error.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: error.message,
      });
    }
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (req, res) => {
  try {
    await Promise.all([
      axios.get(`${AUTH_SERVICE}/health`, { timeout: 5000 }),
      axios.get(`${CUSTOMER_SERVICE}/health`, { timeout: 5000 }),
      axios.get(`${SALES_ACTIVITY_SERVICE}/health`, { timeout: 5000 }),
      axios.get(`${OPPORTUNITY_SERVICE}/health`, { timeout: 5000 }),
      axios.get(`${ANALYTICS_SERVICE}/health`, { timeout: 5000 }),
    ]);
    res.json({ status: 'ready', service: 'api-gateway' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'One or more services are unavailable' });
  }
});

// Auth Service routes (public)
app.post('/api/auth/register', (req, res) => proxyRequest(req, res, AUTH_SERVICE, '/api'));
app.post('/api/auth/login', (req, res) => proxyRequest(req, res, AUTH_SERVICE, '/api'));

// Auth Service routes (protected)
app.use('/api/auth', authenticate, (req, res) => proxyRequest(req, res, AUTH_SERVICE, '/api'));

// Customer Service
app.use('/api/customers', authenticate, (req, res) => proxyRequest(req, res, CUSTOMER_SERVICE, '/api'));

// Sales Activity Service
app.use('/api/meetings', authenticate, (req, res) => proxyRequest(req, res, SALES_ACTIVITY_SERVICE, '/api'));
app.use('/api/tasks', authenticate, (req, res) => proxyRequest(req, res, SALES_ACTIVITY_SERVICE, '/api'));

// Opportunity Service
app.use('/api/approvals', authenticate, (req, res) => proxyRequest(req, res, OPPORTUNITY_SERVICE, '/api'));

// Analytics Service
app.use('/api/reports', authenticate, (req, res) => proxyRequest(req, res, ANALYTICS_SERVICE, '/api'));
app.use('/api/notifications', authenticate, (req, res) => proxyRequest(req, res, ANALYTICS_SERVICE, '/api'));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log('📡 Proxying to:');
  console.log(`   - Auth Service: ${AUTH_SERVICE}`);
  console.log(`   - Customer Service: ${CUSTOMER_SERVICE}`);
  console.log(`   - Sales Activity Service: ${SALES_ACTIVITY_SERVICE}`);
  console.log(`   - Opportunity Service: ${OPPORTUNITY_SERVICE}`);
  console.log(`   - Analytics Service: ${ANALYTICS_SERVICE}`);
});
