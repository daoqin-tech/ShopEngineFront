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
    console.log('开始调用CMYK转换API，请求URL:', imageUrl);
    try {
      const response = await apiClient.post<ConvertToCMYKResponse>(
        '/image-conversion/to-cmyk',
        { imageUrl },
        { timeout: 120000 } // 2分钟超时
      );
      console.log('CMYK转换API响应:', response);
      console.log('CMYK转换API响应data:', response.data);
      // response.data 是后端返回的 data 字段: {imageUrl: "..."}
      const cmykUrl = response.data.imageUrl;
      console.log('提取的CMYK URL:', cmykUrl);
      return cmykUrl;
    } catch (error) {
      console.error('CMYK转换API调用失败:', error);
      throw error;
    }
  },
};
