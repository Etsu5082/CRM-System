import { Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthRequest } from '../types';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    req.user = response.data;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
