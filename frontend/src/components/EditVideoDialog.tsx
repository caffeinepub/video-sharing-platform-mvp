import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateVideo, useGetChannelMembershipTiers } from '../hooks/useQueries';
import type { VideoMetadata } from '../backend';
import { Category } from '../backend';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditVideoDialogProps {
  video: VideoMetadata;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditVideoDialog({ video, open, onOpenChange }: EditVideoDialogProps) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [category, setCategory] = useState<Category>(video.category);
  const [isPrivate, setIsPrivate] = useState(video.isPrivate);
  const [requiredTierLevel, setRequiredTierLevel] = useState<string>(
    video.requiredTierLevel !== undefined && video.requiredTierLevel !== null 
      ? Number(video.requiredTierLevel).toString() 
      : 'none'
  );
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: tiers = [] } = useGetChannelMembershipTiers(video.channelId);
  const updateVideo = useUpdateVideo();

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail must be less than 5MB');
        return;
      }
      setThumbnailFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a video title');
      return;
    }

    try {
      let thumbnailUrl = video.thumbnailUrl;

      if (thumbnailFile) {
        const arrayBuffer = await thumbnailFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob = (window as any).ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage: number) => {
          setUploadProgress(percentage);
        });
        thumbnailUrl = blob.getDirectURL();
      }

      const updatedMetadata: VideoMetadata = {
        ...video,
        title: title.trim(),
        description: description.trim(),
        category,
        isPrivate,
        thumbnailUrl,
        requiredTierLevel: requiredTierLevel !== 'none' ? BigInt(requiredTierLevel) : undefined,
      };

      await updateVideo.mutateAsync({
        videoId: video.id,
        metadata: updatedMetadata,
      });

      toast.success('Video updated successfully');
      onOpenChange(false);
      setThumbnailFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Error updating video:', error);
      toast.error(error.message || 'Failed to update video');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update your video's settings including title, description, category, thumbnail, privacy, and membership requirements.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
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

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail Image</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="flex-1"
                />
                {thumbnailFile && (
                  <span className="text-sm text-muted-foreground">
                    {thumbnailFile.name}
                  </span>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a new thumbnail or keep the existing one. Max 5MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Required Membership Tier</Label>
              <Select value={requiredTierLevel} onValueChange={setRequiredTierLevel}>
                <SelectTrigger id="tier">
                  <SelectValue placeholder="No tier required" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tier required</SelectItem>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={Number(tier.tierLevel).toString()}>
                      {tier.name} (Level {Number(tier.tierLevel)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Restrict this video to members with a specific tier or higher
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="privacy">Privacy</Label>
                <p className="text-xs text-muted-foreground">
                  {isPrivate ? 'Only you and course purchasers can view this video' : 'Anyone can view this video'}
                </p>
              </div>
              <Switch
                id="privacy"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateVideo.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateVideo.isPending}>
              {updateVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
