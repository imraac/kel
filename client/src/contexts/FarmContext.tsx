import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface Farm {
  id: string;
  name: string;
  location: string;
  isApproved: boolean;
  status: string;
}

interface FarmContextValue {
  activeFarmId: string | null;
  setActiveFarmId: (farmId: string | null) => void;
  farms: Farm[];
  isLoading: boolean;
  error: string | null;
  hasActiveFarm: boolean;
}

const FarmContext = createContext<FarmContextValue | null>(null);

export function useFarmContext() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarmContext must be used within a FarmProvider');
  }
  return context;
}

interface FarmProviderProps {
  children: React.ReactNode;
}

export function FarmProvider({ children }: FarmProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch farms for admin users or user's farm for non-admin users
  const { data: farms = [], isLoading } = useQuery<Farm[]>({
    queryKey: ['/api/farms'],
    enabled: isAuthenticated && !!user,
  });

  // Automatically set active farm based on user role
  useEffect(() => {
    if (!user || !isAuthenticated) {
      setActiveFarmId(null);
      setError(null);
      return;
    }

    if (user.role === 'admin') {
      // Admin users: require explicit farm selection
      // Keep existing activeFarmId if valid, otherwise require selection
      if (activeFarmId && farms.some(farm => farm.id === activeFarmId)) {
        setError(null);
      } else if (farms.length > 0) {
        setError('Please select a farm to manage');
        setActiveFarmId(null);
      }
    } else if (user.role === 'customer') {
      // Customer users: no farm needed
      setActiveFarmId(null);
      setError(null);
    } else {
      // Non-admin farm users: use their assigned farmId
      if (user.farmId) {
        setActiveFarmId(user.farmId);
        setError(null);
      } else {
        setError('You are not associated with any farm. Please contact an administrator.');
        setActiveFarmId(null);
      }
    }
  }, [user, isAuthenticated, farms, activeFarmId]);

  const hasActiveFarm = !!activeFarmId || user?.role === 'customer';

  const contextValue: FarmContextValue = {
    activeFarmId,
    setActiveFarmId,
    farms,
    isLoading,
    error,
    hasActiveFarm,
  };

  return (
    <FarmContext.Provider value={contextValue}>
      {children}
    </FarmContext.Provider>
  );
}