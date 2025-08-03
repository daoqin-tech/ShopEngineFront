import { apiClient } from '@/lib/api';


export interface AIImageProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
  thumbnail?: string;
}

export interface CreateAIImageProjectRequest {
  name: string;
}

export interface UpdateAIImageProjectRequest {
  name?: string;
  imageCount?: number;
  thumbnail?: string;
}

export interface AIImageProjectsListResponse {
  data: AIImageProject[];
  total: number;
  page: number;
  limit: number;
}

export class AIImageProjectsAPI {
  // 获取AI图片项目列表
  static async getAIImageProjects(page: number = 1, limit: number = 20): Promise<AIImageProjectsListResponse> {
    const response = await apiClient.get('/projects', {
      params: { page, limit }
    });
    return response.data;
  }

  // 获取单个AI图片项目详情
  static async getAIImageProject(id: string): Promise<AIImageProject> {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  }

  // 创建AI图片项目
  static async createAIImageProject(data: CreateAIImageProjectRequest): Promise<AIImageProject> {
    const response = await apiClient.post('/projects', data);
    return response.data;
  }

  // 更新AI图片项目
  static async updateAIImageProject(id: string, data: UpdateAIImageProjectRequest): Promise<AIImageProject> {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data;
  }

  // 删除AI图片项目
  static async deleteAIImageProject(id: string): Promise<null> {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  }
}