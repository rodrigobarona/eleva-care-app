import type { UserRole } from '@/lib/auth/roles';

export interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateRoleRequest {
  userId: string;
  role: UserRole;
}
