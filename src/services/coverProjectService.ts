import { apiClient } from '@/lib/api'
import {
  CoverGenerationRequest,
  CoverGenerationResponse,
  GeneratedCover,
  BatchGenerationStatus
} from '@/types/template'

// 模板搜索项（只包含id和name）
export interface TemplateSearchItem {
  id: string
  name: string
}

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
  layerCount: number
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

// 任务信息类型
export interface TaskInfo {
  taskId: string
  aiProjectId: string
  projectName?: string // 项目名称
  templateId?: string  // 模板ID，用于多模板生成
  templateName?: string // 模板名称
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  resultImages?: string[]
  thumbnail?: string   // 缩略图，取ResultImages的第一个
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

// 重新生成失败任务请求
export interface RestartFailedTasksRequest {
  taskIds: string[]
}

// 重新生成失败任务响应
export interface RestartFailedTasksResponse {
  tasks: {
    taskId: string
    aiProjectId: string
    status: string
  }[]
}

// 任务统计响应
export interface TaskStatsResponse {
  totalTasks: number      // 总任务数
  pendingTasks: number    // 等待中任务数
  queuedTasks: number     // 队列中任务数
  processingTasks: number // 处理中任务数
  completedTasks: number  // 已完成任务数
  failedTasks: number     // 失败任务数
}

// 套图项目API
export const coverProjectService = {
  // 获取所有套图生成任务（分页）
  getAllTasks: async (params: {
    page: number
    limit: number
    status?: string
    templateId?: string
    startTime?: number
    endTime?: number
    search?: string
  }): Promise<{
    data: TaskInfo[]
    total: number
    page: number
    limit: number
  }> => {
    const response = await apiClient.get('/cover-generate/tasks', { params })
    return response.data
  },

  // 获取所有已完成的套图（用于商品图选择）
  getAllCovers: async (params: {
    page?: number
    limit?: number
    status?: string
  }): Promise<{
    data: TaskInfo[]
    total: number
    page: number
    limit: number
  }> => {
    const response = await apiClient.get('/cover-generate/covers', { params })
    return response.data
  },

  // 获取所有模板（用于模板选择）
  getTemplates: async (params?: { name?: string }): Promise<TemplateSelectionItem[]> => {
    const response = await apiClient.get('/cover-generate/templates', { params })
    return response.data
  },

  // 获取模板搜索选项（只包含id和name）
  getTemplatesForSearch: async (): Promise<TemplateSearchItem[]> => {
    const response = await apiClient.get('/cover-generate/templatesForSearch')
    return response.data
  },

  // 获取AI项目列表（用于项目选择）
  getAIProjects: async (params?: { page?: number; limit?: number; name?: string }) => {
    const response = await apiClient.get('/cover-generate/projects', { params })
    return response.data
  },

  // 获取单个项目图片
  getProjectImages: async (projectId: string): Promise<SimpleImageInfo[]> => {
    const response = await apiClient.post('/cover-generate/images', {
      projectId
    })
    return response.data
  },

  // 开始生成套图
  startCoverGeneration: async (params: {
    templateId: string
    aiProjectIds: string[]
  }): Promise<{
    tasks: {
      taskId: string
      aiProjectId: string
      status: string
    }[]
  }> => {
    const response = await apiClient.post('/cover-generate/start', {
      templateId: params.templateId,
      aiProjectIds: params.aiProjectIds
    })
    return response.data
  },

  // 重新生成失败任务
  restartFailedTasks: async (request: RestartFailedTasksRequest): Promise<RestartFailedTasksResponse> => {
    const response = await apiClient.post<RestartFailedTasksResponse>('/cover-generate/restart', request)
    return response.data
  },

  // 获取任务统计
  getTaskStats: async (): Promise<TaskStatsResponse> => {
    const response = await apiClient.get('/cover-generate/tasks/stats')
    return response.data
  },

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
    const response = await apiClient.get(`/cover-generate/tasks/${taskId}`)
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
    const response = await apiClient.get(`/cover-generate/${projectId}/covers`, { params })
    return response.data
  },

  // 重新生成单个套图
  regenerateCover: async (projectId: string, coverId: string): Promise<GeneratedCover> => {
    const response = await apiClient.post(`/cover-generate/${projectId}/covers/${coverId}/regenerate`)
    return response.data
  },

  // 删除生成的套图
  deleteCover: async (projectId: string, coverId: string): Promise<void> => {
    await apiClient.delete(`/cover-generate/${projectId}/covers/${coverId}`)
  },

  // 批量删除套图
  deleteCovers: async (projectId: string, coverIds: string[]): Promise<void> => {
    await apiClient.delete(`/cover-generate/${projectId}/covers`, {
      data: { coverIds }
    })
  },

  // 下载单个套图
  downloadCover: async (projectId: string, coverId: string, format: 'jpg' | 'png' = 'jpg'): Promise<Blob> => {
    const response = await apiClient.get(`/cover-generate/${projectId}/covers/${coverId}/download`, {
      params: { format },
      responseType: 'blob'
    })
    return response.data
  },

  // 批量下载套图（ZIP）
  downloadCoversZip: async (projectId: string, coverIds?: string[]): Promise<Blob> => {
    const response = await apiClient.post(`/cover-generate/${projectId}/covers/download-zip`,
      { coverIds },
      { responseType: 'blob' }
    )
    return response.data
  }
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