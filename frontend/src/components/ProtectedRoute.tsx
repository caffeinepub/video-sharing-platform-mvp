import { useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ children, redirectTo = '/' }: ProtectedRouteProps) {
  const { isAuthenticated, authStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect when auth status is confirmed (not initializing)
    if (authStatus === 'unauthenticated') {
      navigate({ to: redirectTo });
    }
  }, [authStatus, navigate, redirectTo]);

  // Show loading while initializing
  if (authStatus === 'initializing') {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
