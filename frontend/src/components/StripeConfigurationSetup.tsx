import { useEffect, useState } from 'react';
import { useIsStripeConfigured, useSetStripeConfiguration, useIsCallerAdmin } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function StripeConfigurationSetup() {
  const { isAuthenticated } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: isConfigured, isLoading: isConfiguredLoading } = useIsStripeConfigured();
  const setConfiguration = useSetStripeConfiguration();

  const [open, setOpen] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [countries, setCountries] = useState('US, CA, GB');

  useEffect(() => {
    if (isAuthenticated && !isAdminLoading && !isConfiguredLoading && isAdmin && !isConfigured) {
      setOpen(true);
    }
  }, [isAuthenticated, isAdmin, isConfigured, isAdminLoading, isConfiguredLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!secretKey.trim()) {
      toast.error('Please enter your Stripe secret key');
      return;
    }

    const allowedCountries = countries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    if (allowedCountries.length === 0) {
      toast.error('Please enter at least one country code');
      return;
    }

    try {
      await setConfiguration.mutateAsync({
        secretKey: secretKey.trim(),
        allowedCountries,
      });
      toast.success('Stripe configuration saved successfully');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save Stripe configuration');
    }
  };

  if (!isAuthenticated || !isAdmin || isConfigured) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configure Stripe Payments</DialogTitle>
            <DialogDescription>
              Set up Stripe to enable subscriptions and donations on your platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="secretKey">Stripe Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="sk_test_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your Stripe secret key (starts with sk_test_ or sk_live_)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="countries">Allowed Countries</Label>
              <Textarea
                id="countries"
                placeholder="US, CA, GB, AU"
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of country codes (e.g., US, CA, GB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={setConfiguration.isPending}>
              {setConfiguration.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
