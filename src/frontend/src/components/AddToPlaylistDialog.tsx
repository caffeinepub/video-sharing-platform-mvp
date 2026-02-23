import { useState } from 'react';
import { useGetUserPlaylists, useCreatePlaylist, useUpdatePlaylist } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, ListPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlaylistVisibility } from '../backend';

interface AddToPlaylistDialogProps {
  videoId: string;
  trigger?: React.ReactNode;
}

export default function AddToPlaylistDialog({ videoId, trigger }: AddToPlaylistDialogProps) {
  const { identity } = useAuth();
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());

  const { data: playlists = [], isLoading } = useGetUserPlaylists();
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist();

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim() || !identity) return;

    try {
      const newPlaylist = {
        id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        creator: identity.getPrincipal(),
        title: newPlaylistTitle.trim(),
        description: newPlaylistDescription.trim(),
        visibility: isPublic ? PlaylistVisibility.publicVisibility : PlaylistVisibility.privateVisibility,
        videoIds: [videoId],
      };

      await createPlaylist.mutateAsync(newPlaylist);
      toast.success('Playlist created and video added');
      setNewPlaylistTitle('');
      setNewPlaylistDescription('');
      setShowCreateForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create playlist');
    }
  };

  const handleTogglePlaylist = async (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    try {
      const videoIds = playlist.videoIds || [];
      const hasVideo = videoIds.includes(videoId);

      const updatedVideoIds = hasVideo
        ? videoIds.filter((id) => id !== videoId)
        : [...videoIds, videoId];

      await updatePlaylist.mutateAsync({
        playlistId,
        playlist: {
          ...playlist,
          videoIds: updatedVideoIds,
        },
      });

      toast.success(hasVideo ? 'Removed from playlist' : 'Added to playlist');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update playlist');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <ListPlus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save to Playlist</DialogTitle>
          <DialogDescription>
            Add this video to your playlists
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {playlists.map((playlist) => {
                    const hasVideo = playlist.videoIds?.includes(videoId) || false;
                    return (
                      <div key={playlist.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={playlist.id}
                          checked={hasVideo}
                          onCheckedChange={() => handleTogglePlaylist(playlist.id)}
                        />
                        <label
                          htmlFor={playlist.id}
                          className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {playlist.title}
                        </label>
                      </div>
                    );
                  })}
                  {playlists.length === 0 && !showCreateForm && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No playlists yet. Create one below!
                    </p>
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              {showCreateForm ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Playlist Title</Label>
                    <Input
                      id="title"
                      placeholder="My Playlist"
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Description"
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="public">Public Playlist</Label>
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistTitle.trim() || createPlaylist.isPending}
                      className="flex-1"
                    >
                      {createPlaylist.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Playlist
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
