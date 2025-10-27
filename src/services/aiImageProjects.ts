import { apiClient } from '@/lib/api';


export interface AIImageProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  totalTasks: number;
  pendingTasks: number;
  queuedTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
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
  static async getAIImageProjects(params?: {
    page?: number;
    limit?: number;
    name?: string;       // 项目名称搜索
    startTime?: number;  // 秒级时间戳
    endTime?: number;    // 秒级时间戳
  }): Promise<AIImageProjectsListResponse> {
    const response = await apiClient.get('/projects', {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 50,
        ...(params?.name && { name: params.name }),
        ...(params?.startTime && { startTime: params.startTime }),
        ...(params?.endTime && { endTime: params.endTime })
      }
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

  // 批量重新生成AI图片项目
  static async regenerateAIImageProjects(projectIds: string[]): Promise<null> {
    const response = await apiClient.post('/projects/regenerate', {
      projectIds
    });
    return response.data;
  }

  // 批量拆分项目
  static async splitProjects(projectIds: string[], splitCount: number): Promise<null> {
    const response = await apiClient.post('/projects/split', {
      projectIds,
      splitCount
    });
    return response.data;
  }

  // 动态复制项目（基于AI生成相似提示词）
  static async dynamicCopyProjects(projectIds: string[], count: number): Promise<null> {
    const response = await apiClient.post('/projects/dynamic-copy', {
      projectIds,
      count
    });
    return response.data;
  }

  // 获取模板匹配信息
  static async getTemplateMatchInfo(projectIds: string[], templateProjectId: string): Promise<any> {
    const response = await apiClient.post('/projects/template-match', {
      projectIds,
      templateProjectId
    });
    return response.data;
  }
}