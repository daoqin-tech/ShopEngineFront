import { apiClient } from '@/lib/api';

// Temu 标题模板类型
export interface TemuTitleTemplate {
  id: string;
  name: string;
  // 产品分类关联
  productCategoryId?: string;
  productCategoryName?: string;
  // 核心字段
  categoryKeywordsZh: string;
  categoryKeywordsEn: string;
  productSpec: string;
  productUsage: string;
  theme: string; // 主题
  festivalKeywords: string; // 节日场景
  // 示例标题
  sampleTitleZh: string;
  sampleTitleEn: string;
  // 状态
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 标题模板列表响应
export interface TemuTitleTemplateListResponse {
  templates: TemuTitleTemplate[];
  total: number;
}

// 创建标题模板请求
export interface CreateTemuTitleTemplateRequest {
  name: string;
  productCategoryId?: string;
  categoryKeywordsZh?: string;
  categoryKeywordsEn?: string;
  productSpec?: string;
  productUsage?: string;
  theme?: string;
  festivalKeywords?: string;
}

// 更新标题模板请求
export interface UpdateTemuTitleTemplateRequest {
  name: string;
  productCategoryId?: string;
  categoryKeywordsZh?: string;
  categoryKeywordsEn?: string;
  productSpec?: string;
  productUsage?: string;
  theme?: string;
  festivalKeywords?: string;
  sampleTitleZh?: string;
  sampleTitleEn?: string;
  isActive: boolean;
}

// 标题预览请求
export interface TitlePreviewRequest {
  categoryKeywordsZh?: string;
  categoryKeywordsEn?: string;
  productSpec?: string;
  productUsage?: string;
  theme?: string;
  festivalKeywords?: string;
}

// 标题预览响应
export interface TitlePreviewResponse {
  titleZh: string;
  titleEn: string;
}

export const temuTitleTemplateService = {
  // 获取所有标题模板
  getAllTemplates: async (activeOnly = false): Promise<TemuTitleTemplateListResponse> => {
    const response = await apiClient.get('/temu-title-templates', {
      params: activeOnly ? { activeOnly: 'true' } : {},
    });
    return response.data;
  },

  // 根据 ID 获取标题模板
  getTemplateById: async (id: string): Promise<TemuTitleTemplate> => {
    const response = await apiClient.get(`/temu-title-templates/${id}`);
    return response.data;
  },

  // 创建标题模板
  createTemplate: async (data: CreateTemuTitleTemplateRequest): Promise<TemuTitleTemplate> => {
    const response = await apiClient.post('/temu-title-templates', data);
    return response.data;
  },

  // 更新标题模板
  updateTemplate: async (id: string, data: UpdateTemuTitleTemplateRequest): Promise<TemuTitleTemplate> => {
    const response = await apiClient.put(`/temu-title-templates/${id}`, data);
    return response.data;
  },

  // 删除标题模板
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/temu-title-templates/${id}`);
  },

  // 标题效果预览
  previewTitle: async (data: TitlePreviewRequest): Promise<TitlePreviewResponse> => {
    const response = await apiClient.post('/temu-title-templates/preview', data);
    return response.data;
  },
};
