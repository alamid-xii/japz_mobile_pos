// types/auth.ts
export type UserRole = 'admin' | 'cashier' | 'kitchen' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  station?: string;
  pin?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}