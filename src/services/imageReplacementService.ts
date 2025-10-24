import { apiClient } from '@/lib/api';

export interface ReplaceRegionRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  aiImageId: string;
}

export interface TemplateRequest {
  imageUrl: string;
  regions: ReplaceRegionRequest[];
}

export interface CreateReplacementTaskRequest {
  templates: TemplateRequest[];
}

export interface ReplacementTask {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  resultUrls: string[];
  errorMessage?: string;
}

export const imageReplacementService = {
  /**
   * 创建图片替换任务
   */
  createTask: async (projectId: string, request: CreateReplacementTaskRequest): Promise<ReplacementTask> => {
    const response = await apiClient.post<ReplacementTask>(
      `/projects/${projectId}/image-replacement/tasks`,
      request
    );
    return response.data;
  },

  /**
   * 查询替换任务状态
   */
  getTaskStatus: async (projectId: string, taskId: string): Promise<ReplacementTask> => {
    const response = await apiClient.get<ReplacementTask>(
      `/projects/${projectId}/image-replacement/tasks/${taskId}`
    );
    return response.data;
  },
};
