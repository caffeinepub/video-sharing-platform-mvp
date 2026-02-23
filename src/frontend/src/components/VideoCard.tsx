import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { Lock } from 'lucide-react';
import type { VideoMetadata } from '../backend';
import { useGetChannel } from '../hooks/useQueries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface VideoCardProps {
  video: VideoMetadata;
}

export default function VideoCard({ video }: VideoCardProps) {
  const { data: channel } = useGetChannel(video.channelId);

  const formatViews = (count: bigint) => {
    const num = Number(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const hasTierRequirement = video.requiredTierLevel !== undefined && video.requiredTierLevel !== null;

  return (
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
          {hasTierRequirement && (
            <Badge className="absolute top-2 right-2 bg-accent/90 text-accent-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Members Only
            </Badge>
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
              {channel?.name || 'Loading...'}
            </p>
          </Link>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>{formatViews(video.likeCount)} likes</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(Number(video.uploadDate) / 1000000), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
