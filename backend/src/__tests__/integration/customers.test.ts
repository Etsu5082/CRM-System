import request from 'supertest';
import express from 'express';
import customerRoutes from '../../routes/customers';
import authRoutes from '../../routes/auth';
import prisma from '../../utils/prisma';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

describe('Customer API', () => {
  let adminToken: string;
  let salesToken: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.customer.deleteMany({
      where: {
        email: {
          contains: 'testcustomer',
        },
      },
    });

    // Create test users and get tokens
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin-customer-test@example.com',
        password: 'Admin123!@#',
        name: 'Admin Test',
        role: 'ADMIN',
      });
    adminToken = adminResponse.body.data.token;

    const salesResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'sales-customer-test@example.com',
        password: 'Sales123!@#',
        name: 'Sales Test',
        role: 'SALES',
      });
    salesToken = salesResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up
    await prisma.customer.deleteMany({
      where: {
        email: {
          contains: 'testcustomer',
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin-customer-test@example.com', 'sales-customer-test@example.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Customer 1',
          email: 'testcustomer1@example.com',
          phone: '080-1234-5678',
        });

      expect([200, 201]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body.data.name).toBe('Test Customer 1');
        expect(response.body.data.email).toBe('testcustomer1@example.com');
        testCustomerId = response.body.data.id;
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send({
          name: 'Test Customer',
          email: 'test@example.com',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Customer',
          email: 'testcustomer1@example.com',
          phone: '080-1234-5678',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/customers', () => {
    it('should get list of customers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/customers?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/customers?search=Test Customer')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/customers');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should get a specific customer', async () => {
      if (!testCustomerId) {
        // Skip test if customer wasn't created
        return;
      }

      const response = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testCustomerId);
      expect(response.body.data.name).toBe('Test Customer 1');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .get('/api/customers/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update a customer', async () => {
      if (!testCustomerId) {
        // Skip test if customer wasn't created
        return;
      }

      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Customer Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Customer Name');
    });

    it('should fail to update with invalid data', async () => {
      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          riskTolerance: 15, // Invalid: should be 1-10
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should soft delete a customer (ADMIN only)', async () => {
      const response = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should fail to delete without ADMIN role', async () => {
      // Create a new customer for this test
      const createResponse = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Customer to Delete',
          email: 'testcustomer-delete@example.com',
          phone: '080-9999-9999',
        });
      const customerId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .delete('/api/customers/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
