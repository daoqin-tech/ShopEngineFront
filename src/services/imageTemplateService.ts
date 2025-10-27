import { apiClient } from '@/lib/api';

// ========== 图片模板项目相关类型 ==========

export type TemplateProjectType = 'calendar_landscape' | 'calendar_portrait';

export interface ImageTemplateProject {
  id?: string;
  name: string;
  description?: string;
  type: TemplateProjectType;  // 模板项目类型
  createdAt?: string;
  updatedAt?: string;
}

export interface ImageTemplateProjectListItem {
  projectId: string;
  name: string;
  description?: string;
  type: TemplateProjectType;  // 模板项目类型
  templateCount: number;  // 该项目下的模板数量
  createdAt: string;
  updatedAt: string;
}

// ========== 图片模板相关类型 ==========

export interface TemplateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  order: number; // 替换顺序
}

export interface ImageTemplate {
  templateId?: string;
  projectId?: string;
  imageUrl: string;
  regions: TemplateRegion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ImageTemplateListItem {
  templateId: string;
  projectId: string;
  imageUrl: string;
  regionCount: number;  // 该模板的区域数量
  createdAt: string;
  updatedAt: string;
}

// ========== API 服务 ==========

export const imageTemplateService = {
  // ========== 项目管理 ==========

  /**
   * 创建图片模板项目
   */
  createProject: async (project: Omit<ImageTemplateProject, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<ImageTemplateProject> => {
    const response: any = await apiClient.post(
      `/image-template-projects`,
      project
    );
    return response.data;
  },

  /**
   * 获取所有图片模板项目列表
   */
  getProjects: async (): Promise<ImageTemplateProjectListItem[]> => {
    const response: any = await apiClient.get(
      `/image-template-projects`
    );
    return response.data.items;
  },

  /**
   * 获取单个项目详情
   */
  getProject: async (projectId: string): Promise<ImageTemplateProject> => {
    const response: any = await apiClient.get(
      `/image-template-projects/${projectId}`
    );
    return response.data;
  },

  /**
   * 更新项目
   */
  updateProject: async (projectId: string, project: Omit<ImageTemplateProject, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<ImageTemplateProject> => {
    const response: any = await apiClient.put(
      `/image-template-projects/${projectId}`,
      project
    );
    return response.data;
  },

  /**
   * 删除项目
   */
  deleteProject: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/image-template-projects/${projectId}`);
  },

  // ========== 模板管理 ==========

  /**
   * 创建图片模板
   */
  createTemplate: async (projectId: string, template: Omit<ImageTemplate, 'templateId' | 'projectId' | 'createdAt' | 'updatedAt'>): Promise<ImageTemplate> => {
    const response: any = await apiClient.post(
      `/image-template-projects/${projectId}/templates`,
      template
    );
    return response.data;
  },

  /**
   * 批量创建图片模板
   */
  batchCreateTemplates: async (projectId: string, templates: Omit<ImageTemplate, 'templateId' | 'projectId' | 'createdAt' | 'updatedAt'>[]): Promise<ImageTemplate[]> => {
    const response: any = await apiClient.post(
      `/image-template-projects/${projectId}/templates/batch`,
      { templates }
    );
    return response.data.items;
  },

  /**
   * 获取项目下的所有模板列表
   */
  getTemplates: async (projectId: string): Promise<ImageTemplateListItem[]> => {
    const response: any = await apiClient.get(
      `/image-template-projects/${projectId}/templates`
    );
    return response.data.items;
  },

  /**
   * 获取单个模板详情
   */
  getTemplate: async (projectId: string, templateId: string): Promise<ImageTemplate> => {
    const response: any = await apiClient.get(
      `/image-template-projects/${projectId}/templates/${templateId}`
    );
    return response.data;
  },

  /**
   * 更新模板
   */
  updateTemplate: async (projectId: string, templateId: string, template: Omit<ImageTemplate, 'templateId' | 'projectId' | 'createdAt' | 'updatedAt'>): Promise<ImageTemplate> => {
    const response: any = await apiClient.put(
      `/image-template-projects/${projectId}/templates/${templateId}`,
      template
    );
    return response.data;
  },

  /**
   * 删除模板
   */
  deleteTemplate: async (projectId: string, templateId: string): Promise<void> => {
    await apiClient.delete(`/image-template-projects/${projectId}/templates/${templateId}`);
  },

  /**
   * 删除项目下的所有模板
   */
  deleteAllTemplates: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/image-template-projects/${projectId}/templates`);
  },
};
