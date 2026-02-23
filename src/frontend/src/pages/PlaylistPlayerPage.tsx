import { useParams, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useGetPlaylist, useGetVideo } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';

export default function PlaylistPlayerPage() {
  const { playlistId } = useParams({ from: '/playlist/$playlistId/play' });
  const navigate = useNavigate();
  const { data: playlist, isLoading } = useGetPlaylist(playlistId);
  
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const currentVideoId = playlist?.videoIds[currentVideoIndex];
  const { data: currentVideo } = useGetVideo(currentVideoId);

  useEffect(() => {
    if (playlist && playlist.videoIds.length > 0) {
      setCurrentVideoIndex(0);
    }
  }, [playlist]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-muted rounded" />
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

  if (playlist.videoIds.length === 0) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{playlist.title}</h1>
          <p className="text-muted-foreground">This playlist is empty.</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentVideoIndex < playlist.videoIds.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else if (repeat) {
      setCurrentVideoIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);
  };

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{playlist.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{playlist.description}</p>
            </CardHeader>
            <CardContent>
              {currentVideo ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    {currentVideo.videoUrl ? (
                      <video
                        key={currentVideo.id}
                        controls
                        className="w-full h-full rounded-lg"
                        src={currentVideo.videoUrl}
                        onEnded={handleNext}
                      />
                    ) : (
                      <p className="text-muted-foreground">Video not available</p>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{currentVideo.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentVideo.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrevious}
                      disabled={currentVideoIndex === 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNext}
                      disabled={currentVideoIndex === playlist.videoIds.length - 1 && !repeat}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={shuffle ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setShuffle(!shuffle)}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={repeat ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setRepeat(!repeat)}
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Loading video...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Playlist ({playlist.videoIds.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {playlist.videoIds.map((videoId, index) => (
                    <VideoListItem
                      key={videoId}
                      videoId={videoId}
                      index={index}
                      isActive={index === currentVideoIndex}
                      onClick={() => handleVideoSelect(index)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function VideoListItem({ videoId, index, isActive, onClick }: { videoId: string; index: number; isActive: boolean; onClick: () => void }) {
  const { data: video } = useGetVideo(videoId);

  if (!video) {
    return (
      <div className="p-3 border rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 border rounded-lg text-left transition-colors hover:bg-muted ${
        isActive ? 'bg-primary/10 border-primary' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {isActive ? <PlayCircle className="h-4 w-4" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {video.category}
          </p>
        </div>
      </div>
    </button>
  );
}
