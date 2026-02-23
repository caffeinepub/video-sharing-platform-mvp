import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/payment-success' }) as { type?: string; channelId?: string };

  const isSubscription = search.type === 'subscription';
  const isDonation = search.type === 'donation';
  const channelId = search.channelId;

  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              {isSubscription && 'Your subscription has been activated'}
              {isDonation && 'Thank you for your support!'}
              {!isSubscription && !isDonation && 'Your payment was processed successfully'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSubscription && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  You now have access to exclusive member-only content.
                </p>
                {channelId && (
                  <Button
                    onClick={() => navigate({ to: '/channel/$channelId', params: { channelId } })}
                    className="w-full"
                  >
                    Go to Channel
                  </Button>
                )}
              </div>
            )}
            {isDonation && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your donation helps support the creator and their content.
                </p>
                {channelId && (
                  <Button
                    onClick={() => navigate({ to: '/channel/$channelId', params: { channelId } })}
                    className="w-full"
                  >
                    Back to Channel
                  </Button>
                )}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/' })}
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
