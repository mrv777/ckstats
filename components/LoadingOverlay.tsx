'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

const LoadingOverlay: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    // Listen for route changes
    const handleRouteChange = () => {
      handleStart();
      // Simulate a delay to show the loading overlay
      setTimeout(handleComplete, 500);
    };

    handleRouteChange(); // Initial load

    return () => {
      // Clean up
    };
  }, [pathname, searchParams]);

  // Show loading overlay if there's a route change, fetching, or mutation in progress
  if (!isLoading && isFetching === 0 && isMutating === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
    </div>
  );
};

export default LoadingOverlay;