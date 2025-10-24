import { apiClient } from '@/lib/api';
import type {
  BatchGeneratePromptsRequest,
  BatchGeneratePromptsResponse,
  GetCroppedImagesResponse,
  AddToConversationRequest,
} from '@/types/cropImage';

export const aiPromptService = {
  // 批量为截图生成提示词
  batchGeneratePrompts: async (
    request: BatchGeneratePromptsRequest
  ): Promise<BatchGeneratePromptsResponse> => {
    const response = await apiClient.post('/projects/cropped-images/prompts/batch', request);
    return response.data;
  },

  // 查询原图的历史截图及提示词
  getCroppedImages: async (sourceImageId: string): Promise<GetCroppedImagesResponse> => {
    const response = await apiClient.get('/projects/cropped-images/prompts', {
      params: { sourceImageId },
    });
    return response.data;
  },

  // 加入对话
  addToConversation: async (request: AddToConversationRequest): Promise<void> => {
    await apiClient.post('/projects/cropped-images/prompts/add-to-conversation', request);
  },
};
