import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DeleteAccountResponse } from '@/types';

async function deleteAccount(): Promise<DeleteAccountResponse> {
  const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>('delete-account');

  if (error) {
    throw new Error(error.message || 'Failed to delete account');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to delete account');
  }

  return data;
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await supabase.auth.signOut();
    },
  });
}
