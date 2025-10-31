import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

import { PromptGenerationStep } from './AIImageGenerator/PromptGenerationStep';
import { AIImageSession, Prompt, ExtendedAIImageSession } from './AIImageGenerator/types';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';

export function PromptGeneration() {
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
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(() => {
    // 从 localStorage 恢复选中状态
    if (projectId) {
      const saved = localStorage.getItem(`selectedPrompts_${projectId}`);
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch (e) {
          return new Set();
        }
      }
    }
    return new Set();
  });
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [selectedPromptsForOptimization, setSelectedPromptsForOptimization] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 持久化选中状态到 localStorage
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`selectedPrompts_${projectId}`, JSON.stringify(Array.from(selectedPromptIds)));
    }
  }, [selectedPromptIds, projectId]);

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
      const fullSessionData = await AIImageSessionsAPI.getFullSessionData(id);

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
    }
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
        isThinking: true
      }]
    }));

    try {
      // 启动AI处理任务
      const processResponse = await AIImageSessionsAPI.processAIResponse(session.id);

      // 开始轮询任务状态
      const pollTaskStatus = async () => {
        try {
          const statusResponse = await AIImageSessionsAPI.getAIProcessStatus(processResponse.taskId);

          if (statusResponse.status === 'completed' && statusResponse.result) {
            const aiMessage = statusResponse.result;

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
              setPromptsMap(prev => {
                const newPromptsMap = new Map(prev);
                aiMessage.prompts!.forEach(prompt => {
                  newPromptsMap.set(prompt.id, prompt);
                });
                return newPromptsMap;
              });
            }
          } else if (statusResponse.status === 'failed') {
            // 处理失败情况
            console.error('AI处理失败:', statusResponse.error);
            setSession(prev => ({
              ...prev,
              messages: prev.messages.filter(msg => msg.id !== thinkingMessageId)
            }));
            throw new Error(statusResponse.error || 'AI处理失败');
          } else {
            // 继续轮询
            setTimeout(pollTaskStatus, 5000);
          }
        } catch (error) {
          console.error('轮询任务状态失败:', error);
          setSession(prev => ({
            ...prev,
            messages: prev.messages.filter(msg => msg.id !== thinkingMessageId)
          }));
          throw error;
        }
      };

      // 开始轮询
      await pollTaskStatus();

      // 清除优化选择状态
      setSelectedPromptsForOptimization([]);
    } catch (error) {
      console.error('处理对话失败:', error);
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
    navigate('/workspace/product-images');
  };

  const handleBackToImageGeneration = () => {
    navigate(`/workspace/project/${projectId}/image-generation`);
  };

  // 为子组件创建扩展的session对象
  const extendedSession: ExtendedAIImageSession = {
    ...session,
    prompts: promptsMap,
    images: new Map()
  };

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
                  <h1 className="text-lg font-semibold text-gray-900">
                    {project?.name || '加载中...'}
                  </h1>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Button
                    onClick={handleBackToImageGeneration}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    返回生成图片
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 - 全屏 */}
        <div>
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
        </div>
      </div>
    </div>
  );
}
