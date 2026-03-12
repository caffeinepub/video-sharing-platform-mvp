import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGetCallerUserProfile, useUpdateCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import ProtectedRoute from '../components/ProtectedRoute';
import StripeAccountsList from '../components/StripeAccountsList';

function ProfileSettingsPageContent() {
  const { identity } = useAuth();
  const { data: userProfile } = useGetCallerUserProfile();
  const updateProfile = useUpdateCallerUserProfile();

  const [name, setName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile && name !== userProfile.name) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [name, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long');
      return;
    }

    if (name.trim().length > 50) {
      toast.error('Name must be less than 50 characters');
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      toast.success('Profile updated successfully');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    }
  };

  if (!userProfile) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Profile not found. Please complete profile setup first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-primary" />
            <CardTitle>Profile Settings</CardTitle>
          </div>
          <CardDescription>
            Update your personal information. Changes will be reflected across the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={50}
                required
              />
              <p className="text-sm text-muted-foreground">
                This is the name that will be displayed on your channel and comments.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Principal ID</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono break-all text-muted-foreground">
                  {identity?.getPrincipal().toString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your unique Internet Identity principal.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="submit"
                disabled={!hasChanges || updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <StripeAccountsList />
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <ProtectedRoute>
      <ProfileSettingsPageContent />
    </ProtectedRoute>
  );
}
