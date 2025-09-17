// Role-based routing utility for directing users to appropriate dashboards
import { type User } from '@shared/schema';

export type UserRole = 'admin' | 'farm_owner' | 'manager' | 'staff' | 'customer';

/**
 * Maps user roles to their appropriate dashboard routes
 */
export function getRoleDashboardRoute(user: User): string {
  const { role, farmId } = user;

  switch (role as UserRole) {
    case 'admin':
      return '/'; // Admin gets the main home dashboard with farm selector
    
    case 'farm_owner':
      // Farm owners need a farmId to access their farm dashboard
      if (!farmId) {
        return '/farm-setup'; // Redirect to farm setup if no farm associated
      }
      return '/'; // Home dashboard for their farm
    
    case 'manager':
      // Managers need a farmId to access farm operations
      if (!farmId) {
        return '/farm-setup'; // Redirect to farm setup if no farm associated  
      }
      return '/'; // Home dashboard for their assigned farm
    
    case 'staff':
      // Staff need a farmId to access farm operations
      if (!farmId) {
        return '/farm-setup'; // Redirect to farm setup if no farm associated
      }
      return '/'; // Home dashboard for their assigned farm
    
    case 'customer':
      return '/marketplace'; // Customers go to public marketplace
    
    default:
      return '/'; // Default fallback to home
  }
}

/**
 * Checks if a user role requires a farmId to access dashboards
 */
export function roleRequiresFarm(role: string): boolean {
  return ['farm_owner', 'manager', 'staff'].includes(role);
}

/**
 * Gets user role intent from sessionStorage (set during landing page interaction)
 */
export function getUserRoleIntent(): string | null {
  return sessionStorage.getItem('userRoleIntent');
}

/**
 * Clears user role intent from sessionStorage
 */
export function clearUserRoleIntent(): void {
  sessionStorage.removeItem('userRoleIntent');
}

/**
 * Determines if user should see welcome panel based on role intent or first login
 */
export function shouldShowWelcomePanel(user: User): boolean {
  const roleIntent = getUserRoleIntent();
  const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
  
  // Show welcome panel if:
  // 1. User had role intent (clicked farmer/customer button)
  // 2. User hasn't seen welcome panel in this session
  return Boolean(roleIntent) || !hasSeenWelcome;
}

/**
 * Marks that user has seen the welcome panel
 */
export function markWelcomePanelSeen(): void {
  sessionStorage.setItem('hasSeenWelcome', 'true');
}