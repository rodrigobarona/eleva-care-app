import type { UserRoles } from '@/lib/auth/roles';

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
  role: UserRoles;
}

export interface UpdateRoleRequest {
  userId: string;
  roles: UserRoles;
}
