import { useParams } from '@tanstack/react-router';
import { useGetPlaylist } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlaylistEditPage() {
  const { playlistId } = useParams({ from: '/playlist/$playlistId/edit' });
  const { data: playlist, isLoading } = useGetPlaylist(playlistId);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Playlist Not Found</h1>
          <p className="text-muted-foreground">This playlist doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Playlist: {playlist.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{playlist.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
