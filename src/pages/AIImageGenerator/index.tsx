import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

import { PromptGenerationStep } from './PromptGenerationStep';
import { ImageGenerationStep } from './ImageGenerationStep';
import { AIImageSession, Prompt, ExtendedAIImageSession, ImageGenerationParams, ImageGenerationRequest, PromptStatus, BatchStatusResponse } from './types';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';

export function AIImageGenerator() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<AIImageProject | null>(null);
  const [session, setSession] = useState<AIImageSession>({
    id: projectId || '',
    projectId: projectId || '',
    messages: []
  });
  
  // 前端UI状态管理
  const [promptsMap, setPromptsMap] = useState<Map<string, Prompt>>(new Map());
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set()); // UI状态：用户选择的提示词
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [selectedPromptsForOptimization, setSelectedPromptsForOptimization] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  
  // 轮询管理状态
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      Promise.all([
        loadProject(projectId),
        loadSession(projectId)
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      const projectData = await AIImageProjectsAPI.getAIImageProject(id);
      setProject(projectData);
    } catch (err) {
      console.error('Error loading project:', err);
    }
  };

  const loadSession = async (id: string) => {
    try {
      // 使用getFullSessionData获取包括历史图片在内的完整数据
      const fullSessionData = await AIImageSessionsAPI.getFullSessionData(id);
      
      // 设置基础session数据
      const sessionData = {
        id: fullSessionData.id,
        projectId: fullSessionData.projectId,
        messages: fullSessionData.messages
      };
      setSession(sessionData);
      
      // 从messages中提取prompts
      const extractedPromptsMap = new Map<string, Prompt>();
      if (fullSessionData.messages) {
        fullSessionData.messages.forEach(message => {
          // 如果消息包含prompts数组，将它们添加到promptsMap中
          if (message.prompts && Array.isArray(message.prompts)) {
            message.prompts.forEach(prompt => {
              extractedPromptsMap.set(prompt.id, prompt);
            });
          }
        });
      }
      setPromptsMap(extractedPromptsMap);
    } catch (err) {
      console.error('Error loading session:', err);
      // 后端保证会话存在，如果到这里说明网络或其他错误
    }
  };

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // 开始轮询管理器
  const startPolling = () => {
    // 清理之前的轮询
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }


    const interval = setInterval(async () => {
      if (!projectId) return;

      try {
        // 只查询正在生成中的提示词状态
        const generatingIds = Array.from(promptsMap.values())
          .filter(prompt => prompt.status === PromptStatus.PENDING || prompt.status === PromptStatus.QUEUED || prompt.status === PromptStatus.PROCESSING)
          .map(prompt => prompt.id);

        if (generatingIds.length === 0) {
          // 没有正在生成的提示词，停止轮询
          clearInterval(interval);
          setPollingInterval(null);
          return;
        }

        // 批量查询正在生成的提示词状态
        const statusResponse = await AIImageSessionsAPI.getBatchGenerationStatus(projectId, generatingIds);
        
        // 更新提示词状态和图片
        updatePromptsFromStatusResponse(statusResponse);

        // 检查是否还有正在处理的任务，如果没有则停止轮询
        const hasActivePrompts = Array.from(promptsMap.values()).some(prompt => 
          prompt.status === PromptStatus.QUEUED || prompt.status === PromptStatus.PROCESSING
        );

        if (!hasActivePrompts) {
          clearInterval(interval);
          setPollingInterval(null);
        }

      } catch (error) {
        console.error('轮询状态更新失败:', error);
      }
    }, 5000); // 每5秒轮询一次

    setPollingInterval(interval);
  };

  // 根据状态响应更新提示词状态
  const updatePromptsFromStatusResponse = (statusResponse: BatchStatusResponse) => {
    const updatedPromptsMap = new Map(promptsMap);

    statusResponse.results.forEach(result => {
      const existingPrompt = updatedPromptsMap.get(result.prompt_id);
      if (!existingPrompt) return;

      // 更新提示词状态
      updatedPromptsMap.set(result.prompt_id, {
        ...existingPrompt,
        status: result.status as PromptStatus
      });
    });

    setPromptsMap(updatedPromptsMap);
  };

  const togglePromptSelection = (id: string) => {
    setSelectedPromptIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const generateImages = async (params: ImageGenerationParams) => {
    const selectedPrompts = Array.from(promptsMap.values()).filter(p => selectedPromptIds.has(p.id));
    if (selectedPrompts.length === 0 || !projectId) return;

    setIsGeneratingImages(true);

    try {
      // 准备API请求参数
      const request: ImageGenerationRequest = {
        projectId: projectId,
        promptIds: Array.from(selectedPromptIds),
        width: params.width,
        height: params.height
      };
      
      // 调用异步API，立即返回
      await AIImageSessionsAPI.startImageGeneration(request);
      
      // 提交成功后，将选中的提示词状态改为QUEUED（排队中）
      const updatedPromptsMap = new Map(promptsMap);
      Array.from(selectedPromptIds).forEach(promptId => {
        const prompt = updatedPromptsMap.get(promptId);
        if (prompt) {
          updatedPromptsMap.set(promptId, {
            ...prompt,
            status: PromptStatus.QUEUED
          });
        }
      });
      setPromptsMap(updatedPromptsMap);
      
      // 清除选中状态（因为这些提示词已经提交了）
      setSelectedPromptIds(new Set());
      
      // 触发历史图片数据重新加载
      setHistoryRefreshTrigger(prev => prev + 1);
      
      // 开始轮询状态
      startPolling();
      
    } catch (error) {
      console.error('提交生成任务失败:', error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const togglePromptForOptimization = (promptId: string) => {
    setSelectedPromptsForOptimization(prev => {
      const newSelection = prev.includes(promptId)
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId];
      
      return newSelection;
    });
  };

  const handleChatSubmit = async () => {
    if (!currentChatInput.trim()) return;
    
    const userMessage = currentChatInput;
    setCurrentChatInput('');
    setIsGeneratingPrompts(true);
    
    // 获取选中用于优化的提示词
    const selectedOptimizationPrompts = selectedPromptsForOptimization.length > 0
      ? selectedPromptsForOptimization.map(id => promptsMap.get(id)).filter((p): p is Prompt => p !== undefined)
      : undefined;

    // 立即调用后端接口添加用户消息
    try {
      const userMessageObj = await AIImageSessionsAPI.addUserMessage(session.id, userMessage, selectedOptimizationPrompts);
      
      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, userMessageObj]
      }));
    } catch (error) {
      console.error('添加用户消息失败:', error);
      setIsGeneratingPrompts(false);
      return;
    }

    // 添加AI正在思考的占位消息
    const thinkingMessageId = `msg-${Date.now()}-thinking`;
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: thinkingMessageId,
        role: 'assistant' as const,
        content: '',
        isThinking: true // 标记为思考状态
      }]
    }));
    
    try {
      // 触发AI处理最新的用户消息
      const aiMessage = await AIImageSessionsAPI.processAIResponse(session.id);
      
      // 移除思考占位消息，添加实际的AI回复
      setSession(prev => {
        const messagesWithoutThinking = prev.messages.filter(msg => msg.id !== thinkingMessageId);
        return {
          ...prev,
          messages: [...messagesWithoutThinking, aiMessage]
        };
      });
      
      // 从AI消息中提取新的 prompts
      if (aiMessage.prompts && Array.isArray(aiMessage.prompts)) {
        const newPromptIds: string[] = [];
        
        setPromptsMap(prev => {
          const newPromptsMap = new Map(prev);
          aiMessage.prompts!.forEach(prompt => {
            newPromptsMap.set(prompt.id, prompt);
            newPromptIds.push(prompt.id);
          });
          return newPromptsMap;
        });
        
        // 不自动选中新生成的提示词，让用户手动选择
      }
      
      // 清除优化选择状态
      setSelectedPromptsForOptimization([]);
      } catch (error) {
      console.error('处理对话失败:', error);
      // 移除思考占位消息，添加错误消息
      setSession(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== thinkingMessageId).concat([
          { id: `msg-${Date.now()}-error`, role: 'assistant', content: '抱歉，处理消息时出现问题，请重试。' }
        ])
      }));
    } finally {
      setIsGeneratingPrompts(false);
    }
  };


  const handleBack = () => {
    navigate('/materials/product-images');
  };

  const hasSelectedPrompts = selectedPromptIds.size > 0;
  const [showImageGeneration, setShowImageGeneration] = useState(false);
  
  
  // 默认生成参数 (符合FLUX API要求)
  const getDefaultGenerationParams = (): ImageGenerationParams => ({
    width: 1024,
    height: 768,
    aspectRatio: 'cinema'
  });



  // 为子组件创建扩展的session对象，包含prompts数据
  const extendedSession: ExtendedAIImageSession = {
    ...session,
    prompts: promptsMap,
    images: new Map() // 不再使用，保留接口兼容性
  };

  // 检查是否是新项目且没有任何消息 - 显示简洁的ChatGPT风格界面
  const isNewEmptyProject = !isLoading && session.messages.length === 0 && Array.from(promptsMap.values()).length === 0;

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {isNewEmptyProject ? (
        // ChatGPT风格的新建项目界面
        <div className="min-h-screen bg-gray-50 relative">
          {/* 左上角首页按钮 */}
          <div className="absolute top-6 left-6 z-10">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-gray-600 hover:text-gray-900 bg-white/80 backdrop-blur-sm">
              <Home className="w-4 h-4 mr-2" />
              首页
            </Button>
          </div>

          {/* 中央内容区域 - ChatGPT风格 */}
          <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <div className="w-full max-w-4xl space-y-12">
              {/* 大标题 */}
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-normal text-gray-900 tracking-tight">
                  您想要制作什么？
                </h1>
              </div>

              {/* ChatGPT风格的输入框 */}
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <div className="flex items-center bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-gray-300">
                    {/* 输入框 */}
                    <input
                      type="text"
                      value={currentChatInput}
                      onChange={(e) => setCurrentChatInput(e.target.value)}
                      placeholder="描述您要制作的商品图片..."
                      onKeyDown={(e) => e.key === 'Enter' && !isGeneratingPrompts && handleChatSubmit()}
                      className="flex-1 px-6 py-4 text-base text-gray-900 placeholder-gray-500 bg-transparent border-0 rounded-3xl focus:outline-none focus:ring-0"
                      disabled={isGeneratingPrompts}
                    />

                    {/* 右侧发送按钮 */}
                    <div className="flex-shrink-0 pr-3">
                      <button
                        onClick={handleChatSubmit}
                        disabled={!currentChatInput.trim() || isGeneratingPrompts}
                        className={`p-2 rounded-full transition-all duration-200 ${
                          !currentChatInput.trim() || isGeneratingPrompts
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-white bg-gray-900 hover:bg-gray-800 shadow-sm'
                        }`}
                      >
                        {isGeneratingPrompts ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 完整的工作区界面 - 全屏布局
        <div className="h-screen overflow-hidden">
          {/* 顶部固定导航栏 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="text-gray-600 hover:text-gray-900">
                    <Home className="w-4 h-4 mr-2" />
                    首页
                  </Button>
                  <div className="h-5 w-px bg-gray-300"></div>
                  <div>
                    <div>
                      <h1 className="text-lg font-semibold text-gray-900">
                        {project?.name || '加载中...'}
                      </h1>
                    </div>
                    <p className="text-sm text-gray-500">
                      {!showImageGeneration ? '创建提示词' : '生成AI图片'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {showImageGeneration && (
                    <Button 
                      onClick={() => setShowImageGeneration(false)}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      上一步
                    </Button>
                  )}
                  {!showImageGeneration && (
                    <Button 
                      onClick={() => setShowImageGeneration(true)}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {hasSelectedPrompts ? `下一步 (${selectedPromptIds.size} 个提示词)` : '下一步'}
                    </Button>
                  )}
                  {showImageGeneration && hasSelectedPrompts && (
                    <Button 
                      onClick={() => generateImages(getDefaultGenerationParams())}
                      disabled={isGeneratingImages}
                      className="bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingImages ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          提交中...
                        </>
                      ) : (
                        '提交任务'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 主内容区域 - 全屏 */}
          <div>
            {!showImageGeneration ? (
              <PromptGenerationStep 
                session={extendedSession}
                selectedPromptIds={selectedPromptIds}
                isGeneratingPrompts={isGeneratingPrompts}
                currentChatInput={currentChatInput}
                setCurrentChatInput={setCurrentChatInput}
                selectedPromptsForOptimization={selectedPromptsForOptimization}
                setSelectedPromptsForOptimization={setSelectedPromptsForOptimization}
                onTogglePromptSelection={togglePromptSelection}
                onTogglePromptForOptimization={togglePromptForOptimization}
                onChatSubmit={handleChatSubmit}
              />
            ) : (
              <ImageGenerationStep 
                session={extendedSession}
                selectedPromptIds={selectedPromptIds}
                onGenerateImages={generateImages}
                refreshTrigger={historyRefreshTrigger}
                projectName={project?.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}