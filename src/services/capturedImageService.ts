import { apiClient } from '@/lib/api';
import type {
  GetCapturedImagesRequest,
  GetCapturedImagesResponse,
  DeleteCapturedImagesRequest,
  DeleteCapturedImagesResponse,
} from '@/types/capturedImage';

export const capturedImageService = {
  // 查询第三方抓取的商品图片
  getCapturedImages: async (
    params: GetCapturedImagesRequest
  ): Promise<GetCapturedImagesResponse> => {
    const response = await apiClient.get('/projects/captured-images', { params });
    return response.data;
  },

  // 删除第三方抓取的商品图片
  deleteCapturedImages: async (
    request: DeleteCapturedImagesRequest
  ): Promise<DeleteCapturedImagesResponse> => {
    const response = await apiClient.delete('/projects/captured-images', {
      data: request,
    });
    return response.data;
  },
};
