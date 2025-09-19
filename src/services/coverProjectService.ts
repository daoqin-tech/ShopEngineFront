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
  getProjects: async (params?: { page?: number; limit?: number }): Promise<{
    data: CoverProject[]
    total: number
    page: number
    limit: number
  }> => {
    const response = await apiClient.get('/cover-projects', {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 50
      }
    })

    // 处理后端返回的数据结构 {code, message, data}
    const backendData = response.data

    // 如果后端返回标准格式，直接返回
    if (backendData && backendData.data && Array.isArray(backendData.data)) {
      // 暂时模拟分页信息，等后端添加分页字段
      return {
        data: backendData.data,
        total: backendData.data.length, // 临时使用当前页数据长度
        page: params?.page || 1,
        limit: params?.limit || 50
      }
    }

    // 如果是数组直接返回(兼容旧格式)
    if (Array.isArray(backendData)) {
      return {
        data: backendData,
        total: backendData.length,
        page: params?.page || 1,
        limit: params?.limit || 50
      }
    }

    // 默认返回空数据
    return {
      data: [],
      total: 0,
      page: params?.page || 1,
      limit: params?.limit || 50
    }
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
    tasks: {
      taskId: string
      aiProjectId: string
      status: string
    }[]
  }> => {
    const response = await apiClient.post(`/cover-projects/${params.coverProjectId}/generate`, {
      templateId: params.templateId,
      aiProjectIds: params.aiProjectIds
    })
    return response.data
  },

  // 获取项目的所有任务
  getProjectTasks: async (projectId: string): Promise<TaskInfo[]> => {
    const response = await apiClient.get(`/cover-projects/projects/${projectId}/tasks`)
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

  // 查询单个任务状态
  getTaskStatus: async (taskId: string): Promise<{
    taskId: string
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
    resultImages?: string[]
    errorMessage?: string
    createdAt: string
    completedAt?: string
  }> => {
    const response = await apiClient.get(`/cover-projects/tasks/${taskId}`)
    return response.data
  },

  // 查询生成状态（保留兼容性）
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

// 任务信息类型
export interface TaskInfo {
  taskId: string
  aiProjectId: string
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  resultImages?: string[]
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

// 任务轮询服务
export class CoverGenerationPollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  // 开始轮询生成状态 - 新版本，基于TaskID
  startTaskPolling(
    tasks: { taskId: string; aiProjectId: string }[],
    onUpdate: (taskStatuses: TaskInfo[]) => void,
    onComplete: (taskStatuses: TaskInfo[]) => void,
    onError: (error: Error) => void,
    interval: number = 2000
  ) {
    const pollingKey = tasks.map(t => t.taskId).join(',')

    // 清除现有的轮询
    this.stopPolling(pollingKey)

    const poll = async () => {
      try {
        // 并行获取所有任务状态
        const taskPromises = tasks.map(task =>
          coverGenerationService.getTaskStatus(task.taskId)
            .then(status => ({ ...status, aiProjectId: task.aiProjectId }))
        )

        const taskStatuses = await Promise.all(taskPromises)
        onUpdate(taskStatuses)

        // 检查是否所有任务都完成
        const allCompleted = taskStatuses.every(task =>
          task.status === 'completed' || task.status === 'failed'
        )

        if (allCompleted) {
          this.stopPolling(pollingKey)
          onComplete(taskStatuses)
        }
      } catch (error) {
        this.stopPolling(pollingKey)
        onError(error as Error)
      }
    }

    // 立即执行一次
    poll()

    // 设置定时轮询
    const intervalId = setInterval(poll, interval)
    this.pollingIntervals.set(pollingKey, intervalId)
  }

  // 开始轮询生成状态 - 旧版本，保持兼容性
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
  stopPolling(key: string) {
    const intervalId = this.pollingIntervals.get(key)
    if (intervalId) {
      clearInterval(intervalId)
      this.pollingIntervals.delete(key)
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