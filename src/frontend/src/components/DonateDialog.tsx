import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DonateDialogProps {
  channelId: string;
  channelName: string;
  onDonate: (amount: number, message: string) => Promise<void>;
}

export default function DonateDialog({ channelId, channelName, onDonate }: DonateDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const presetAmounts = [5, 10, 25, 50, 100];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    setIsLoading(true);
    try {
      await onDonate(donationAmount, message);
      setOpen(false);
      setAmount('');
      setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to process donation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Heart className="h-4 w-4" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Support {channelName}</DialogTitle>
            <DialogDescription>
              Send a one-time donation to show your support
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Quick Select</Label>
              <div className="grid grid-cols-5 gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={amount === preset.toString() ? 'default' : 'outline'}
                    onClick={() => setAmount(preset.toString())}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Custom Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Leave a message for the creator..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Donate ${amount || '0'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
