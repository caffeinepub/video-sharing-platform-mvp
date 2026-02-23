import { useNavigate, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentFailurePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/payment-failure' }) as { type?: string; channelId?: string };

  const isSubscription = search.type === 'subscription';
  const isDonation = search.type === 'donation';
  const channelId = search.channelId;

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
            <CardDescription>
              {isSubscription && 'Your subscription was not completed'}
              {isDonation && 'Your donation was not processed'}
              {!isSubscription && !isDonation && 'Your payment was cancelled'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No charges were made to your account. You can try again anytime.
              </p>
            </div>
            <div className="space-y-2">
              {channelId && (
                <Button
                  onClick={() => navigate({ to: '/channel/$channelId', params: { channelId } })}
                  className="w-full"
                >
                  Back to Channel
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/' })}
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
