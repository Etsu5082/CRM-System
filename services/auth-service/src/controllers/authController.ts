import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { publishEvent } from '../config/kafka';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES', 'COMPLIANCE']).optional(),
});

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    // Publish login event
    await publishEvent('user.events', {
      eventId: uuidv4(),
      eventType: 'user.login',
      timestamp: new Date().toISOString(),
      data: {
        userId: user.id,
        email: user.email,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: req.ip,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      await publishEvent('user.events', {
        eventId: uuidv4(),
        eventType: 'user.logout',
        timestamp: new Date().toISOString(),
        data: {
          userId: req.user.id,
          email: req.user.email,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          resourceType: 'User',
          resourceId: req.user.id,
          ipAddress: req.ip,
        },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Publish user created event
    await publishEvent('user.events', {
      eventId: uuidv4(),
      eventType: 'user.created',
      timestamp: new Date().toISOString(),
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Create audit log (only if user is authenticated - admin creating user)
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE',
          resourceType: 'User',
          resourceId: user.id,
          ipAddress: req.ip,
        },
      });
    }

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, role } = req.body;
    const userId = req.params.id;

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    // Publish user updated event
    await publishEvent('user.events', {
      eventId: uuidv4(),
      eventType: 'user.updated',
      timestamp: new Date().toISOString(),
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        resourceType: 'User',
        resourceId: userId,
        changes: {
          before: { name: existingUser.name, role: existingUser.role },
          after: { name, role },
        },
        ipAddress: req.ip,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id: userId } });

    // Publish user deleted event
    await publishEvent('user.events', {
      eventId: uuidv4(),
      eventType: 'user.deleted',
      timestamp: new Date().toISOString(),
      data: {
        userId: user.id,
        email: user.email,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        resourceType: 'User',
        resourceId: userId,
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action, resourceType, limit = '100' } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
