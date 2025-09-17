import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { type User } from '@shared/schema';
import WelcomePanel from '@/components/welcome-panel';
import { 
  getRoleDashboardRoute, 
  shouldShowWelcomePanel, 
  markWelcomePanelSeen, 
  clearUserRoleIntent 
} from '@/utils/role-router';

interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  showWelcomePanel: boolean;
  dismissWelcomePanel: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [showWelcomePanel, setShowWelcomePanel] = useState(false);
  const [hasProcessedAuth, setHasProcessedAuth] = useState(false);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const isAuthenticated = !!user;

  // Handle post-authentication flow
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasProcessedAuth) {
      setHasProcessedAuth(true);
      
      // Check if user should see welcome panel
      if (shouldShowWelcomePanel(user)) {
        setShowWelcomePanel(true);
      } else {
        // No welcome panel needed, route directly to dashboard
        const dashboardRoute = getRoleDashboardRoute(user);
        setLocation(dashboardRoute);
      }
    }
  }, [isLoading, isAuthenticated, user, hasProcessedAuth, setLocation]);

  const dismissWelcomePanel = () => {
    setShowWelcomePanel(false);
    markWelcomePanelSeen();
    clearUserRoleIntent();
    
    if (user) {
      const dashboardRoute = getRoleDashboardRoute(user);
      setLocation(dashboardRoute);
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    showWelcomePanel,
    dismissWelcomePanel,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {showWelcomePanel && user && (
        <WelcomePanel onDashboardClick={dismissWelcomePanel} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}