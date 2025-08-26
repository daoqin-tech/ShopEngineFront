import { apiClient } from '@/lib/api'
import { 
  OcrProject, 
  OcrProjectDetail,
  OcrRecord, 
  OcrRequest,
  OcrResponse
} from '@/types/ocr'

// 项目管理相关API
export const ocrProjectApi = {
  // 获取项目列表
  async getProjects(): Promise<OcrProject[]> {
    const response = await apiClient.get('/ocr-projects')
    return response.data || []
  },

  // 获取项目详情
  async getProject(id: string): Promise<OcrProjectDetail | null> {
    try {
      const response = await apiClient.get(`/ocr-projects/${id}`)
      return response.data || null
    } catch (error) {
      console.error('Failed to fetch OCR project:', error)
      return null
    }
  },

  // 创建项目
  async createProject(): Promise<OcrProject> {
    const response = await apiClient.post('/ocr-projects')
    return response.data
  },

  // 更新项目
  async updateProject(id: string, data: { name?: string }): Promise<OcrProject> {
    const response = await apiClient.patch(`/ocr-projects/${id}`, data)
    return response.data
  },

  // 删除项目
  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/ocr-projects/${id}`)
  },

  // 导出项目所有识别结果
  async exportProject(id: string): Promise<Blob> {
    const response = await apiClient.get(`/ocr-projects/${id}/export`, {
      responseType: 'blob'
    })
    return response.data
  }
}

// 图片管理相关API
export const ocrImageApi = {
  // 上传图片到项目
  async uploadImages(projectId: string, files: File[]): Promise<string[]> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })
    formData.append('projectId', projectId)

    const response = await apiClient.post(
      `/ocr-projects/${projectId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 上传可能需要更长时间
      }
    )

    return response.data || []
  },

  // 获取项目图片列表
  async getProjectImages(projectId: string): Promise<string[]> {
    const response = await apiClient.get(`/ocr-projects/${projectId}/images`)
    return response.data || []
  },
}

// OCR识别相关API
export const ocrRecognitionApi = {
  // 执行OCR识别
  async recognizeImage(request: OcrRequest): Promise<OcrResponse> {
    const response = await apiClient.post(
      `/image-analysis/analyze`,
      request,
      {
        timeout: 120000, // 60秒超时，因为OCR识别是同步处理可能较慢
      }
    )

    return response.data
  },

  // 批量OCR识别
  async batchRecognize(requests: OcrRequest[]): Promise<OcrResponse[]> {
    const response = await apiClient.post(
      '/ocr/batch-recognize',
      { requests },
      {
        timeout: 300000, // 批量处理需要更长时间
      }
    )

    return response.data || []
  },


  // 获取OCR历史记录
  async getOcrHistory(projectId: string): Promise<OcrRecord[]> {
    const response = await apiClient.get(`/ocr-projects/${projectId}/history`)
    return response.data || []
  }
}

// 文件上传工具函数
export const ocrUploadUtils = {
  // 验证图片文件
  validateImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff']
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
  },

  // 检查图片是否适合OCR（基于图片尺寸和清晰度的基本检查）
  async validateImageForOcr(file: File): Promise<{ valid: boolean; reason?: string }> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        
        // 基本尺寸检查
        if (img.width < 100 || img.height < 100) {
          resolve({ valid: false, reason: '图片尺寸过小，建议至少100x100像素' })
          return
        }
        
        // 图片太大可能影响识别速度
        if (img.width > 4000 || img.height > 4000) {
          resolve({ valid: false, reason: '图片尺寸过大，建议小于4000x4000像素' })
          return
        }
        
        resolve({ valid: true })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ valid: false, reason: '无法读取图片文件' })
      }
      
      img.src = url
    })
  }
}

// 导出所有API
export default {
  project: ocrProjectApi,
  image: ocrImageApi,
  recognition: ocrRecognitionApi,
  utils: ocrUploadUtils
}