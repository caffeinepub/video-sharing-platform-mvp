import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  useGetChannel,
  useGetChannelMembershipTiers,
  useCreateMembershipTier,
  useUpdateMembershipTier,
  useDeleteMembershipTier,
  useGetUserStripeAccounts,
  useGetChannelStripeConnection,
  useConnectChannelToStripeAccount,
} from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2, BarChart3, GraduationCap, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import type { MembershipTier, ChannelStripeConnection } from '../backend';

export default function ChannelSettingsPage() {
  const { channelId } = useParams({ from: '/channel/$channelId/settings' });
  const { identity } = useAuth();
  const navigate = useNavigate();

  const { data: channel, isLoading: channelLoading } = useGetChannel(channelId);
  const { data: tiers = [], isLoading: tiersLoading } = useGetChannelMembershipTiers(channelId);
  const { data: stripeAccounts = [] } = useGetUserStripeAccounts();
  const { data: channelStripeConnection } = useGetChannelStripeConnection(channelId);
  const connectChannelToStripe = useConnectChannelToStripeAccount();
  const createTier = useCreateMembershipTier();
  const updateTier = useUpdateMembershipTier();
  const deleteTier = useDeleteMembershipTier();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    priceUsd: '',
    tierLevel: '',
    description: '',
  });
  const [selectedStripeAccountId, setSelectedStripeAccountId] = useState<string>(
    channelStripeConnection?.stripeAccountId || ''
  );

  const isOwner = identity && channel && channel.principal.toString() === identity.getPrincipal().toString();

  if (channelLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!channel || !isOwner) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleCreateTier = async () => {
    if (!formData.name.trim() || !formData.priceUsd || !formData.tierLevel) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const newTier: MembershipTier = {
        id: `tier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId,
        name: formData.name.trim(),
        priceUsd: BigInt(Math.round(parseFloat(formData.priceUsd) * 100)) / BigInt(100),
        tierLevel: BigInt(formData.tierLevel),
        description: formData.description.trim(),
      };

      await createTier.mutateAsync(newTier);
      toast.success('Membership tier created');
      setShowCreateDialog(false);
      setFormData({ name: '', priceUsd: '', tierLevel: '', description: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tier');
    }
  };

  const handleUpdateTier = async () => {
    if (!editingTier || !formData.name.trim() || !formData.priceUsd || !formData.tierLevel) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const updatedTier: MembershipTier = {
        ...editingTier,
        name: formData.name.trim(),
        priceUsd: BigInt(Math.round(parseFloat(formData.priceUsd) * 100)) / BigInt(100),
        tierLevel: BigInt(formData.tierLevel),
        description: formData.description.trim(),
      };

      await updateTier.mutateAsync({ tierId: editingTier.id, tier: updatedTier });
      toast.success('Membership tier updated');
      setEditingTier(null);
      setFormData({ name: '', priceUsd: '', tierLevel: '', description: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tier');
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    try {
      await deleteTier.mutateAsync({ tierId, channelId });
      toast.success('Membership tier deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tier');
    }
  };

  const openEditDialog = (tier: MembershipTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      priceUsd: Number(tier.priceUsd).toString(),
      tierLevel: Number(tier.tierLevel).toString(),
      description: tier.description,
    });
  };

  const handleStripeAccountChange = async (accountId: string) => {
    setSelectedStripeAccountId(accountId);
    if (!accountId) return;

    try {
      const connection: ChannelStripeConnection = {
        channelId,
        stripeAccountId: accountId,
      };
      await connectChannelToStripe.mutateAsync(connection);
      toast.success('Stripe account connected to channel');
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Stripe account');
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Channel Settings</h1>
        <p className="text-muted-foreground">{channel.name}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your channel content and analytics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/channel/$channelId/courses/manage" params={{ channelId }}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Manage Courses
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/channel/$channelId/analytics" params={{ channelId }}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Connect a Stripe account to accept payments for subscriptions, courses, and donations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stripeAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No Stripe accounts available. Add a Stripe account in your profile settings first.
                </p>
                <Button asChild variant="outline">
                  <Link to="/settings/profile">
                    Go to Profile Settings
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="stripe-account">Select Stripe Account</Label>
                  <Select
                    value={selectedStripeAccountId}
                    onValueChange={handleStripeAccountChange}
                  >
                    <SelectTrigger id="stripe-account">
                      <SelectValue placeholder="Choose a Stripe account" />
                    </SelectTrigger>
                    <SelectContent>
                      {stripeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All payments for this channel (subscriptions, courses, donations) will be processed through the selected Stripe account
                  </p>
                </div>
                {connectChannelToStripe.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Membership Tiers</CardTitle>
                <CardDescription>Create and manage subscription tiers for your channel</CardDescription>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Membership Tier</DialogTitle>
                    <DialogDescription>
                      Add a new subscription tier for your channel
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Tier Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Bronze, Silver, Gold"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="price">Monthly Price (USD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="9.99"
                        value={formData.priceUsd}
                        onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="level">Tier Level</Label>
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.tierLevel}
                        onChange={(e) => setFormData({ ...formData, tierLevel: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher levels grant access to lower tier content
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the benefits of this tier..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateTier} disabled={createTier.isPending}>
                      {createTier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Tier
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {tiersLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse h-20 bg-muted rounded" />
                ))}
              </div>
            ) : tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No membership tiers yet. Create one to start accepting subscriptions.
              </p>
            ) : (
              <div className="space-y-4">
                {tiers.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{tier.name}</h3>
                        <span className="text-sm text-muted-foreground">Level {Number(tier.tierLevel)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{tier.description}</p>
                      <p className="text-sm font-medium">${Number(tier.priceUsd)}/month</p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={editingTier?.id === tier.id} onOpenChange={(open) => !open && setEditingTier(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(tier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Membership Tier</DialogTitle>
                            <DialogDescription>
                              Update the details of this subscription tier
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-name">Tier Name</Label>
                              <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-price">Monthly Price (USD)</Label>
                              <Input
                                id="edit-price"
                                type="number"
                                step="0.01"
                                min="1"
                                value={formData.priceUsd}
                                onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-level">Tier Level</Label>
                              <Input
                                id="edit-level"
                                type="number"
                                min="1"
                                value={formData.tierLevel}
                                onChange={(e) => setFormData({ ...formData, tierLevel: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateTier} disabled={updateTier.isPending}>
                              {updateTier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Update Tier
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Membership Tier</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this tier? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTier(tier.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
