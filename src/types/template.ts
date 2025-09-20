// 模板套图功能相关类型定义

// 图层类型
export enum LayerType {
  IMAGE = 'image',           // 普通图片图层
  SMART_OBJECT = 'smart_object', // 智能对象图层（可替换）
  TEXT = 'text',             // 文本图层
  ARTBOARD = 'artboard'      // 画板图层（PSD画板背景）
}

// 图层信息
export interface Layer {
  // 基础信息 - 直接映射
  id: string                    // 映射自 layer_id 或生成
  name: string                  // 直接映射 name
  type: LayerType              // 映射 type (需要类型转换)

  // 位置和尺寸 - 从 bounds 映射
  x: number                    // bounds.x
  y: number                    // bounds.y  
  width: number                // bounds.width
  height: number               // bounds.height

  // 显示状态
  zIndex: number               // z_index
  visible: boolean             // visible
  replaceable: boolean         // type === 'smart_object'

  // 内容
  content?: string             // text_info?.text_content 或图片数据

  // 样式
  style?: {
    // 基础样式
    opacity?: number           // opacity (0-100)

    // 文本样式 - 从 text_info 映射
    fontSize?: number          // text_info.font_size
    fontFamily?: string        // text_info.font_family
    color?: string            // text_info.font_color
    textAlign?: 'left' | 'center' | 'right' | 'justify'  // text_info.text_align
    lineHeight?: number        // text_info.line_height
    letterSpacing?: number     // text_info.letter_spacing
    textOrientation?: 'horizontal' | 'vertical'  // 文本方向
    writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr'  // CSS writing-mode

    // 阴影效果 - 从 effects.drop_shadow 映射
    shadow?: {
      enabled: boolean         // effects.drop_shadow.enabled
      blend_mode: string       // effects.drop_shadow.blend_mode
      color: string           // effects.drop_shadow.color
      opacity: number         // effects.drop_shadow.opacity
      angle: number           // effects.drop_shadow.angle
      distance: number        // effects.drop_shadow.distance
      spread: number          // effects.drop_shadow.spread
      size: number            // effects.drop_shadow.size
      use_global_light: boolean // effects.drop_shadow.use_global_light
      knock_out: boolean      // effects.drop_shadow.knock_out
      inner_shadow: boolean   // effects.drop_shadow.inner_shadow
    }
  }
}

// 模板状态枚举
export type TemplateStatus = "pending" | "processing" | "success" | "failed"

// 分区信息
export interface SliceRegion {
  id: string
  x: number      // 分区左上角x坐标
  y: number      // 分区左上角y坐标  
  width: number  // 分区宽度
  height: number // 分区高度
  index: number  // 分区序号（用于排序）
}

// 模板信息
export interface Template {
  id: string
  name: string
  thumbnailUrl: string  // 预览图
  psdUrl?: string      // PSD文件URL
  status: TemplateStatus  // 模板状态
  width: number        // 模板宽度
  height: number       // 模板高度
  regionsCount: number // 生成图片个数
  layerIdsCount: number // 支持替换的图片数量
  data?: {
    width: number
    height: number
    layers: Layer[]
  }
  slicing?: {
    regions: SliceRegion[]
  }
  layerIds?: string[]  // 用户选择的需要替换的图层ID列表
  createdAt: string
  updatedAt: string
}

// PSD上传请求
export interface PSDUploadRequest {
  name: string
  description?: string
  file: File
}

// PSD上传响应
export interface PSDUploadResponse {
  templateId: string
  taskId: string
  status: string
}


// 套图项目统计信息
export interface CoverProjectStats {
  TotalTasks: number
  PendingTasks: number
  ProcessingTasks: number
  CompletedTasks: number
  FailedTasks: number
}

// 套图项目
export interface CoverProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  stats: CoverProjectStats
}


// 套图生成请求
export interface CoverGenerationRequest {
  projectId: string
  templateId: string
  replacements: {
    layerId: string         // 要替换的图层ID
    imageId?: string        // 替换的图片ID
    text?: string          // 替换的文本内容
  }[]
  outputWidth?: number
  outputHeight?: number
}

// 套图生成响应
export interface CoverGenerationResponse {
  taskId: string
  projectId: string
  status: string
}

// 生成的套图结果
export interface GeneratedCover {
  id: string
  projectId: string
  templateId: string
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  replacements: {
    layerId: string
    content: string  // 图片URL或文本内容
  }[]
}

// 批量生成状态
export interface BatchGenerationStatus {
  projectId: string
  totalTasks: number
  completedTasks: number
  failedTasks: number
  results: GeneratedCover[]
}