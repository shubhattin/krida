import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';

type ChatRef = { id: string; title: string };

export function RenameChatDialog({ chat, onClose }: { chat: ChatRef | null; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(chat?.title ?? '');

  const rename_mut = useMutation(
    trpc.agents.rename_chat.mutationOptions({
      onSuccess: (_, input) => {
        void queryClient.invalidateQueries({ queryKey: trpc.agents.list_chats.queryKey() });
        void queryClient.invalidateQueries({
          queryKey: trpc.agents.get_chat.queryKey({ id: input.id })
        });
        onClose();
      },
      onError: (error) => toast.error(error.message)
    })
  );

  return (
    <Dialog open={chat !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (chat && title.trim()) rename_mut.mutate({ id: chat.id, title: title.trim() });
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            maxLength={120}
            autoFocus
            aria-label="Chat title"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || rename_mut.isPending}>
              {rename_mut.isPending ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteChatDialog({ chat, onClose }: { chat: ChatRef | null; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false });

  const delete_mut = useMutation(
    trpc.agents.delete_chat.mutationOptions({
      onSuccess: (_, input) => {
        void queryClient.invalidateQueries({ queryKey: trpc.agents.list_chats.queryKey() });
        if (params.chatId === input.id) void navigate({ to: '/admin/agents' });
        onClose();
      },
      onError: (error) => toast.error(error.message)
    })
  );

  return (
    <AlertDialog open={chat !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{chat?.title || 'New chat'}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The conversation and its tool calls are deleted. Puzzles already added from it stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={delete_mut.isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={delete_mut.isPending}
            onClick={() => chat && delete_mut.mutate({ id: chat.id })}
          >
            {delete_mut.isPending ? <Spinner /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
