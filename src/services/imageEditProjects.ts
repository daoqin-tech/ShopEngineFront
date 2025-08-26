import { apiClient } from '@/lib/api'
import { ImageEditProject } from '@/types/imageEdit'

// API接口定义
export const ImageEditProjectsAPI = {
  // 获取项目列表
  async getImageEditProjects(): Promise<ImageEditProject[]> {
    const response = await apiClient.get('/image-edit-projects')
    return response.data
  },

  // 创建项目
  async createImageEditProject(): Promise<ImageEditProject> {
    const response = await apiClient.post('/image-edit-projects')
    return response.data
  },

  // 更新项目
  async updateImageEditProject(id: string, data: { name?: string }): Promise<ImageEditProject> {
    const response = await apiClient.patch(`/image-edit-projects/${id}`, data)
    return response.data
  },

  // 删除项目
  async deleteImageEditProject(id: string): Promise<void> {
    await apiClient.delete(`/image-edit-projects/${id}`)
  },

  // 获取单个项目详情
  async getImageEditProject(id: string): Promise<ImageEditProject> {
    const response = await apiClient.get(`/image-edit-projects/${id}`)
    return response.data
  }
}