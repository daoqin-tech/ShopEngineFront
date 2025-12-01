import { apiClient } from '@/lib/api';

export interface ConvertToCMYKRequest {
  imageUrl: string;
}

export interface ConvertToCMYKResponse {
  imageUrl: string;
}

export const imageConversionService = {
  // 将RGB图片转换为CMYK（耗时较久，设置2分钟超时）
  convertToCMYK: async (imageUrl: string): Promise<string> => {
    const response = await apiClient.post<ConvertToCMYKResponse>(
      '/image-conversion/to-cmyk',
      { imageUrl },
      { timeout: 120000 } // 2分钟超时
    );
    return response.data.imageUrl;
  },
};
