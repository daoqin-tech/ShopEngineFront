import { apiClient } from '@/lib/api'
import { 
  Template, 
  PSDUploadResponse,
  TemplateParseStatus 
} from '@/types/template'

// 模板管理API
export const templateService = {
  // 获取模板列表
  getTemplates: async (): Promise<Template[]> => {
    const response = await apiClient.get('/templates')
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

  // 查询PSD解析状态
  getParseStatus: async (templateId: string): Promise<TemplateParseStatus> => {
    const response = await apiClient.get(`/templates/${templateId}/parse-status`)
    return response.data
  },

  // 更新模板信息
  updateTemplate: async (templateId: string, updates: Partial<Template>): Promise<Template> => {
    const response = await apiClient.put(`/templates/${templateId}`, updates)
    return response.data
  },

  // 删除模板
  deleteTemplate: async (templateId: string): Promise<void> => {
    await apiClient.delete(`/templates/${templateId}`)
  },

  // 创建模板
  createTemplate: async (): Promise<Template> => {
    const response = await apiClient.post('/templates')
    return response.data
  },

  // 获取模板分类
  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/templates/categories')
    return response.data
  },

  // 解析PSD文件（通过文件URL）
  parsePSDFile: async (fileUrl: string, fileName: string, projectId?: string): Promise<Template> => {
    const response = await apiClient.post('/templates/parse-psd', {
      fileUrl,
      fileName,
      projectId
    })
    return response.data
  }
}

// 图层操作API
export const layerService = {
  // 更新图层
  updateLayer: async (templateId: string, layerId: string, updates: any): Promise<void> => {
    await apiClient.put(`/templates/${templateId}/layers/${layerId}`, updates)
  },

  // 删除图层
  deleteLayer: async (templateId: string, layerId: string): Promise<void> => {
    await apiClient.delete(`/templates/${templateId}/layers/${layerId}`)
  },

  // 添加图层
  addLayer: async (templateId: string, layer: any): Promise<any> => {
    const response = await apiClient.post(`/templates/${templateId}/layers`, layer)
    return response.data
  },

  // 复制图层
  duplicateLayer: async (templateId: string, layerId: string): Promise<any> => {
    const response = await apiClient.post(`/templates/${templateId}/layers/${layerId}/duplicate`)
    return response.data
  },

  // 重新排序图层
  reorderLayers: async (templateId: string, layerIds: string[]): Promise<void> => {
    await apiClient.put(`/templates/${templateId}/layers/reorder`, { layerIds })
  }
}