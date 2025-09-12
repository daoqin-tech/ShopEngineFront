import { apiClient } from '@/lib/api'
import { 
  CoverProject, 
  CoverGenerationRequest, 
  CoverGenerationResponse,
  GeneratedCover,
  BatchGenerationStatus
} from '@/types/template'

// 模板选择项（用于cover projects）
// 切片数据类型（简化版，只包含预览需要的信息）
export interface SlicingData {
  regions: {
    id: string
    x: number
    y: number
    width: number
    height: number
    index: number
  }[]
}

export interface TemplateSelectionItem {
  id: string
  name: string
  thumbnailUrl: string
  psdUrl: string
  status: string
  width: number
  height: number
  slicing?: SlicingData
  createdAt: string
  updatedAt: string
}

// 简单图片信息接口
export interface SimpleImageInfo {
  id: string
  imageUrl: string
  createdAt: string
  status: string
  width: number
  height: number
}

// 本地替换图片接口
interface ReplacementImage {
  id: string
  originalName: string
  url: string
  width: number
  height: number
  fileSize: number
}

// 套图项目API
export const coverProjectService = {
  // 获取套图项目列表
  getProjects: async (): Promise<CoverProject[]> => {
    const response = await apiClient.get('/cover-projects')
    return response.data
  },

  // 获取单个项目详情
  getProject: async (projectId: string): Promise<CoverProject> => {
    const response = await apiClient.get(`/cover-projects/${projectId}`)
    return response.data
  },

  // 创建套图项目
  createProject: async (): Promise<CoverProject> => {
    const response = await apiClient.post('/cover-projects')
    return response.data
  },

  // 更新项目信息
  updateProject: async (projectId: string, updates: Partial<CoverProject>): Promise<CoverProject> => {
    const response = await apiClient.put(`/cover-projects/${projectId}`, updates)
    return response.data
  },

  // 删除项目
  deleteProject: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/cover-projects/${projectId}`)
  },

  // 设置项目使用的模板
  setProjectTemplate: async (projectId: string, templateId: string): Promise<CoverProject> => {
    const response = await apiClient.put(`/cover-projects/${projectId}/template`, { templateId })
    return response.data
  },

  // 获取所有模板（用于模板选择）
  getTemplates: async (params?: { name?: string }): Promise<TemplateSelectionItem[]> => {
    const response = await apiClient.get('/cover-projects/templates', { params })
    return response.data
  },

  // 获取AI项目列表（用于项目选择）
  getAIProjects: async (params?: { page?: number; limit?: number; name?: string }) => {
    const response = await apiClient.get('/cover-projects/projects', { params })
    return response.data
  },

  // 批量获取项目图片
  batchGetImages: async (projectIds: string[]): Promise<Record<string, SimpleImageInfo[]>> => {
    const response = await apiClient.post('/cover-projects/images', {
      projectIds
    })
    return response.data
  },

  // 开始生成套图
  startCoverGeneration: async (params: {
    coverProjectId: string
    templateId: string
    aiProjectIds: string[]
  }): Promise<{
    taskId: string
    status: string
  }> => {
    const response = await apiClient.post(`/cover-projects/${params.coverProjectId}/generate`, {
      templateId: params.templateId,
      aiProjectIds: params.aiProjectIds
    })
    return response.data
  }
}

// 素材管理API
export const replacementImageService = {
  // 上传替换图片
  uploadImages: async (projectId: string, files: File[]): Promise<ReplacementImage[]> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })

    const response = await apiClient.post(`/cover-projects/${projectId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
    return response.data
  },

  // 获取项目的替换图片列表
  getProjectImages: async (projectId: string): Promise<ReplacementImage[]> => {
    const response = await apiClient.get(`/cover-projects/${projectId}/images`)
    return response.data
  },

  // 删除替换图片
  deleteImage: async (projectId: string, imageId: string): Promise<void> => {
    await apiClient.delete(`/cover-projects/${projectId}/images/${imageId}`)
  },

  // 批量删除替换图片
  deleteImages: async (projectId: string, imageIds: string[]): Promise<void> => {
    await apiClient.delete(`/cover-projects/${projectId}/images`, {
      data: { imageIds }
    })
  }
}

// 套图生成API
export const coverGenerationService = {
  // 开始批量生成
  startGeneration: async (request: CoverGenerationRequest): Promise<CoverGenerationResponse> => {
    const response = await apiClient.post('/cover-generation/batch', request)
    return response.data
  },

  // 查询生成状态
  getGenerationStatus: async (projectId: string): Promise<BatchGenerationStatus> => {
    const response = await apiClient.get(`/cover-generation/status/${projectId}`)
    return response.data
  },

  // 获取生成结果
  getGeneratedCovers: async (projectId: string, params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<{
    covers: GeneratedCover[]
    total: number
    page: number
    limit: number
  }> => {
    const response = await apiClient.get(`/cover-projects/${projectId}/covers`, { params })
    return response.data
  },

  // 重新生成单个套图
  regenerateCover: async (projectId: string, coverId: string): Promise<GeneratedCover> => {
    const response = await apiClient.post(`/cover-projects/${projectId}/covers/${coverId}/regenerate`)
    return response.data
  },

  // 删除生成的套图
  deleteCover: async (projectId: string, coverId: string): Promise<void> => {
    await apiClient.delete(`/cover-projects/${projectId}/covers/${coverId}`)
  },

  // 批量删除套图
  deleteCovers: async (projectId: string, coverIds: string[]): Promise<void> => {
    await apiClient.delete(`/cover-projects/${projectId}/covers`, {
      data: { coverIds }
    })
  },

  // 下载单个套图
  downloadCover: async (projectId: string, coverId: string, format: 'jpg' | 'png' = 'jpg'): Promise<Blob> => {
    const response = await apiClient.get(`/cover-projects/${projectId}/covers/${coverId}/download`, {
      params: { format },
      responseType: 'blob'
    })
    return response.data
  },

  // 批量下载套图（ZIP）
  downloadCoversZip: async (projectId: string, coverIds?: string[]): Promise<Blob> => {
    const response = await apiClient.post(`/cover-projects/${projectId}/covers/download-zip`, 
      { coverIds },
      { responseType: 'blob' }
    )
    return response.data
  }
}

// 任务轮询服务（复用现有的 taskPollingService）
export class CoverGenerationPollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  // 开始轮询生成状态
  startPolling(
    projectId: string, 
    onUpdate: (status: BatchGenerationStatus) => void,
    onComplete: (status: BatchGenerationStatus) => void,
    onError: (error: Error) => void,
    interval: number = 2000
  ) {
    // 清除现有的轮询
    this.stopPolling(projectId)

    const poll = async () => {
      try {
        const status = await coverGenerationService.getGenerationStatus(projectId)
        onUpdate(status)

        // 检查是否完成
        if (status.completedTasks + status.failedTasks >= status.totalTasks) {
          this.stopPolling(projectId)
          onComplete(status)
        }
      } catch (error) {
        this.stopPolling(projectId)
        onError(error as Error)
      }
    }

    // 立即执行一次
    poll()

    // 设置定时轮询
    const intervalId = setInterval(poll, interval)
    this.pollingIntervals.set(projectId, intervalId)
  }

  // 停止轮询
  stopPolling(projectId: string) {
    const intervalId = this.pollingIntervals.get(projectId)
    if (intervalId) {
      clearInterval(intervalId)
      this.pollingIntervals.delete(projectId)
    }
  }

  // 停止所有轮询
  stopAllPolling() {
    this.pollingIntervals.forEach(intervalId => clearInterval(intervalId))
    this.pollingIntervals.clear()
  }
}

// 导出轮询服务实例
export const coverPollingService = new CoverGenerationPollingService()