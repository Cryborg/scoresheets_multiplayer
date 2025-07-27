import { useState, useEffect } from 'react';

interface DashboardFilters {
  categoryFilter: string;
  multiplayerFilter: string;
  playerCountFilter: string;
}

const DEFAULT_FILTERS: DashboardFilters = {
  categoryFilter: 'all',
  multiplayerFilter: 'all',
  playerCountFilter: 'all'
};

const STORAGE_KEY = 'dashboard-filters';

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [initialized, setInitialized] = useState(false);

  // Load filters from localStorage on mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters({ ...DEFAULT_FILTERS, ...parsedFilters });
      }
    } catch (error) {
      console.warn('Error loading dashboard filters from localStorage:', error);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Save filters to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (initialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.warn('Error saving dashboard filters to localStorage:', error);
      }
    }
  }, [filters, initialized]);

  // Individual setters for each filter
  const setCategoryFilter = (value: string) => {
    setFilters(prev => ({ ...prev, categoryFilter: value }));
  };

  const setMultiplayerFilter = (value: string) => {
    setFilters(prev => ({ ...prev, multiplayerFilter: value }));
  };

  const setPlayerCountFilter = (value: string) => {
    setFilters(prev => ({ ...prev, playerCountFilter: value }));
  };

  // Reset all filters to defaults
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    // Filter values
    categoryFilter: filters.categoryFilter,
    multiplayerFilter: filters.multiplayerFilter,
    playerCountFilter: filters.playerCountFilter,
    
    // Setters
    setCategoryFilter,
    setMultiplayerFilter,
    setPlayerCountFilter,
    resetFilters,
    
    // State
    initialized
  };
}