import type { User } from '@shared/schema';

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
export const MANAGEMENT_ROLES = new Set<User['role']>(['admin', 'manager']);

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