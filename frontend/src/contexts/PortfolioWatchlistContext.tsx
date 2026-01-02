'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface PortfolioWatchlistContextType {
  refreshWatchlist: () => void;
  refreshPortfolio: () => void;
  watchlistVersion: number;
  portfolioVersion: number;
}

const PortfolioWatchlistContext = createContext<PortfolioWatchlistContextType | undefined>(undefined);

export function PortfolioWatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistVersion, setWatchlistVersion] = useState(0);
  const [portfolioVersion, setPortfolioVersion] = useState(0);

  useEffect(() => {
    // Listen for custom events
    const handleWatchlistChange = () => {
      setWatchlistVersion(prev => prev + 1);
    };

    const handlePortfolioChange = () => {
      setPortfolioVersion(prev => prev + 1);
    };

    window.addEventListener('watchlist-changed', handleWatchlistChange);
    window.addEventListener('portfolio-changed', handlePortfolioChange);

    return () => {
      window.removeEventListener('watchlist-changed', handleWatchlistChange);
      window.removeEventListener('portfolio-changed', handlePortfolioChange);
    };
  }, []);

  const refreshWatchlist = () => {
    window.dispatchEvent(new Event('watchlist-changed'));
  };

  const refreshPortfolio = () => {
    window.dispatchEvent(new Event('portfolio-changed'));
  };

  return (
    <PortfolioWatchlistContext.Provider
      value={{
        refreshWatchlist,
        refreshPortfolio,
        watchlistVersion,
        portfolioVersion,
      }}
    >
      {children}
    </PortfolioWatchlistContext.Provider>
  );
}

export function usePortfolioWatchlist() {
  const context = useContext(PortfolioWatchlistContext);
  if (context === undefined) {
    throw new Error('usePortfolioWatchlist must be used within a PortfolioWatchlistProvider');
  }
  return context;
}



