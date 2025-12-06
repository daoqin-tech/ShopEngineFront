import { apiClient } from '@/lib/api';
import type {
  SystemConfig,
  CreateSystemConfigRequest,
  UpdateSystemConfigRequest,
} from '@/types/systemConfig';

export const systemConfigService = {
  // 获取所有配置
  getAllConfigs: async (): Promise<SystemConfig[]> => {
    const response = await apiClient.get('/system-configs');
    return response.data;
  },

  // 根据类型获取配置
  getConfigsByType: async (type: string): Promise<SystemConfig[]> => {
    const response = await apiClient.get(`/system-configs?type=${type}`);
    return response.data;
  },

  // 获取单个配置
  getConfigById: async (id: string): Promise<SystemConfig> => {
    const response = await apiClient.get(`/system-configs/${id}`);
    return response.data;
  },

  // 根据键名获取配置
  getConfigByKey: async (key: string): Promise<SystemConfig> => {
    const response = await apiClient.get(`/system-configs/key/${key}`);
    return response.data;
  },

  // 创建配置
  createConfig: async (data: CreateSystemConfigRequest): Promise<SystemConfig> => {
    const response = await apiClient.post('/system-configs', data);
    return response.data;
  },

  // 更新配置
  updateConfig: async (id: string, data: UpdateSystemConfigRequest): Promise<SystemConfig> => {
    const response = await apiClient.put(`/system-configs/${id}`, data);
    return response.data;
  },

  // 删除配置
  deleteConfig: async (id: string): Promise<void> => {
    await apiClient.delete(`/system-configs/${id}`);
  },
};
