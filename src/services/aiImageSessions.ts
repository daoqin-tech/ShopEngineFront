import { apiClient } from '@/lib/api';
import { AIImageSession, Prompt, GeneratedImage, Message, ImageGenerationRequest, BatchStatusResponse, GenerateImageBatchResponse, ProcessChatResponse, AIProcessStatusResponse } from '@/pages/AIImageGenerator/types';

// API响应的数据结构（来自后端）
export interface AIImageSessionResponse {
  id: string;
  projectId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}


// 更新会话的请求数据
export interface UpdateAIImageSessionRequest {
  prompts?: Prompt[];
  images?: GeneratedImage[];
  messages?: Message[];
}

export class AIImageSessionsAPI {

  // 获取会话的完整数据
  static async getFullSessionData(projectId: string): Promise<AIImageSessionResponse> {
    const response = await apiClient.get(`/sessions/by-project/${projectId}`);
    return response.data;
  }

  // 更新会话
  static async updateAIImageSession(sessionId: string, data: UpdateAIImageSessionRequest): Promise<AIImageSession> {
    const response = await apiClient.put(`/sessions/${sessionId}`, data);
    const sessionData: AIImageSessionResponse = response.data;
    
    return {
      id: sessionData.id,
      projectId: sessionData.projectId,
      messages: sessionData.messages
    };
  }

  // 快速添加用户消息到会话中（立即返回，不等待AI处理）
  static async addUserMessage(sessionId: string, content: string, prompts?: Prompt[]): Promise<Message> {
    const messageData = {
      role: 'user' as const,
      content,
      ...(prompts && prompts.length > 0 && { prompts })
    };
    
    const response = await apiClient.post(`/sessions/${sessionId}/addUserMessage`, messageData);
    return response.data; // 直接返回添加的消息对象
  }

  // 触发AI处理最新的用户消息（异步）
  static async processAIResponse(sessionId: string): Promise<ProcessChatResponse> {
    const response = await apiClient.post(`/sessions/${sessionId}/chat`);
    return response.data; // 返回任务ID和状态
  }

  // 轮询AI处理状态和结果
  static async getAIProcessStatus(taskId: string): Promise<AIProcessStatusResponse> {
    const response = await apiClient.get(`/sessions/chat-tasks/${taskId}/status`);
    return response.data;
  }

  // 保存会话
  static async saveAIImageSession(
    session: AIImageSession, 
    prompts: Map<string, Prompt>, 
    images: Map<string, GeneratedImage>
  ): Promise<AIImageSession> {
    const updateData: UpdateAIImageSessionRequest = {
      prompts: Array.from(prompts.values()),
      images: Array.from(images.values()),
      messages: session.messages
    };
    
    return this.updateAIImageSession(session.id, updateData);
  }

  // 提交图片生成任务（异步，立即返回）
  static async startImageGeneration(request: ImageGenerationRequest): Promise<GenerateImageBatchResponse> {
    const response = await apiClient.post('/images/generate', request);
    return response.data;
  }

  // 批量查询提示词生成状态
  static async getBatchGenerationStatus(projectId: string, promptIds: string[]): Promise<BatchStatusResponse> {
    const response = await apiClient.post(`/images/${projectId}/generation-status`, { promptIds });
    return response.data;
  }

  // 获取项目的所有图片
  static async loadImages(projectId: string): Promise<GeneratedImage[]> {
    const response = await apiClient.get(`/images/project/${projectId}`);
    return response.data;
  }

  // 复制提示词
  static async copyPrompt(sessionId: string, promptId: string, count: number, messageId: string): Promise<Prompt[]> {
    const response = await apiClient.post(`/sessions/${sessionId}/copyPrompt`, {
      promptId,
      count,
      messageId
    });
    return response.data; // 返回新增的提示词数组
  }

  // 批量生成图片
  static async batchGenerateImages(promptIds: string[], count: number): Promise<Prompt[]> {
    const response = await apiClient.post(`/images/batchGenerate`, {
      promptIds,
      count
    });
    return response.data; // 返回生成任务的结果
  }

  // 批量重新生成失败的图片
  static async retryFailedImages(taskIds: string[]): Promise<null> {
    const response = await apiClient.post('/images/retry', {
      taskIds
    });
    return response.data;
  }

  // 批量删除图片(按提示词ID删除)
  static async deleteImages(promptIds: string[]): Promise<void> {
    await apiClient.post('/images/batch-delete', {
      promptIds
    });
  }
}