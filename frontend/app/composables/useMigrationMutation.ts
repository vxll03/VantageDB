import { useMutation, useQueryClient } from '@tanstack/vue-query';

export const useSnapshotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, formData }: { projectId: number; formData: FormData }) => {
      return await apiClient(`/migrations/upload/${projectId}`, {
        method: 'POST',
        body: formData,
      });
    },

    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['latest-snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['snapshot-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['snapshots', variables.projectId] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
    onError: (err) => {
      console.error('Failed to create snapshot:', err);
    },
  });
};
