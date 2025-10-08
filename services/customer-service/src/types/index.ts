import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: any;
}
