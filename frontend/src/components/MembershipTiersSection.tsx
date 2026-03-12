import { useGetChannelMembershipTiers, useHasActiveSubscription, useGetUserSubscriptionTierLevel } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

interface MembershipTiersSectionProps {
  channelId: string;
  onSubscribe: (tierId: string, tierName: string, priceUsd: number) => void;
}

export default function MembershipTiersSection({ channelId, onSubscribe }: MembershipTiersSectionProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: tiers = [], isLoading } = useGetChannelMembershipTiers(channelId);
  const { data: hasSubscription } = useHasActiveSubscription(channelId);
  const { data: userTierLevel } = useGetUserSubscriptionTierLevel(channelId);

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tiers.length === 0) {
    return null;
  }

  const sortedTiers = [...tiers].sort((a, b) => Number(a.tierLevel) - Number(b.tierLevel));

  const handleSubscribeClick = (tierId: string, tierName: string, priceUsd: bigint) => {
    if (!isAuthenticated) {
      toast.error('Please login to subscribe');
      return;
    }
    onSubscribe(tierId, tierName, Number(priceUsd));
  };

  return (
    <div className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Channel Memberships</h2>
        <p className="text-muted-foreground">
          Support this channel and unlock exclusive content
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTiers.map((tier) => {
          const isCurrentTier = userTierLevel !== null && userTierLevel !== undefined && Number(userTierLevel) === Number(tier.tierLevel);
          const hasAccess = userTierLevel !== null && userTierLevel !== undefined && Number(userTierLevel) >= Number(tier.tierLevel);

          return (
            <Card key={tier.id} className={`relative ${isCurrentTier ? 'border-primary shadow-lg' : ''}`}>
              {isCurrentTier && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Crown className="h-3 w-3 mr-1" />
                    Current Tier
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>{tier.name}</CardTitle>
                  <Badge variant="outline">Level {Number(tier.tierLevel)}</Badge>
                </div>
                <CardDescription className="text-2xl font-bold text-foreground">
                  ${Number(tier.priceUsd)}<span className="text-sm font-normal text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {tier.description}
                </p>
              </CardContent>
              <CardFooter>
                {hasAccess ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="mr-2 h-4 w-4" />
                    {isCurrentTier ? 'Current Tier' : 'Access Granted'}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribeClick(tier.id, tier.name, tier.priceUsd)}
                  >
                    Subscribe
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
