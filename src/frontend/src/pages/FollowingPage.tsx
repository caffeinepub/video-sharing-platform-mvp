import { useGetFollowedChannels, useGetChannel } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Video } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import ProtectedRoute from '../components/ProtectedRoute';

function ChannelCard({ channelId }: { channelId: string }) {
  const { data: channel, isLoading } = useGetChannel(channelId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!channel) {
    return null;
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          {channel.name}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {channel.profile || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link to="/channel/$channelId" params={{ channelId: channel.id }}>
          <Button variant="outline" className="w-full">
            View Channel
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function FollowingPageContent() {
  const { data: followedChannelIds, isLoading } = useGetFollowedChannels();

  return (
    <div className="container py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="h-8 w-8 text-primary" />
          Following
        </h1>
        <p className="text-muted-foreground mt-2">
          Channels you follow
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : followedChannelIds && followedChannelIds.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {followedChannelIds.map((channelId) => (
            <ChannelCard key={channelId} channelId={channelId} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not following any channels yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Explore channels and follow your favorites to see them here
            </p>
            <Link to="/">
              <Button>
                Explore Channels
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FollowingPage() {
  return (
    <ProtectedRoute>
      <FollowingPageContent />
    </ProtectedRoute>
  );
}
