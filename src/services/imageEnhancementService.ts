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
   * 获取超分后的图片URL映射（并发处理，控制QPS）
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

    const CONCURRENCY = 2; // 腾讯云 QPS 限制
    let completed = 0;

    // 处理单张图片的函数
    const processOne = async (imageUrl: string) => {
      console.log(`画质增强 (${completed + 1}/${imageUrls.length}):`, imageUrl);

      const result = await imageEnhancementService.enhanceSingle(imageUrl);

      if (!result.success) {
        throw new Error(`画质增强失败: ${result.error || '未知错误'}\n图片: ${imageUrl}`);
      }

      urlMap.set(imageUrl, result.enhancedUrl);
      console.log('映射:', imageUrl, '->', result.enhancedUrl);

      completed++;
      onProgress?.(completed, imageUrls.length);
    };

    // 并发控制：同时最多处理 CONCURRENCY 张
    const executing: Promise<void>[] = [];
    for (const url of imageUrls) {
      const p = processOne(url).then(() => {
        executing.splice(executing.indexOf(p), 1);
      });
      executing.push(p);
      if (executing.length >= CONCURRENCY) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);

    console.log('最终URL映射:', Object.fromEntries(urlMap));
    return urlMap;
  }
};
