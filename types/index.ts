// User types
export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'COMPLIANCE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Customer types
export type InvestmentProfile = 'conservative' | 'moderate' | 'aggressive';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  investmentProfile: InvestmentProfile;
  riskTolerance: number;
  investmentExperience?: string;
  assignedSalesId: string;
  createdAt: string;
  updatedAt: string;
}