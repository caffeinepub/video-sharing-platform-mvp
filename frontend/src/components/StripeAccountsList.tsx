import { useState } from 'react';
import { useGetUserStripeAccounts, useDeleteStripeAccount } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreditCard, Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import EditStripeAccountDialog from './EditStripeAccountDialog';

export default function StripeAccountsList() {
  const { data: accounts = [], isLoading } = useGetUserStripeAccounts();
  const deleteAccount = useDeleteStripeAccount();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const handleDelete = async (accountId: string) => {
    try {
      await deleteAccount.mutateAsync(accountId);
      toast.success('Stripe account deleted');
      setDeletingAccountId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete Stripe account');
    }
  };

  const editingAccount = editingAccountId ? accounts.find(acc => acc.id === editingAccountId) : undefined;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Settings
              </CardTitle>
              <CardDescription>
                Manage your Stripe accounts for payment processing across your channels
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Stripe Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-20 bg-muted rounded" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No Stripe accounts configured yet. Add one to start accepting payments.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Stripe Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{account.accountName}</h3>
                      {account.connectId ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      API Key: {account.secretKey.substring(0, 12)}...
                    </p>
                    {account.connectId && (
                      <p className="text-sm text-muted-foreground">
                        Connect ID: {account.connectId}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingAccountId(account.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingAccountId(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditStripeAccountDialog
        existingAccount={undefined}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {editingAccountId && (
        <EditStripeAccountDialog
          existingAccount={editingAccount}
          open={true}
          onOpenChange={(open) => !open && setEditingAccountId(null)}
        />
      )}

      <AlertDialog open={!!deletingAccountId} onOpenChange={(open) => !open && setDeletingAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stripe Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Stripe account? This action cannot be undone.
              Make sure no channels are using this account before deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAccountId && handleDelete(deletingAccountId)}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
