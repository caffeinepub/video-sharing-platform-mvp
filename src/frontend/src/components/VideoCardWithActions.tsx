import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { Lock } from 'lucide-react';
import type { VideoMetadata } from '../backend';
import { useGetChannel, useDeleteVideo } from '../hooks/useQueries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import EditVideoDialog from './EditVideoDialog';
import { toast } from 'sonner';

interface VideoCardWithActionsProps {
  video: VideoMetadata;
  showActions?: boolean;
}

export default function VideoCardWithActions({ video, showActions = false }: VideoCardWithActionsProps) {
  const { data: channel } = useGetChannel(video.channelId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteVideo = useDeleteVideo();

  const formatViews = (count: bigint) => {
    const num = Number(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleDelete = async () => {
    try {
      await deleteVideo.mutateAsync({
        videoId: video.id,
        channelId: video.channelId,
      });
      toast.success('Video deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast.error(error.message || 'Failed to delete video');
    }
  };

  return (
    <>
      <div className="group cursor-pointer">
        <Link to="/watch/$videoId" params={{ videoId: video.id }}>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <img
                  src="/assets/generated/video-placeholder.dim_320x180.png"
                  alt="Video placeholder"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {video.isPrivate && (
              <div className="absolute top-2 left-2 bg-black/70 rounded-full p-2">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
            <Badge className="absolute bottom-2 right-2 bg-background/90 text-foreground">
              {video.category}
            </Badge>
          </div>
        </Link>
        <div className="mt-3 flex gap-3">
          <Link to="/channel/$channelId" params={{ channelId: video.channelId.toString() }}>
            <Avatar className="h-9 w-9">
              <AvatarImage src="/assets/generated/default-avatar.dim_100x100.png" />
              <AvatarFallback>{channel?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to="/watch/$videoId" params={{ videoId: video.id }}>
              <h3 className="font-semibold line-clamp-2 text-sm leading-tight group-hover:text-primary transition-colors">
                {video.title}
              </h3>
            </Link>
            <Link
              to="/channel/$channelId"
              params={{ channelId: video.channelId.toString() }}
              className="mt-1 block"
            >
              <p className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {channel?.name || 'Unknown Channel'}
              </p>
            </Link>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span>{formatViews(video.likeCount)} likes</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(Number(video.uploadDate) / 1000000), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="flex-1"
            >
              <img src="/assets/generated/edit-icon.dim_24x24.png" alt="" className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="flex-1 text-destructive hover:text-destructive"
              disabled={deleteVideo.isPending}
            >
              {deleteVideo.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <img src="/assets/generated/delete-icon.dim_24x24.png" alt="" className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        )}
      </div>

      <EditVideoDialog video={video} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{video.title}"? This action cannot be undone and will permanently remove the video from your channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVideo.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteVideo.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
