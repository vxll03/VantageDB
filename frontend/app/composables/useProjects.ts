import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '~/utils/apiClient';
import { ApiProjectsSchema, type Project } from '~/schemas/projects.schema';

export const useProjectsQuery = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const data = await apiClient('/projects');
      return ApiProjectsSchema.parse(data);
    },
  });
};
