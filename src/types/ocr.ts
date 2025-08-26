// 以图识文项目
export interface OcrProject {
  id: string
  name: string
  createdAt: Date | string
  updatedAt: Date | string
  thumbnail?: string  // 项目缩略图URL
}

// OCR结果记录
export interface OcrRecord {
  id: string
  imageUrl: string
  extractedText: string
  createdAt: Date | string
}

// 以图识文项目详情（包含OCR历史记录）
export interface OcrProjectDetail extends OcrProject {
  ocrHistory: OcrRecord[]
}

// OCR请求
export interface OcrRequest {
  projectId: string
  imageUrl: string
}


// OCR响应
export interface OcrResponse {
  id: string
  projectId: string
  userId: string
  imageUrl: string
  description: string
  createdAt: string
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 创建项目请求
export interface CreateOcrProjectRequest {}

// 上传图片请求
export interface UploadImageRequest {
  projectId: string
  files: File[]
}

// OCR模式
export type OcrMode = 'upload' | 'history'