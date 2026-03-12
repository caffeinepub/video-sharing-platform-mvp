import { useParams, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  useGetVideo,
  useGetChannel,
  useGetComments,
  useAddComment,
  useLikeVideo,
  useGetUserSubscriptionTierLevel,
  useGetUserProfile,
  useGetChannelCourses,
} from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, Share2, Loader2, Lock, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { Comment } from '../backend';
import AddToPlaylistDialog from '../components/AddToPlaylistDialog';
import EditVideoDialog from '../components/EditVideoDialog';

export default function WatchPage() {
  const { videoId } = useParams({ from: '/watch/$videoId' });
  const { identity, isAuthenticated } = useAuth();
  const [videoKey, setVideoKey] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: video, isLoading: videoLoading, refetch: refetchVideo, error: videoError } = useGetVideo(videoId);
  const { data: channel } = useGetChannel(video?.channelId);
  const { data: comments = [], refetch: refetchComments } = useGetComments(videoId);
  const { data: userTierLevel } = useGetUserSubscriptionTierLevel(video?.channelId);
  const { data: courses = [] } = useGetChannelCourses(video?.channelId);
  const addComment = useAddComment();
  const likeVideo = useLikeVideo();

  useEffect(() => {
    refetchVideo();
  }, [videoId, refetchVideo]);

  useEffect(() => {
    if (video?.videoUrl) {
      setVideoKey((prev) => prev + 1);
    }
  }, [video?.videoUrl]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to like videos');
      return;
    }

    try {
      await likeVideo.mutateAsync(videoId);
      toast.success('Video liked!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to like video');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !identity) {
      toast.error('Please login to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const comment: Comment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        videoId,
        author: identity.getPrincipal(),
        content: commentText.trim(),
        timestamp: BigInt(Date.now() * 1000000),
      };

      await addComment.mutateAsync(comment);
      setCommentText('');
      refetchComments();
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/watch/${videoId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  if (videoLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (videoError || !video) {
    const errorMessage = videoError?.message || '';
    const isPrivateAccessDenied = errorMessage.includes('Private video access denied');

    if (isPrivateAccessDenied) {
      return (
        <div className="container py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12 text-center">
              <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Private Video</h2>
              <p className="text-muted-foreground mb-6">
                This video is private and can only be accessed by the uploader or by purchasing a course that includes this video.
              </p>
              {channel && (
                <div className="flex gap-2 justify-center">
                  <Button asChild>
                    <Link to="/channel/$channelId" params={{ channelId: channel.id }}>
                      View Channel Courses
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/">
                      Back to Home
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
          <p className="text-muted-foreground">This video doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isOwner = identity && channel && channel.principal.toString() === identity.getPrincipal().toString();
  const hasTierRequirement = video.requiredTierLevel !== undefined && video.requiredTierLevel !== null;
  const hasAccess = !hasTierRequirement || (userTierLevel !== undefined && userTierLevel !== null && userTierLevel >= (video.requiredTierLevel || BigInt(0)));

  const coursesWithVideo = courses.filter((course) => course.videoIds.includes(videoId));

  return (
    <div className="container py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
            {hasAccess ? (
              <video key={videoKey} controls className="w-full h-full">
                <source src={video.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Lock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Member-Only Content</p>
                  <p className="text-sm opacity-75">Subscribe to access this video</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
              <p className="text-muted-foreground">{video.description}</p>
            </div>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="ml-4"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleLike} disabled={likeVideo.isPending}>
              {likeVideo.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="mr-2 h-4 w-4" />
              )}
              {Number(video.likeCount)} Likes
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {isAuthenticated && <AddToPlaylistDialog videoId={videoId} />}
          </div>

          {channel && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Link
                    to="/channel/$channelId"
                    params={{ channelId: channel.id }}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar>
                      <AvatarImage src="/assets/generated/default-avatar.dim_100x100.png" />
                      <AvatarFallback>{channel.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{channel.name}</p>
                      <p className="text-sm text-muted-foreground">{channel.profile}</p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comments ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-6">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="mb-2"
                  />
                  <Button type="submit" disabled={addComment.isPending}>
                    {addComment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Comment
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">Please login to comment</p>
              )}

              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          {coursesWithVideo.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Part of Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coursesWithVideo.map((course) => (
                    <Link
                      key={course.id}
                      to="/course/$courseId/play"
                      params={{ courseId: course.id }}
                      className="block p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="font-semibold">{course.title}</p>
                      <p className="text-sm text-muted-foreground">{course.videoIds.length} videos</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {video && (
        <EditVideoDialog
          video={video}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const { data: profile } = useGetUserProfile(comment.author);

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/assets/generated/default-avatar.dim_100x100.png" />
        <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{profile?.name || 'Anonymous'}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(Number(comment.timestamp) / 1000000), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm">{comment.content}</p>
      </div>
    </div>
  );
}
