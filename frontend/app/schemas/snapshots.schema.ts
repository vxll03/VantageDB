import { z } from 'zod';

export const LatestSnapshotSchema = z.object({
  id: z.number(),
  revision_id: z.string(),
  project_id: z.number(),
  project_name: z.string(),
  created_at: z.iso.datetime(),
});

export const LatestSnapshotResponseSchema = z.array(LatestSnapshotSchema);
export type LatestSnapshot = z.infer<typeof LatestSnapshotSchema>;
