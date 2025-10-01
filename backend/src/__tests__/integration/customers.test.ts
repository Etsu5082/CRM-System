import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/auth';
import customersRouter from '../../routes/customers';
import prisma from '../../utils/prisma';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);

describe('Customer API Integration Tests', () => {
  let adminToken: string;
  let testCustomerId: string;

  beforeAll(async () => {
    await prisma.customer.deleteMany({ where: { email: { contains: 'customer-api-test' } } });
    await prisma.auditLog.deleteMany({ where: { user: { email: { contains: 'customer-api-test' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'customer-api-test' } } });

    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin-customer-api-test@example.com',
        password: 'Admin123!@#',
        name: 'Admin Test',
        role: 'ADMIN',
      });
    adminToken = adminResponse.body.token || adminResponse.body.data?.token;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email: { contains: 'customer-api-test' } } });
    await prisma.auditLog.deleteMany({ where: { user: { email: { contains: 'customer-api-test' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'customer-api-test' } } });
    await prisma.$disconnect();
  });

  it('POST /api/customers - should create a customer', async () => {
    const response = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Customer',
        email: 'test-customer-api-test1@example.com',
        phone: '080-1234-5678',
        investmentProfile: 'moderate',
        riskTolerance: 5,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Test Customer');
    testCustomerId = response.body.data.id;
  });

  it('POST /api/customers - should fail without auth', async () => {
    const response = await request(app)
      .post('/api/customers')
      .send({ name: 'Test', email: 'test2@test.com', investmentProfile: 'moderate', riskTolerance: 5 });

    expect(response.status).toBe(401);
  });

  it('GET /api/customers - should get customers', async () => {
    const response = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/customers/:id - should get specific customer', async () => {
    const response = await request(app)
      .get(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(testCustomerId);
  });

  it('PUT /api/customers/:id - should update customer', async () => {
    const response = await request(app)
      .put(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Name');
  });

  it('DELETE /api/customers/:id - should delete customer', async () => {
    const createRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Delete Test',
        email: 'delete-customer-api-test@example.com',
        investmentProfile: 'aggressive',
        riskTolerance: 8,
      });

    const deleteRes = await request(app)
      .delete(`/api/customers/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
  });
});
