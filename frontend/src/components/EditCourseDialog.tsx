import { useState, useEffect } from 'react';
import { useGetChannelVideos, useGetChannelMembershipTiers, useUpdateCourse } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Course } from '../backend';

interface EditCourseDialogProps {
  course: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCourseDialog({ course, open, onOpenChange }: EditCourseDialogProps) {
  const { data: videos = [] } = useGetChannelVideos(course.channelId);
  const { data: tiers = [] } = useGetChannelMembershipTiers(course.channelId);
  const updateCourse = useUpdateCourse();

  const [formData, setFormData] = useState({
    title: course.title,
    description: course.description,
    priceUsd: course.priceUsd ? Number(course.priceUsd).toString() : '',
    requiredTierLevel: course.requiredTierLevel !== undefined && course.requiredTierLevel !== null 
      ? Number(course.requiredTierLevel).toString() 
      : 'none',
    selectedVideoIds: course.videoIds,
    isVisible: course.isVisible,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setFormData({
        title: course.title,
        description: course.description,
        priceUsd: course.priceUsd ? Number(course.priceUsd).toString() : '',
        requiredTierLevel: course.requiredTierLevel !== undefined && course.requiredTierLevel !== null 
          ? Number(course.requiredTierLevel).toString() 
          : 'none',
        selectedVideoIds: course.videoIds,
        isVisible: course.isVisible,
      });
      setImageFile(null);
      setUploadProgress(0);
    }
  }, [open, course]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a course title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a course description');
      return;
    }

    if (formData.selectedVideoIds.length === 0) {
      toast.error('Please select at least one video');
      return;
    }

    if (formData.priceUsd && parseFloat(formData.priceUsd) < 0) {
      toast.error('Price must be a positive number');
      return;
    }

    try {
      let courseImage = course.courseImage;

      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob = (window as any).ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage: number) => {
          setUploadProgress(percentage);
        });
        courseImage = blob.getDirectURL();
      }

      const updatedCourse: Course = {
        ...course,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priceUsd: formData.priceUsd ? BigInt(Math.round(parseFloat(formData.priceUsd) * 100)) / BigInt(100) : undefined,
        requiredTierLevel: formData.requiredTierLevel !== 'none' ? BigInt(formData.requiredTierLevel) : undefined,
        videoIds: formData.selectedVideoIds,
        courseImage,
        isVisible: formData.isVisible,
      };

      await updateCourse.mutateAsync({ courseId: course.id, course: updatedCourse });
      toast.success('Course updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update course');
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedVideoIds: prev.selectedVideoIds.includes(videoId)
        ? prev.selectedVideoIds.filter((id) => id !== videoId)
        : [...prev.selectedVideoIds, videoId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update your course settings including title, description, pricing, visibility, and video selection
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Complete Web Development Bootcamp"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what students will learn in this course..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">Course Image</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1"
              />
              {imageFile && (
                <span className="text-sm text-muted-foreground">
                  {imageFile.name}
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
            <p className="text-xs text-muted-foreground">Upload a new image or keep the existing one. Max 5MB.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price (USD, optional)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="29.99"
                value={formData.priceUsd}
                onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty for free course</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tier">Required Tier (optional)</Label>
              <Select
                value={formData.requiredTierLevel}
                onValueChange={(value) => setFormData({ ...formData, requiredTierLevel: value })}
              >
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
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="visibility">Course Visibility</Label>
              <p className="text-xs text-muted-foreground">
                {formData.isVisible ? 'Course is visible to all users' : 'Course is hidden from public view'}
              </p>
            </div>
            <Switch
              id="visibility"
              checked={formData.isVisible}
              onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Select Videos *</Label>
            <ScrollArea className="h-64 border rounded-md p-4">
              {videos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No videos available. Upload videos to your channel first.
                </p>
              ) : (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div key={video.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={video.id}
                        checked={formData.selectedVideoIds.includes(video.id)}
                        onCheckedChange={() => toggleVideoSelection(video.id)}
                      />
                      <label
                        htmlFor={video.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {video.title}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {formData.selectedVideoIds.length} video(s) selected
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateCourse.isPending}>
            {updateCourse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
