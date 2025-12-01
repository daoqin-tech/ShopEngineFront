import { apiClient } from '@/lib/api';

export interface ConvertToCMYKRequest {
  imageUrl: string;
}

export interface ConvertToCMYKResponse {
  imageUrl: string;
}

export const imageConversionService = {
  // 将RGB图片转换为CMYK
  convertToCMYK: async (imageUrl: string): Promise<string> => {
    const response = await apiClient.post<ConvertToCMYKResponse>(
      '/image-conversion/to-cmyk',
      { imageUrl }
    );
    return response.data.imageUrl;
  },
};
