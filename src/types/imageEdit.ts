// 图片编辑项目
export interface ImageEditProject {
  id: string
  name: string
  createdAt: Date | string  // API返回字符串，前端可转换为Date
  updatedAt: Date | string  // API返回字符串，前端可转换为Date
  count: number  // 项目中图片总数
  thumbnail?: string  // 项目缩略图URL
}

// 编辑操作参数
export interface EditParameters {
  strength?: number        // 强度 0-1
  iterations?: number      // 迭代次数
  aspectRatio?: string     // 宽高比
  outputFormat?: 'jpg' | 'png' | 'webp'
  maskData?: string        // Base64编码的遮罩数据
}

// 编辑操作记录
export interface EditOperation {
  id: string
  type: 'edit' | 'fill'
  prompt: string
  sourceImageUrl: string    // 源图片URL
  resultImageUrl: string    // 编辑后生成的图片URL
  referenceImages?: string[] // 参考图片URLs
  createdAt: Date | string  // API返回字符串，前端可转换为Date
}

// 图片编辑项目详情（包含编辑历史）
export interface ImageEditProjectDetail extends ImageEditProject {
  editHistory: EditOperation[]
}

// 编辑模式
export type EditMode = 'edit' | 'fill' | 'history'

// 任务状态
export enum TaskStatus {
  PENDING = 'pending',      // 刚创建，未提交
  QUEUED = 'queued',        // 已提交到队列，排队等待
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed',   // 生成成功
  FAILED = 'failed'         // 生成失败
}

// 编辑请求
export interface EditRequest {
  projectId: string
  prompt: string
  imageUrl: string
}

// 填充模式请求
export interface FillRequest {
  projectId: string
  prompt: string
  imageUrl: string
  maskData: string  // Base64编码的mask数据
}

// 编辑任务响应
export interface EditTaskResponse {
  taskId: string
  status: TaskStatus
}

// 填充任务响应
export interface FillTaskResponse {
  taskId: string
  status: TaskStatus
}

// 任务状态检查响应
export interface TaskStatusResponse {
  taskId: string
  status: TaskStatus
  errorMessage?: string
  resultImageUrl?: string
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 创建项目请求
export interface CreateProjectRequest {
  name: string
}

// 上传图片请求
export interface UploadImageRequest {
  projectId: string
  files: File[]
}