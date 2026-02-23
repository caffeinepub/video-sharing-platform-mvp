import { useAuth } from '../contexts/AuthContext';
import { useGetUserPlaylists } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List } from 'lucide-react';

export default function PlaylistsPage() {
  const { isAuthenticated } = useAuth();
  const { data: playlists = [], isLoading } = useGetUserPlaylists();

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">My Playlists</h1>
          <p className="text-muted-foreground">Please login to view your playlists</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Playlists</h1>
        <p className="text-muted-foreground">Organize your favorite videos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Your Playlists
          </CardTitle>
          <CardDescription>Create and manage your video playlists</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No playlists yet. Start creating playlists to organize your favorite videos!
            </p>
          ) : (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <div key={playlist.id} className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">{playlist.title}</h3>
                  <p className="text-sm text-muted-foreground">{playlist.videoIds.length} videos</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
