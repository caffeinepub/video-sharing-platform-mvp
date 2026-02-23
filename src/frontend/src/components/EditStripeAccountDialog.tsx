import { useState, useEffect } from 'react';
import { useCreateStripeAccount, useUpdateStripeAccount } from '../hooks/useQueries';
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { StripeAccount } from '../backend';

interface EditStripeAccountDialogProps {
  existingAccount?: StripeAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditStripeAccountDialog({ existingAccount, open, onOpenChange }: EditStripeAccountDialogProps) {
  const { identity } = useAuth();
  const createAccount = useCreateStripeAccount();
  const updateAccount = useUpdateStripeAccount();

  const [formData, setFormData] = useState({
    accountName: '',
    secretKey: '',
    connectId: '',
    payoutSettings: '',
  });
  const [showSecretKey, setShowSecretKey] = useState(false);

  const isEditMode = !!existingAccount;

  useEffect(() => {
    if (existingAccount) {
      setFormData({
        accountName: existingAccount.accountName,
        secretKey: existingAccount.secretKey,
        connectId: existingAccount.connectId || '',
        payoutSettings: existingAccount.payoutSettings || '',
      });
    } else if (!isEditMode) {
      setFormData({
        accountName: '',
        secretKey: '',
        connectId: '',
        payoutSettings: '',
      });
    }
  }, [existingAccount, isEditMode]);

  const handleSubmit = async () => {
    if (!formData.accountName.trim()) {
      toast.error('Please enter an account name');
      return;
    }

    if (!formData.secretKey.trim()) {
      toast.error('Please enter a Stripe secret key');
      return;
    }

    if (!identity) {
      toast.error('Authentication required');
      return;
    }

    try {
      const accountData: StripeAccount = {
        id: isEditMode && existingAccount ? existingAccount.id : `stripe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        owner: identity.getPrincipal(),
        accountName: formData.accountName.trim(),
        secretKey: formData.secretKey.trim(),
        connectId: formData.connectId.trim() || undefined,
        payoutSettings: formData.payoutSettings.trim() || undefined,
      };

      if (isEditMode && existingAccount) {
        await updateAccount.mutateAsync({ accountId: existingAccount.id, account: accountData });
        toast.success('Stripe account updated');
      } else {
        await createAccount.mutateAsync(accountData);
        toast.success('Stripe account created');
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} Stripe account`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Stripe Account</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your Stripe account configuration'
              : 'Add a new Stripe account for payment processing'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              placeholder="e.g., Main Business Account"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this Stripe account
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="secretKey">Stripe Secret Key *</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecretKey ? 'text' : 'password'}
                placeholder="sk_live_..."
                value={formData.secretKey}
                onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Stripe API secret key (starts with sk_)
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="connectId">Stripe Connect Account ID (optional)</Label>
            <Input
              id="connectId"
              placeholder="acct_..."
              value={formData.connectId}
              onChange={(e) => setFormData({ ...formData, connectId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Your Stripe Connect account ID for advanced integrations
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payoutSettings">Payout Settings (optional, JSON)</Label>
            <Textarea
              id="payoutSettings"
              placeholder='{"schedule": "daily", "threshold": 100}'
              value={formData.payoutSettings}
              onChange={(e) => setFormData({ ...formData, payoutSettings: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Configure payout preferences in JSON format
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAccount.isPending || updateAccount.isPending}
          >
            {(createAccount.isPending || updateAccount.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode ? 'Update' : 'Create'} Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
