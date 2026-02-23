import { useState } from 'react';
import { useGetAllVideos } from '../hooks/useQueries';
import VideoCard from '../components/VideoCard';
import CategoryFilter from '../components/CategoryFilter';
import PersonalizedCoursesSection from '../components/PersonalizedCoursesSection';
import { Category } from '../backend';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const { data: videos, isLoading, isError, error, refetch } = useGetAllVideos();

  const filteredVideos =
    selectedCategory === 'all'
      ? videos
      : videos?.filter((v) => v.category === selectedCategory);

  if (isError) {
    return (
      <div className="container py-8 px-4">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Videos</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>Failed to load videos. Please try again.</p>
            {error && (
              <p className="text-xs opacity-80">{error.message}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4">
      <PersonalizedCoursesSection />

      <div className="mb-6">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
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
      ) : filteredVideos && filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg text-muted-foreground">No videos found</p>
          <p className="text-sm text-muted-foreground mt-2">
            {selectedCategory !== 'all'
              ? 'Try selecting a different category'
              : 'Be the first to upload a video!'}
          </p>
        </div>
      )}
    </div>
  );
}
