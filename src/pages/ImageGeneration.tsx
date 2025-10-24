import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

import { ImageGenerationStep } from './AIImageGenerator/ImageGenerationStep';
import { AIImageSession, Prompt, ExtendedAIImageSession, ImageGenerationParams, ImageGenerationRequest, PromptStatus, BatchStatusResponse } from './AIImageGenerator/types';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';

export function ImageGeneration() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<AIImageProject | null>(null);
  const [session, setSession] = useState<AIImageSession>({
    id: projectId || '',
    projectId: projectId || '',
    messages: []
  });

  const [promptsMap, setPromptsMap] = useState<Map<string, Prompt>>(new Map());
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
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

      // 自动选中所有PENDING状态的prompts
      const pendingPromptIds = Array.from(extractedPromptsMap.values())
        .filter(p => p.status === PromptStatus.PENDING)
        .map(p => p.id);
      setSelectedPromptIds(new Set(pendingPromptIds));
    } catch (err) {
      console.error('Error loading session:', err);
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
  const startPolling = (promptIdsToMonitor: string[]) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    if (promptIdsToMonitor.length === 0) {
      return;
    }

    const interval = setInterval(async () => {
      if (!projectId) return;

      try {
        const generatingIds = promptIdsToMonitor;

        const statusResponse = await AIImageSessionsAPI.getBatchGenerationStatus(projectId, generatingIds);

        updatePromptsFromStatusResponse(statusResponse);

        const hasActivePrompts = statusResponse.results?.some(result =>
          result.status === 'queued' || result.status === 'processing'
        );

        if (!hasActivePrompts) {
          clearInterval(interval);
          setPollingInterval(null);
        }

      } catch (error) {
        console.error('轮询状态更新失败:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // 根据状态响应更新提示词状态
  const updatePromptsFromStatusResponse = (statusResponse: BatchStatusResponse) => {
    const updatedPromptsMap = new Map(promptsMap);
    let hasCompletedTasks = false;

    statusResponse.results.forEach(result => {
      const existingPrompt = updatedPromptsMap.get(result.prompt_id);
      if (!existingPrompt) return;

      updatedPromptsMap.set(result.prompt_id, {
        ...existingPrompt,
        status: result.status as PromptStatus
      });

      if (result.status === 'completed') {
        hasCompletedTasks = true;
      }
    });

    setPromptsMap(updatedPromptsMap);

    if (hasCompletedTasks) {
      setHistoryRefreshTrigger(prev => prev + 1);
    }
  };

  const generateImages = async (params: ImageGenerationParams) => {
    const selectedPrompts = Array.from(promptsMap.values()).filter(p => selectedPromptIds.has(p.id));
    if (selectedPrompts.length === 0 || !projectId) return;

    setIsGeneratingImages(true);

    try {
      const request: ImageGenerationRequest = {
        projectId: projectId,
        promptIds: Array.from(selectedPromptIds),
        width: params.width,
        height: params.height
      };

      await AIImageSessionsAPI.startImageGeneration(request);

      // 提交成功后，将选中的提示词状态改为QUEUED
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

      // 清除选中状态
      setSelectedPromptIds(new Set());

      // 触发历史图片数据重新加载
      setHistoryRefreshTrigger(prev => prev + 1);

      // 开始轮询状态
      startPolling(Array.from(selectedPromptIds));

    } catch (error) {
      console.error('提交生成任务失败:', error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleBack = () => {
    navigate('/workspace/product-images');
  };

  const handlePreviousStep = () => {
    navigate(`/workspace/project/${projectId}/prompt-generation`);
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
                    onClick={handlePreviousStep}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    上一步
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 - 全屏 */}
        <div>
          <ImageGenerationStep
            session={extendedSession}
            selectedPromptIds={selectedPromptIds}
            onGenerateImages={generateImages}
            refreshTrigger={historyRefreshTrigger}
            projectName={project?.name}
            isGeneratingImages={isGeneratingImages}
            onStartPolling={startPolling}
          />
        </div>
      </div>
    </div>
  );
}
