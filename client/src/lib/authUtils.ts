import type { User } from '@shared/schema';
import type { LucideIcon } from 'lucide-react';
import { Shield, Users, UserCheck, User as UserIcon, ShoppingCart } from 'lucide-react';

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * Check if an error represents an unauthorized response
 * @param error - Error of unknown type
 * @returns boolean indicating if error is 401 unauthorized
 */
export const isUnauthorized = (error: unknown): boolean => {
  // Handle Response objects
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as Response).status === 401;
  }
  
  // Handle Axios-like errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    return axiosError.response?.status === 401;
  }
  
  // Handle Error objects with 401 message pattern
  if (error instanceof Error) {
    return /^401: .*Unauthorized/.test(error.message) || error.message.includes('401');
  }
  
  return false;
};

// Define management roles that have administrative privileges
export const MANAGEMENT_ROLES = new Set<User['role']>(['admin', 'farm_owner', 'manager']);

/**
 * Check if a user has management role (admin or manager)
 * @param user - User object to check
 * @returns boolean indicating if user has management privileges
 */
export const hasManagementRole = (user?: User | null): boolean => {
  return !!user && MANAGEMENT_ROLES.has(user.role);
};

/**
 * Check if a user is an admin
 * @param user - User object to check
 * @returns boolean indicating if user is admin
 */
export const isAdmin = (user?: User | null): boolean => {
  return !!user && user.role === 'admin';
};

/**
 * Check if current user can manage another user
 * @param currentUser - The user performing the action
 * @param targetUser - The user being managed
 * @returns boolean indicating if management is allowed
 */
export const canManageUser = (currentUser?: User | null, targetUser?: User | null): boolean => {
  if (!currentUser || !targetUser) return false;
  
  // Admins can manage anyone except other admins
  if (isAdmin(currentUser)) {
    return !isAdmin(targetUser);
  }
  
  // Managers can only manage staff
  if (currentUser.role === 'manager') {
    return targetUser.role === 'staff';
  }
  
  return false;
};

// Role metadata configuration for consistent UI rendering
interface RoleMeta {
  label: string;
  icon: LucideIcon;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  colorClass: string;
  description: string;
}

export const ROLE_META: Record<User['role'], RoleMeta> = {
  admin: {
    label: 'Admin',
    icon: Shield,
    badgeVariant: 'destructive',
    colorClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Full system access and management'
  },
  farm_owner: {
    label: 'Farm Owner', 
    icon: Users,
    badgeVariant: 'default',
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    description: 'Owner of the farm operation'
  },
  manager: {
    label: 'Manager',
    icon: UserCheck,
    badgeVariant: 'secondary',
    colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    description: 'Farm operations management'
  },
  staff: {
    label: 'Staff',
    icon: UserIcon,
    badgeVariant: 'outline',
    colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    description: 'Farm worker and operations'
  },
  customer: {
    label: 'Customer',
    icon: ShoppingCart,
    badgeVariant: 'outline',
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    description: 'Product purchaser'
  }
} as const;

/**
 * Get role metadata for UI rendering
 * @param role - User role
 * @returns Role metadata object
 */
export const getRoleMeta = (role: User['role']): RoleMeta => {
  return ROLE_META[role] || ROLE_META.staff; // Fallback to staff
};