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
      { timeout: 600000 } // 10分钟超时，串行处理多张图片耗时较长
    );
    return response.data;
  },

  /**
   * 获取超分后的图片URL映射
   * @param imageUrls 原图URL数组
   * @returns Map<原图URL, 超分后URL>
   * @throws 如果有任何图片增强失败，抛出错误
   */
  getEnhancedUrlMap: async (imageUrls: string[]): Promise<Map<string, string>> => {
    const urlMap = new Map<string, string>();

    if (imageUrls.length === 0) {
      return urlMap;
    }

    const response = await imageEnhancementService.batchEnhance(imageUrls);
    console.log('画质增强响应:', response);

    // 检查是否有失败的图片
    if (response.failed > 0) {
      const failedUrls = Object.entries(response.results)
        .filter(([, result]) => !result.success)
        .map(([url, result]) => `${url}: ${result.error || '未知错误'}`);
      throw new Error(`画质增强失败 (${response.failed}/${response.total}):\n${failedUrls.join('\n')}`);
    }

    for (const [originalUrl, result] of Object.entries(response.results)) {
      console.log('映射:', originalUrl, '->', result.enhancedUrl);
      urlMap.set(originalUrl, result.enhancedUrl);
    }
    console.log('最终URL映射:', Object.fromEntries(urlMap));

    return urlMap;
  }
};
