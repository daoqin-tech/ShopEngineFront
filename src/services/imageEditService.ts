import { apiClient } from '@/lib/api'
import { 
  ImageEditProject, 
  ImageEditProjectDetail,
  CreateProjectRequest, 
  EditRequest,
  FillRequest,
  EditTaskResponse,
  FillTaskResponse,
  TaskStatusResponse,
  TaskStatus
} from '@/types/imageEdit'

// 项目管理相关API
export const projectApi = {
  // 获取项目列表
  async getProjects(): Promise<ImageEditProject[]> {
    const response = await apiClient.get('/image-edit-projects')
    return response.data || []
  },

  // 获取项目详情
  async getProject(id: string): Promise<ImageEditProjectDetail | null> {
    try {
      const response = await apiClient.get(`/image-edit-projects/${id}`)
      return response.data || null
    } catch (error) {
      console.error('Failed to fetch project:', error)
      return null
    }
  },

  // 创建项目
  async createProject(data: CreateProjectRequest): Promise<ImageEditProject> {
    const response = await apiClient.post('/image-edit-projects', data)
    return response.data
  },

  // 删除项目
  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/image-edit-projects/${id}`)
  },

  // 导出项目所有图片
  async exportProject(id: string): Promise<Blob> {
    const response = await apiClient.get(`/image-edit-projects/${id}/export`, {
      responseType: 'blob'
    })
    return response.data
  }
}

// 图片编辑相关API
export const editApi = {
  // 执行图片编辑
  async editImage(request: EditRequest): Promise<EditTaskResponse> {
    const response = await apiClient.post(
      `/image-edit/edit`,
      request
    )

    return response.data
  },

  // 执行图片填充（FillMode专用）
  async fillImage(request: FillRequest): Promise<FillTaskResponse> {
    const response = await apiClient.post(
      `/image-edit/fill`,
      request
    )

    return response.data
  },

  // 获取编辑历史
  async getEditHistory(imageId: string): Promise<any[]> {
    const response = await apiClient.get(`/images/${imageId}/edit-history`)
    return response.data || []
  },

  // 批量编辑图片
  async batchEdit(requests: EditRequest[]): Promise<{ imageId: string; resultImageUrl: string }[]> {
    const response = await apiClient.post(
      '/images/batch-edit',
      { requests },
      {
        timeout: 300000, // 批量处理需要更长时间
      }
    )

    return response.data || []
  },

  // 检查编辑状态（用于轮询）
  async checkEditStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await apiClient.get(`/image-edit/${taskId}/status`)
    return response.data || { status: TaskStatus.FAILED }
  }
}

// Flux模型相关API
export const fluxApi = {
  // 获取模型信息
  async getModelInfo(): Promise<any> {
    const response = await apiClient.get('/flux/models/kontext')
    return response.data
  },

  // 检查模型状态
  async checkModelStatus(): Promise<{ available: boolean; queue?: number }> {
    const response = await apiClient.get('/flux/status')
    return response.data || { available: false }
  }
}

// 文件上传工具函数
export const uploadUtils = {
  // 验证文件类型
  validateImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    return allowedTypes.includes(file.type)
  },

  // 验证文件大小（10MB限制）
  validateFileSize(file: File, maxSizeMB: number = 10): boolean {
    return file.size <= maxSizeMB * 1024 * 1024
  },

  // 批量验证文件
  validateFiles(files: File[]): { valid: File[]; invalid: { file: File; reason: string }[] } {
    const valid: File[] = []
    const invalid: { file: File; reason: string }[] = []

    files.forEach(file => {
      if (!this.validateImageFile(file)) {
        invalid.push({ file, reason: '不支持的文件格式' })
      } else if (!this.validateFileSize(file)) {
        invalid.push({ file, reason: '文件大小超过10MB' })
      } else {
        valid.push(file)
      }
    })

    return { valid, invalid }
  },

  // 创建图片预览URL
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  },

  // 释放预览URL
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  }
}

// 导出所有API
export default {
  project: projectApi,
  edit: editApi,
  flux: fluxApi,
  utils: uploadUtils
}