import { useGetChannelDonations, useGetUserProfile } from '../hooks/useQueries';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart } from 'lucide-react';

interface DonationsFeedProps {
  channelId: string;
}

export default function DonationsFeed({ channelId }: DonationsFeedProps) {
  const { data: donations = [], isLoading } = useGetChannelDonations(channelId);

  const sortedDonations = [...donations]
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            Recent Donations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedDonations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            Recent Donations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No donations yet. Be the first to support this channel!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          Recent Donations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedDonations.map((donation) => (
            <DonationItem key={donation.id} donation={donation} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DonationItem({ donation }: { donation: any }) {
  const { data: profile } = useGetUserProfile(donation.donor);

  return (
    <div className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src="/assets/generated/default-avatar.dim_100x100.png" />
        <AvatarFallback>{profile?.name?.[0] || 'A'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{profile?.name || 'Anonymous'}</span>
          <span className="text-accent font-bold">${Number(donation.amountUsd)}</span>
        </div>
        {donation.message && (
          <p className="text-sm text-muted-foreground mb-1">{donation.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(Number(donation.timestamp) / 1000000), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
