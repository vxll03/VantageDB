import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.iso.datetime(),
});


export const ApiProjectsSchema = z.array(ProjectSchema);
export type Project = z.infer<typeof ProjectSchema>;