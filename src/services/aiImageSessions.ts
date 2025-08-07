import { apiClient } from '@/lib/api';
import { AIImageSession, Prompt, GeneratedImage, Message } from '@/pages/AIImageGenerator/types';

// API响应的数据结构（来自后端）
export interface AIImageSessionResponse {
  id: string;
  projectId: string;
  prompts: Prompt[];
  images: GeneratedImage[];
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
  // 获取项目会话（不存在则自动创建）
  static async getProjectSession(projectId: string): Promise<AIImageSession> {
    const response = await apiClient.get(`/sessions/by-project/${projectId}`);
    const sessionData: AIImageSessionResponse = response.data;
    return {
      id: sessionData.id,
      projectId: sessionData.projectId,
      messages: sessionData.messages
    };
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

  // 触发AI处理最新的用户消息
  static async processAIResponse(sessionId: string): Promise<Message> {
    const response = await apiClient.post(`/sessions/${sessionId}/chat`);
    return response.data; // 直接返回AI回复的消息对象
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

  // 删除会话
  static async deleteAIImageSession(sessionId: string): Promise<null> {
    const response = await apiClient.delete(`/sessions/${sessionId}`);
    return response.data;
  }
}