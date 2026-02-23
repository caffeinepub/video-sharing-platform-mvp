import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

export default function SubscriptionsPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">My Subscriptions</h1>
          <p className="text-muted-foreground">Please login to view your subscriptions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
        <p className="text-muted-foreground">Manage your channel memberships</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Active Subscriptions
          </CardTitle>
          <CardDescription>Your current channel memberships</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No active subscriptions yet. Subscribe to channels to support creators and unlock exclusive content!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
