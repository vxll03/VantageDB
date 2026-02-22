import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '~/utils/apiClient';
import { LatestSnapshotResponseSchema, type LatestSnapshot } from '~/schemas/snapshots.schema';

export const useLatestSnapshotsQuery = (limit: number = 10) => {
  return useQuery({
    queryKey: ['latest-snapshots', limit],
    queryFn: async (): Promise<LatestSnapshot[]> => {
      const data = await apiClient(`/snapshots/latest?limit=${limit}`);
      return LatestSnapshotResponseSchema.parse(data);
    }
  });
};