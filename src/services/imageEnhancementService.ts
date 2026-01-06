import { apiClient } from '@/lib/api';

export interface EnhanceResultItem {
  originalUrl: string;
  enhancedUrl: string;
  cached: boolean;
  success: boolean;
  error?: string;
}

export interface BatchEnhanceResponse {
  total: number;
  cached: number;
  processed: number;
  failed: number;
  results: Record<string, EnhanceResultItem>;
}

export const imageEnhancementService = {
  /**
   * 单张图片超分增强
   * @param imageUrl 图片URL
   * @returns 增强结果
   */
  enhanceSingle: async (imageUrl: string): Promise<EnhanceResultItem> => {
    const response = await apiClient.post(
      '/image-enhancement/enhance',
      { imageUrl },
      { timeout: 60000 } // 单张图片60秒超时
    );
    return response.data as EnhanceResultItem;
  },

  /**
   * 获取超分后的图片URL映射（逐张处理，避免超时）
   * @param imageUrls 原图URL数组
   * @param onProgress 进度回调 (current, total)
   * @returns Map<原图URL, 超分后URL>
   * @throws 如果有任何图片增强失败，抛出错误
   */
  getEnhancedUrlMap: async (
    imageUrls: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> => {
    const urlMap = new Map<string, string>();

    if (imageUrls.length === 0) {
      return urlMap;
    }

    // 逐张处理，避免Cloudflare 524超时
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];

      if (onProgress) {
        onProgress(i + 1, imageUrls.length);
      }

      console.log(`画质增强 (${i + 1}/${imageUrls.length}):`, imageUrl);

      const result = await imageEnhancementService.enhanceSingle(imageUrl);

      if (!result.success) {
        throw new Error(`画质增强失败: ${result.error || '未知错误'}\n图片: ${imageUrl}`);
      }

      urlMap.set(imageUrl, result.enhancedUrl);
      console.log('映射:', imageUrl, '->', result.enhancedUrl);
    }

    console.log('最终URL映射:', Object.fromEntries(urlMap));
    return urlMap;
  }
};
