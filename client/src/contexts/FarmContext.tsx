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

const FARM_SELECTION_KEY = 'kukuhub_selected_farm_id';

export function FarmProvider({ children }: FarmProviderProps) {
  const { user, isAuthenticated } = useAuth();
  // Don't hydrate from localStorage on initial load to prevent unauthorized access
  // The useEffect will restore it after role validation
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wrapper for setActiveFarmId that persists to localStorage
  const setActiveFarmIdWithPersistence = (farmId: string | null) => {
    setActiveFarmId(farmId);
    if (typeof window !== 'undefined') {
      if (farmId) {
        localStorage.setItem(FARM_SELECTION_KEY, farmId);
      } else {
        localStorage.removeItem(FARM_SELECTION_KEY);
      }
    }
  };

  // Fetch farms for admin users or user's farm for non-admin users
  const { data: farms = [], isLoading } = useQuery<Farm[]>({
    queryKey: ['/api/farms'],
    enabled: isAuthenticated && !!user,
  });

  // Automatically set active farm based on user role
  useEffect(() => {
    if (!user || !isAuthenticated) {
      setActiveFarmIdWithPersistence(null);
      setError(null);
      return;
    }

    if (user.role === 'admin') {
      // Admin users: restore from localStorage or auto-select
      if (!activeFarmId && farms.length > 0) {
        // Try to restore last selected farm from localStorage
        const savedFarmId = typeof window !== 'undefined' ? localStorage.getItem(FARM_SELECTION_KEY) : null;
        
        // Validate saved farm exists in current farm list
        if (savedFarmId && farms.some(f => f.id === savedFarmId)) {
          setActiveFarmIdWithPersistence(savedFarmId);
          setError(null);
        } else {
          // No valid saved farm, prefer Demo Farm or first farm
          const demoFarm = farms.find(f => f.name.includes('Demo Farm'));
          const selectedFarm = demoFarm || farms[0];
          setActiveFarmIdWithPersistence(selectedFarm.id);
          setError(null);
        }
      } else if (activeFarmId && !farms.some(farm => farm.id === activeFarmId)) {
        // Selected farm no longer exists (e.g., deleted), reset to Demo Farm or first farm
        if (farms.length > 0) {
          const demoFarm = farms.find(f => f.name.includes('Demo Farm'));
          const selectedFarm = demoFarm || farms[0];
          setActiveFarmIdWithPersistence(selectedFarm.id);
        } else {
          setActiveFarmIdWithPersistence(null);
        }
        setError(null);
      }
    } else if (user.role === 'customer') {
      // Customer users: no farm needed, clear any persisted farm
      setActiveFarmIdWithPersistence(null);
      setError(null);
    } else {
      // Non-admin farm users: use their assigned farmId
      if (user.farmId) {
        setActiveFarmIdWithPersistence(user.farmId);
        setError(null);
      } else {
        setError('You are not associated with any farm. Please contact an administrator.');
        setActiveFarmIdWithPersistence(null);
      }
    }
    // Note: activeFarmId intentionally NOT in dependency array to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated, farms]);

  const hasActiveFarm = !!activeFarmId || user?.role === 'customer';

  const contextValue: FarmContextValue = {
    activeFarmId,
    setActiveFarmId: setActiveFarmIdWithPersistence,
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