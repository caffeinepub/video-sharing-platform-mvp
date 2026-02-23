import { useState } from 'react';
import { useGetChannelVideos, useGetChannelMembershipTiers, useCreateCourse } from '../hooks/useQueries';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Course } from '../backend';

interface CreateCourseDialogProps {
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCourseDialog({ channelId, open, onOpenChange }: CreateCourseDialogProps) {
  const { data: videos = [] } = useGetChannelVideos(channelId);
  const { data: tiers = [] } = useGetChannelMembershipTiers(channelId);
  const createCourse = useCreateCourse();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceUsd: '',
    requiredTierLevel: 'none',
    selectedVideoIds: [] as string[],
  });

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

    try {
      const course: Course = {
        id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priceUsd: formData.priceUsd ? BigInt(Math.round(parseFloat(formData.priceUsd) * 100)) / BigInt(100) : undefined,
        requiredTierLevel: formData.requiredTierLevel !== 'none' ? BigInt(formData.requiredTierLevel) : undefined,
        videoIds: formData.selectedVideoIds,
        courseImage: undefined,
        isVisible: true,
      };

      await createCourse.mutateAsync(course);
      toast.success('Course created successfully');
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        priceUsd: '',
        requiredTierLevel: 'none',
        selectedVideoIds: [],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create course');
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Course</DialogTitle>
          <DialogDescription>
            Create a structured learning path by organizing your videos into a course
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
          <Button onClick={handleSubmit} disabled={createCourse.isPending}>
            {createCourse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
