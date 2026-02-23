import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import type { Identity } from '@icp-sdk/core/agent';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  identity: Identity | undefined;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  isInitializing: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { identity, login, clear, loginStatus, isInitializing: iiInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');

  // Determine if user is authenticated (has identity and not anonymous)
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  // Determine overall initialization status
  const isInitializing = iiInitializing || actorFetching || loginStatus === 'logging-in';

  useEffect(() => {
    // Update auth status based on initialization and authentication state
    if (isInitializing) {
      setAuthStatus('initializing');
    } else if (isAuthenticated) {
      setAuthStatus('authenticated');
    } else {
      setAuthStatus('unauthenticated');
    }
  }, [isInitializing, isAuthenticated]);

  const logout = async () => {
    await clear();
  };

  const value: AuthContextValue = {
    identity,
    isAuthenticated,
    authStatus,
    isInitializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
