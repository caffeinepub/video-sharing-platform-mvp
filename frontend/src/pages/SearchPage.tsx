import { useSearch } from '@tanstack/react-router';
import { useSearchVideos } from '../hooks/useQueries';
import VideoCard from '../components/VideoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearch({ from: '/search' });
  const query = (searchParams as any).q || '';
  const { data: videos, isLoading } = useSearchVideos(query);

  return (
    <div className="container py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search Results</h1>
        {query && (
          <p className="mt-2 text-muted-foreground">
            Showing results for "{query}"
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <div className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos && videos.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No videos found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try searching with different keywords
          </p>
        </div>
      )}
    </div>
  );
}
