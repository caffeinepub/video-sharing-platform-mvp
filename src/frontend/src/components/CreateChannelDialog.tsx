import { useState } from 'react';
import { useCreateChannel } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
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

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const { identity } = useInternetIdentity();
  const createChannel = useCreateChannel();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identity) {
      toast.error('Please login to create a channel');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter a channel name');
      return;
    }

    try {
      const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await createChannel.mutateAsync({
        id: channelId,
        principal: identity.getPrincipal(),
        name: name.trim(),
        profile: description.trim() || 'Video creator',
      });

      toast.success('Channel created successfully!');
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast.error(error.message || 'Failed to create channel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a new channel to start uploading and sharing videos
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name *</Label>
              <Input
                id="channel-name"
                placeholder="Enter channel name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createChannel.isPending}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Textarea
                id="channel-description"
                placeholder="Describe your channel"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createChannel.isPending}
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
              disabled={createChannel.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChannel.isPending}>
              {createChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
