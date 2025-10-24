// 矩形选区
export interface CropArea {
  id: string;
  x: number; // 左上角 x 坐标
  y: number; // 左上角 y 坐标
  width: number;
  height: number;
}

// 矩形选区(带上传URL)
export interface CropAreaWithUrl extends CropArea {
  croppedImageUrl?: string; // 上传到腾讯云后的URL
  uploading?: boolean; // 是否正在上传
  uploadError?: string; // 上传错误信息
}

// 截图结果
export interface CroppedImage {
  id: string;
  sourceImageId: string; // 来源图片ID
  sourceImageUrl: string; // 来源图片URL
  croppedImageUrl: string; // 截图URL(腾讯云)
  cropArea: CropArea; // 裁剪区域
  prompt?: string; // AI生成的提示词
  promptGenerating?: boolean; // 提示词生成中
  platform: 'temu' | 'amazon' | 'etsy';
  createdAt: string;
}

// 批量生成提示词的请求
export interface BatchGeneratePromptsRequest {
  sourceImageId: string; // 原图ID（后端可从此获取platform信息）
  images: Array<{ imageUrl: string }>;
}

// 批量生成提示词的响应（已经过axios拦截器处理，只有data部分）
export interface BatchGeneratePromptsResponse {
  items: CroppedImageRecord[];
  summary: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

// 历史截图记录（后端返回的格式）
export interface CroppedImageRecord {
  id: string;
  sourceImageId: string;
  imageUrl: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

// 查询历史截图的响应（已经过axios拦截器处理，只有data部分）
export interface GetCroppedImagesResponse {
  sourceImageId: string;
  items: CroppedImageRecord[];
}

// 加入对话的请求
export interface AddToConversationRequest {
  projectId: string;  // 项目ID
  ids: string[];      // 截图记录ID数组
}
