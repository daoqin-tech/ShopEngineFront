import { apiClient } from '@/lib/api'
import {
  Template,
  PSDUploadResponse,
  SliceRegion
} from '@/types/template'

// 模板管理API
export const templateService = {
  // 获取模板列表
  getTemplates: async (params?: {
    name?: string;
    startTime?: number;  // 秒级时间戳
    endTime?: number;    // 秒级时间戳
    page?: number;
    limit?: number;
  }): Promise<{
    data: Template[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get('/templates', {
      params: {
        ...(params?.name && { name: params.name }),
        ...(params?.startTime && { startTime: params.startTime }),
        ...(params?.endTime && { endTime: params.endTime }),
        page: params?.page || 1,
        limit: params?.limit || 50,
      }
    })
    return response.data
  },

  // 获取单个模板详情
  getTemplate: async (templateId: string): Promise<Template> => {
    const response = await apiClient.get(`/templates/${templateId}`)
    return response.data
  },

  // 上传PSD文件
  uploadPSD: async (file: File, name: string, description?: string): Promise<PSDUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    if (description) {
      formData.append('description', description)
    }

    const response = await apiClient.post('/templates/upload-psd', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // 上传进度回调
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`上传进度: ${progress}%`)
        }
      }
    })
    return response.data
  },

  // 更新模板名称
  updateTemplateName: async (templateId: string, name: string): Promise<void> => {
    await apiClient.put(`/templates/${templateId}`, { name })
  },

  // 更新模板内容
  updateTemplate: async (templateId: string, templateData: Partial<Template>): Promise<Template> => {
    const response = await apiClient.put(`/templates/${templateId}`, templateData)
    return response.data
  },

  // 更新模板分区
  updateSlicing: async (templateId: string, regions: SliceRegion[]): Promise<{ regions: SliceRegion[] }> => {
    const response = await apiClient.put(`/templates/${templateId}/slicing`, { regions })
    return response.data
  },

  // 更新需要替换的图层ID列表
  updateReplacementLayers: async (templateId: string, layerIds: string[]): Promise<void> => {
    await apiClient.put(`/templates/${templateId}/replacement-layers`, { layerIds })
  },

  // 删除模板
  deleteTemplate: async (templateId: string): Promise<void> => {
    await apiClient.delete(`/templates/${templateId}`)
  },

  // 创建模板
  createTemplate: async (data: { name: string; productCategoryId: string }): Promise<Template> => {
    const response = await apiClient.post('/templates', data)
    return response.data
  },

  // 获取模板分类
  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/templates/categories')
    return response.data
  },

  // 解析PSD文件（通过文件URL）- 后端异步处理，前端同步请求
  parsePSDFile: async (fileUrl: string, fileName: string, templateId?: string): Promise<any> => {
    const response = await apiClient.post('/templates/parse-psd', {
      fileUrl,
      fileName,
      templateId
    })
    return response.data
  }
}