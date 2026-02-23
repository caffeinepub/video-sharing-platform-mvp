import { Outlet } from '@tanstack/react-router';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Layout() {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
