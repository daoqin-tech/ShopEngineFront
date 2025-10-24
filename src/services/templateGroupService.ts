import { apiClient } from '@/lib/api';

export interface TemplateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Template {
  templateId?: string;
  imageUrl: string;
  regions: TemplateRegion[];
}

export interface TemplateGroup {
  groupId?: string;
  name: string;
  description?: string;
  templates: Template[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateGroupListItem {
  groupId: string;
  name: string;
  description?: string;
  templateCount: number;
  createdAt: string;
  updatedAt: string;
}

export const templateGroupService = {
  /**
   * 创建模板组
   */
  createGroup: async (group: Omit<TemplateGroup, 'groupId' | 'createdAt' | 'updatedAt'>): Promise<TemplateGroup> => {
    const response = await apiClient.post<TemplateGroup>(
      `/template-groups`,
      group
    );
    return response.data;
  },

  /**
   * 获取所有模板组列表
   */
  getGroups: async (): Promise<TemplateGroupListItem[]> => {
    const response = await apiClient.get<{ items: TemplateGroupListItem[] }>(
      `/template-groups`
    );
    return response.data.items;
  },

  /**
   * 获取模板组详情
   */
  getGroup: async (groupId: string): Promise<TemplateGroup> => {
    const response = await apiClient.get<TemplateGroup>(
      `/template-groups/${groupId}`
    );
    return response.data;
  },

  /**
   * 更新模板组
   */
  updateGroup: async (groupId: string, group: Omit<TemplateGroup, 'groupId' | 'createdAt' | 'updatedAt'>): Promise<TemplateGroup> => {
    const response = await apiClient.put<TemplateGroup>(
      `/template-groups/${groupId}`,
      group
    );
    return response.data;
  },

  /**
   * 删除模板组
   */
  deleteGroup: async (groupId: string): Promise<void> => {
    await apiClient.delete(`/template-groups/${groupId}`);
  },
};
