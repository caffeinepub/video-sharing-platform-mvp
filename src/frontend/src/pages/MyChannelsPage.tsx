import { Link } from '@tanstack/react-router';
import { useGetUserChannels } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Video } from 'lucide-react';
import { useState } from 'react';
import CreateChannelDialog from '../components/CreateChannelDialog';
import ProtectedRoute from '../components/ProtectedRoute';

function MyChannelsPageContent() {
  const { data: channels, isLoading } = useGetUserChannels();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="container py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Channels</h1>
          <p className="text-muted-foreground mt-2">
            Manage your channels and content
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Channel
        </Button>
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
      ) : channels && channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-lg transition-shadow">
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
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No channels yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first channel to start sharing videos
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateChannelDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}

export default function MyChannelsPage() {
  return (
    <ProtectedRoute>
      <MyChannelsPageContent />
    </ProtectedRoute>
  );
}
