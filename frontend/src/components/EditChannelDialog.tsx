import { useState, useEffect } from 'react';
import { useUpdateChannel } from '../hooks/useQueries';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '../backend';

interface EditChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}

export default function EditChannelDialog({ open, onOpenChange, channel }: EditChannelDialogProps) {
  const updateChannel = useUpdateChannel();
  const [name, setName] = useState(channel.name);
  const [profile, setProfile] = useState(channel.profile);

  // Update form when channel prop changes
  useEffect(() => {
    setName(channel.name);
    setProfile(channel.profile);
  }, [channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a channel name');
      return;
    }

    try {
      await updateChannel.mutateAsync({
        channelId: channel.id,
        name: name.trim(),
        profile: profile.trim() || 'Video creator',
      });

      toast.success('Channel updated successfully!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating channel:', error);
      toast.error(error.message || 'Failed to update channel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
          <DialogDescription>
            Update your channel name and description
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-channel-name">Channel Name *</Label>
              <Input
                id="edit-channel-name"
                placeholder="Enter channel name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={updateChannel.isPending}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-channel-profile">Description</Label>
              <Textarea
                id="edit-channel-profile"
                placeholder="Describe your channel"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                disabled={updateChannel.isPending}
                rows={3}
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateChannel.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateChannel.isPending}>
              {updateChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
