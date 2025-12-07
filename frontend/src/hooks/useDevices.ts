/**
 * React Query hooks for device management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { DeviceInstance } from '../types';
import { useUIStore } from '../store/uiStore';

export const useDevices = () => {
  return useQuery<DeviceInstance[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await api.devices.getAll();
      return response.data;
    },
    staleTime: 30000,
    retry: 2
  });
};

export const useCreateDevice = () => {
  const queryClient = useQueryClient();
  const { addConsoleLog } = useUIStore();

  return useMutation({
    mutationFn: async (data: {
      plugin_id: string;
      instance_id: string;
      config: Record<string, any>;
    }) => {
      const response = await api.devices.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      addConsoleLog({
        level: 'success',
        message: `Device '${data.instance_id}' created successfully`
      });
    },
    onError: (error: any) => {
      addConsoleLog({
        level: 'error',
        message: `Failed to create device: ${error.response?.data?.detail || error.message}`
      });
    }
  });
};

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  const { addConsoleLog } = useUIStore();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      await api.devices.delete(instanceId);
      return instanceId;
    },
    onSuccess: (instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      addConsoleLog({
        level: 'info',
        message: `Device '${instanceId}' deleted`
      });
    },
    onError: (error: any) => {
      addConsoleLog({
        level: 'error',
        message: `Failed to delete device: ${error.response?.data?.detail || error.message}`
      });
    }
  });
};
