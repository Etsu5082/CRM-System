import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { publishEvent } from '../config/kafka';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { InvestmentProfile } from '@prisma/client';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  investmentProfile: z.enum(['conservative', 'moderate', 'aggressive']),
  riskTolerance: z.number().min(1).max(10).default(5),
  investmentExperience: z.string().optional(),
  assignedSalesId: z.string(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  investmentProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  riskTolerance: z.number().min(1).max(10).optional(),
  investmentExperience: z.string().optional(),
  assignedSalesId: z.string().optional(),
});

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        ...data,
        investmentProfile: data.investmentProfile as InvestmentProfile,
      },
    });

    // Publish event
    await publishEvent('customer.events', {
      eventId: uuidv4(),
      eventType: 'customer.created',
      timestamp: new Date().toISOString(),
      data: {
        customerId: customer.id,
        email: customer.email,
        assignedSalesId: customer.assignedSalesId,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    if ((error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { assignedSalesId, investmentProfile } = req.query;

    const where: any = {
      deletedAt: null,
    };

    if (assignedSalesId) {
      where.assignedSalesId = assignedSalesId as string;
    }
    if (investmentProfile) {
      where.investmentProfile = investmentProfile as InvestmentProfile;
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCustomerSchema.parse(req.body);

    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...data,
        investmentProfile: data.investmentProfile as InvestmentProfile | undefined,
      },
    });

    // Publish event
    await publishEvent('customer.events', {
      eventId: uuidv4(),
      eventType: 'customer.updated',
      timestamp: new Date().toISOString(),
      data: {
        customerId: customer.id,
        email: customer.email,
        assignedSalesId: customer.assignedSalesId,
      },
    });

    res.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    if ((error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Soft delete
    await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Publish event
    await publishEvent('customer.events', {
      eventId: uuidv4(),
      eventType: 'customer.deleted',
      timestamp: new Date().toISOString(),
      data: {
        customerId: customer.id,
        email: customer.email,
      },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(customers);
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
