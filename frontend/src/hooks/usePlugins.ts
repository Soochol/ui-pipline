/**
 * React Query hook for fetching plugins
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { PluginMetadata } from '../types';

export const usePlugins = () => {
  return useQuery<PluginMetadata[]>({
    queryKey: ['plugins'],
    queryFn: async () => {
      const response = await api.plugins.getAll();
      // API returns { plugins: [...], count: N }
      const data = response.data as any;
      return data.plugins || data;
    },
    staleTime: 60000, // 1 minute
    retry: 2
  });
};
