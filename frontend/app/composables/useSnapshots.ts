import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '~/utils/apiClient';
import {
  LatestSnapshotResponseSchema,
  TimelineSnapshotResponseSchema,
  SnapshotDetailsSchema,
} from '~/schemas/snapshots.schema';
import type { LatestSnapshot, SnapshotDetails, TimeLineSnapshot } from '~/schemas/snapshots.schema';

export const useLatestSnapshotsQuery = (limit: number = 10) => {
  return useQuery({
    queryKey: ['latest-snapshots', limit],
    queryFn: async (): Promise<LatestSnapshot[]> => {
      const data = await apiClient(`/snapshots/latest?limit=${limit}`);
      return LatestSnapshotResponseSchema.parse(data);
    },
  });
};

export const useSnapshotTimelineQuery = (projectId: number) => {
  return useQuery({
    queryKey: ['snapshots', projectId],
    queryFn: async (): Promise<TimeLineSnapshot[]> => {
      const data = await apiClient(`/snapshots/${projectId}`);
      return TimelineSnapshotResponseSchema.parse(data);
    },
  });
};

export const useSnapshotDetailsQuery = (
  projectId: number,
  selectedRevision: Ref<number | null>,
) => {
  return useQuery({
    queryKey: ['snapshot-details', projectId, selectedRevision],
    queryFn: async (): Promise<SnapshotDetails> => {
      const data = await apiClient(`/snapshots/${projectId}/${selectedRevision.value}`);
      return SnapshotDetailsSchema.parse(data);
    },
    enabled: computed(() => !!selectedRevision.value),
  });
};
