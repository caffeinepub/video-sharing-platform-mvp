import { useParams, Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  useGetChannel,
  useGetChannelVideos,
  useGetChannelFollowers,
  useIsFollowingChannel,
  useFollowChannel,
  useUnfollowChannel,
  useGetChannelCourses,
} from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, UserPlus, UserCheck, Loader2, Upload } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import MembershipTiersSection from '../components/MembershipTiersSection';
import DonateDialog from '../components/DonateDialog';
import DonationsFeed from '../components/DonationsFeed';
import CourseCard from '../components/CourseCard';
import { toast } from 'sonner';

export default function ChannelPage() {
  const { channelId } = useParams({ from: '/channel/$channelId' });
  const { identity, isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: channel, isLoading: channelLoading } = useGetChannel(channelId);
  const { data: videos = [], isLoading: videosLoading } = useGetChannelVideos(channelId);
  const { data: followers = [] } = useGetChannelFollowers(channelId);
  const { data: isFollowing = false } = useIsFollowingChannel(channelId);
  const { data: courses = [] } = useGetChannelCourses(channelId);
  const followChannel = useFollowChannel();
  const unfollowChannel = useUnfollowChannel();

  const isOwner = identity && channel && channel.principal.toString() === identity.getPrincipal().toString();

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to follow channels');
      return;
    }

    setIsProcessing(true);
    try {
      if (isFollowing) {
        await unfollowChannel.mutateAsync(channelId);
        toast.success('Unfollowed channel');
      } else {
        await followChannel.mutateAsync(channelId);
        toast.success('Following channel');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update follow status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async (tierId: string, tierName: string, priceUsd: number) => {
    try {
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success?type=subscription&channelId=${channelId}`;
      const cancelUrl = `${baseUrl}/payment-failure?type=subscription`;

      // This would integrate with Stripe checkout
      toast.info('Stripe checkout integration would happen here');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout');
    }
  };

  const handleDonate = async (amount: number, message: string) => {
    try {
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success?type=donation&channelId=${channelId}`;
      const cancelUrl = `${baseUrl}/payment-failure?type=donation`;

      // This would integrate with Stripe checkout
      toast.info('Stripe checkout integration would happen here');
    } catch (error: any) {
      toast.error(error.message || 'Failed to process donation');
      throw error;
    }
  };

  if (channelLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Channel Not Found</h1>
          <p className="text-muted-foreground">This channel doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{channel.name}</h1>
            <p className="text-muted-foreground">{followers.length} followers</p>
          </div>
          <div className="flex gap-2">
            {isOwner ? (
              <>
                <Button asChild variant="outline">
                  <Link to="/upload/$channelId" params={{ channelId }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Video
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/channel/$channelId/settings" params={{ channelId }}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFollowToggle}
                  disabled={isProcessing}
                  variant={isFollowing ? 'outline' : 'default'}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck className="mr-2 h-4 w-4" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <DonateDialog channelId={channelId} channelName={channel.name} onDonate={handleDonate} />
              </>
            )}
          </div>
        </div>
        {channel.profile && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{channel.profile}</p>
        )}
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-6">
          {videosLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-xl mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No videos yet</p>
              {isOwner && (
                <Button asChild className="mt-4">
                  <Link to="/upload/$channelId" params={{ channelId }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Your First Video
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No courses available</p>
              {isOwner && (
                <Button asChild className="mt-4">
                  <Link to="/channel/$channelId/courses/manage" params={{ channelId }}>
                    Create Your First Course
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="membership" className="mt-6">
          <MembershipTiersSection channelId={channelId} onSubscribe={handleSubscribe} />
        </TabsContent>

        <TabsContent value="donations" className="mt-6">
          <DonationsFeed channelId={channelId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
