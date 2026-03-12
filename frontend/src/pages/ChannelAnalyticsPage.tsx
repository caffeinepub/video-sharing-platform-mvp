import { useParams } from '@tanstack/react-router';
import { useGetChannel, useGetChannelMembershipTiers, useGetChannelDonations } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';

export default function ChannelAnalyticsPage() {
  const { channelId } = useParams({ from: '/channel/$channelId/analytics' });
  const { identity } = useAuth();
  const { data: channel, isLoading: channelLoading } = useGetChannel(channelId);
  const { data: tiers = [] } = useGetChannelMembershipTiers(channelId);
  const { data: donations = [] } = useGetChannelDonations(channelId);

  const isOwner = identity && channel && channel.principal.toString() === identity.getPrincipal().toString();

  if (channelLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
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

  const totalDonations = donations.reduce((sum, donation) => sum + Number(donation.amountUsd), 0);
  const donationCount = donations.length;

  // Calculate subscription metrics (placeholder - would need actual subscription data)
  const totalSubscribers = 0; // Would come from backend
  const monthlyRevenue = tiers.reduce((sum, tier) => {
    // This is a placeholder calculation
    return sum + Number(tier.priceUsd) * 0; // Multiply by actual subscriber count per tier
  }, 0);

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Channel Analytics</h1>
        <p className="text-muted-foreground">{channel.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">Active memberships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDonations.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{donationCount} donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership Tiers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tiers.length}</div>
            <p className="text-xs text-muted-foreground">Active tiers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Breakdown</CardTitle>
            <CardDescription>Subscribers by membership tier</CardDescription>
          </CardHeader>
          <CardContent>
            {tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No membership tiers created yet
              </p>
            ) : (
              <div className="space-y-4">
                {tiers.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tier.name}</p>
                      <p className="text-sm text-muted-foreground">${Number(tier.priceUsd)}/month</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">0</p>
                      <p className="text-xs text-muted-foreground">subscribers</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Donations</CardTitle>
            <CardDescription>Latest supporter contributions</CardDescription>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No donations received yet
              </p>
            ) : (
              <div className="space-y-4">
                {donations.slice(0, 5).map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(Number(donation.timestamp) / 1000000).toLocaleDateString()}
                      </p>
                      {donation.message && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{donation.message}</p>
                      )}
                    </div>
                    <p className="font-bold text-accent">${Number(donation.amountUsd)}</p>
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
