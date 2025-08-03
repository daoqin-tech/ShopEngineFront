import { apiClient } from '@/lib/api';
import { AIImageSession, PromptWithSelection, GeneratedImage, Conversation } from '@/pages/AIImageGenerator/types';

// API响应的数据结构（来自后端）
export interface AIImageSessionResponse {
  id: string;
  projectId: string;
  prompts: PromptWithSelection[];
  images: GeneratedImage[];
  conversation: Conversation;
  createdAt: string;
  updatedAt: string;
}


// 更新会话的请求数据
export interface UpdateAIImageSessionRequest {
  prompts?: PromptWithSelection[];
  images?: GeneratedImage[];
  conversation?: Conversation;
}

export class AIImageSessionsAPI {
  // 获取会话详情
  static async getAIImageSession(sessionId: string): Promise<AIImageSession> {
    const response = await apiClient.get(`/sessions/${sessionId}`);
    const sessionData: AIImageSessionResponse = response.data;
    
    // 将数组转换为Map结构，以适配前端组件
    const promptsMap = new Map<string, PromptWithSelection>();
    sessionData.prompts.forEach(prompt => {
      promptsMap.set(prompt.id, prompt);
    });
    
    const imagesMap = new Map<string, GeneratedImage>();
    sessionData.images.forEach(image => {
      imagesMap.set(image.id, image);
    });
    
    return {
      id: sessionData.id,
      projectId: sessionData.projectId,
      prompts: promptsMap,
      images: imagesMap,
      conversation: sessionData.conversation
    };
  }

  // 获取项目会话（不存在则自动创建）
  static async getProjectSession(projectId: string): Promise<AIImageSession> {
    const response = await apiClient.get(`/sessions/by-project/${projectId}`);
    const sessionData: AIImageSessionResponse = response.data;
    
    // 将数组转换为Map结构
    const promptsMap = new Map<string, PromptWithSelection>();
    sessionData.prompts.forEach(prompt => {
      promptsMap.set(prompt.id, prompt);
    });
    
    const imagesMap = new Map<string, GeneratedImage>();
    sessionData.images.forEach(image => {
      imagesMap.set(image.id, image);
    });
    
    return {
      id: sessionData.id,
      projectId: sessionData.projectId,
      prompts: promptsMap,
      images: imagesMap,
      conversation: sessionData.conversation
    };
  }


  // 更新会话
  static async updateAIImageSession(sessionId: string, data: UpdateAIImageSessionRequest): Promise<AIImageSession> {
    const response = await apiClient.put(`/sessions/${sessionId}`, data);
    const sessionData: AIImageSessionResponse = response.data;
    
    // 将数组转换为Map结构
    const promptsMap = new Map<string, PromptWithSelection>();
    sessionData.prompts.forEach(prompt => {
      promptsMap.set(prompt.id, prompt);
    });
    
    const imagesMap = new Map<string, GeneratedImage>();
    sessionData.images.forEach(image => {
      imagesMap.set(image.id, image);
    });
    
    return {
      id: sessionData.id,
      projectId: sessionData.projectId,
      prompts: promptsMap,
      images: imagesMap,
      conversation: sessionData.conversation
    };
  }

  // 保存会话（将Map结构转换为数组发送给后端）
  static async saveAIImageSession(session: AIImageSession): Promise<AIImageSession> {
    const updateData: UpdateAIImageSessionRequest = {
      prompts: Array.from(session.prompts.values()),
      images: Array.from(session.images.values()),
      conversation: session.conversation
    };
    
    return this.updateAIImageSession(session.id, updateData);
  }

  // 删除会话
  static async deleteAIImageSession(sessionId: string): Promise<null> {
    const response = await apiClient.delete(`/sessions/${sessionId}`);
    return response.data;
  }
}