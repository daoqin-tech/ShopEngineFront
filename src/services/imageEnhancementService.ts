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
   * 批量图片超分增强
   * @param imageUrls 图片URL数组
   * @returns 增强结果，包含原图到超分图的URL映射
   */
  batchEnhance: async (imageUrls: string[]): Promise<BatchEnhanceResponse> => {
    const response = await apiClient.post(
      '/image-enhancement/batch',
      { imageUrls },
      { timeout: 300000 } // 5分钟超时，因为超分处理可能需要较长时间
    );
    return response.data;
  },

  /**
   * 获取超分后的图片URL映射
   * @param imageUrls 原图URL数组
   * @returns Map<原图URL, 超分后URL>
   */
  getEnhancedUrlMap: async (imageUrls: string[]): Promise<Map<string, string>> => {
    const urlMap = new Map<string, string>();

    if (imageUrls.length === 0) {
      return urlMap;
    }

    try {
      const response = await imageEnhancementService.batchEnhance(imageUrls);
      console.log('画质增强响应:', response);

      for (const [originalUrl, result] of Object.entries(response.results)) {
        console.log('映射:', originalUrl, '->', result.enhancedUrl);
        if (result.success && result.enhancedUrl) {
          urlMap.set(originalUrl, result.enhancedUrl);
        } else {
          // 失败时使用原图
          urlMap.set(originalUrl, originalUrl);
        }
      }
      console.log('最终URL映射:', Object.fromEntries(urlMap));
    } catch (error) {
      console.error('图片超分增强失败，使用原图:', error);
      // 失败时全部使用原图
      imageUrls.forEach(url => urlMap.set(url, url));
    }

    return urlMap;
  }
};
