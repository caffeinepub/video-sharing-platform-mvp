import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useUploadVideo, useGetChannelMembershipTiers, useGetChannel } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload as UploadIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from '../backend';
import type { VideoMetadata } from '../backend';

export default function UploadPage() {
  const { channelId } = useParams({ from: '/upload/$channelId' });
  const { identity, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: channel, isLoading: channelLoading } = useGetChannel(channelId);
  const uploadVideo = useUploadVideo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>(Category.other);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [requiredTierLevel, setRequiredTierLevel] = useState<string>('');

  const { data: tiers = [] } = useGetChannelMembershipTiers(channelId);

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Upload Video</h1>
          <p className="text-muted-foreground">Please login to upload videos</p>
        </div>
      </div>
    );
  }

  if (channelLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="container py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Channel Not Found</CardTitle>
            <CardDescription>The channel you're trying to upload to doesn't exist</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/my-channels' })}>
              Go to My Channels
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = identity && channel.principal.toString() === identity.getPrincipal().toString();

  if (!isOwner) {
    return (
      <div className="container py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>You can only upload videos to your own channels</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/channel/$channelId', params: { channelId } })}>
              Back to Channel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !videoFile || !thumbnailFile) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const videoUrl = URL.createObjectURL(videoFile);
      const thumbnailUrl = URL.createObjectURL(thumbnailFile);

      const metadata: VideoMetadata = {
        id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        category,
        uploadDate: BigInt(Date.now() * 1000000),
        likeCount: BigInt(0),
        channelId: channelId,
        videoUrl,
        thumbnailUrl,
        requiredTierLevel: requiredTierLevel ? BigInt(requiredTierLevel) : undefined,
        isPrivate: true,
        viewCount: BigInt(0),
      };

      await uploadVideo.mutateAsync(metadata);
      toast.success('Video uploaded successfully');
      navigate({ to: '/channel/$channelId', params: { channelId } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload video');
    }
  };

  return (
    <div className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-6 w-6" />
            Upload Video to {channel.name}
          </CardTitle>
          <CardDescription>Share your content with the world</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your video"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as Category)} required>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Category.music}>Music</SelectItem>
                  <SelectItem value={Category.gaming}>Gaming</SelectItem>
                  <SelectItem value={Category.education}>Education</SelectItem>
                  <SelectItem value={Category.vlog}>Vlog</SelectItem>
                  <SelectItem value={Category.comedy}>Comedy</SelectItem>
                  <SelectItem value={Category.other}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tiers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="tierLevel">Access Requirement</Label>
                <Select value={requiredTierLevel} onValueChange={setRequiredTierLevel}>
                  <SelectTrigger id="tierLevel">
                    <SelectValue placeholder="No tier required" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tier required</SelectItem>
                    {tiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.tierLevel.toString()}>
                        {tier.name} (Level {tier.tierLevel.toString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Restrict this video to specific membership tiers
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="video">Video File *</Label>
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail *</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={uploadVideo.isPending}>
              {uploadVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Video
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
