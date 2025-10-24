// 第三方平台类型
export type Platform = 'temu' | 'amazon' | 'etsy';

// 抓取的商品图片项
export interface CapturedImage {
  id: string;
  platform: Platform;
  imageUrl: string;
  timestamp: number; // 毫秒级时间戳
  createdAt: string; // ISO 格式时间字符串
}

// 查询抓取图片的请求参数
export interface GetCapturedImagesRequest {
  platform?: Platform;
  startTime?: number; // 秒级时间戳
  endTime?: number; // 秒级时间戳
  page: number; // 页码，最小值1，必填
  limit: number; // 每页数量，最小值1，最大值200，必填
}

// 查询抓取图片的响应(只包含 data 内层,不包含 code 和 message)
export interface GetCapturedImagesResponse {
  total: number;
  page: number;
  limit: number;
  data: CapturedImage[];
}

// 删除抓取图片的请求参数
export interface DeleteCapturedImagesRequest {
  ids: string[];
}

// 删除抓取图片的响应(只包含 data 内层,不包含 code 和 message)
export interface DeleteCapturedImagesResponse {
  success?: boolean;
  message?: string;
}
