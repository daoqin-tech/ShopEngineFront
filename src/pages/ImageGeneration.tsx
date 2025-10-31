import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Scissors } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { ImageGenerationStep } from './AIImageGenerator/ImageGenerationStep';
import { AIImageSession, Prompt, ExtendedAIImageSession, ImageGenerationParams, ImageGenerationRequest, PromptStatus, BatchStatusResponse, ReferenceImage } from './AIImageGenerator/types';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';

export function ImageGeneration() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState<AIImageProject | null>(null);
  const [session, setSession] = useState<AIImageSession>({
    id: projectId || '',
    projectId: projectId || '',
    messages: []
  });

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

  // 参考图片状态
  const [referenceImagesMap, setReferenceImagesMap] = useState<Map<string, ReferenceImage>>(new Map());
  const [selectedReferenceImageIds, setSelectedReferenceImageIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // 轮询管理状态
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // 持久化选中状态到 localStorage
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`selectedPrompts_${projectId}`, JSON.stringify(Array.from(selectedPromptIds)));
    }
  }, [selectedPromptIds, projectId]);

  // 从 location.state 接收参考图片
  useEffect(() => {
    const state = location.state as { referenceImageUrls?: string[] } | null;
    if (state?.referenceImageUrls && state.referenceImageUrls.length > 0) {
      // 将参考图URL转换为ReferenceImage对象
      const newReferenceImages = new Map<string, ReferenceImage>();
      const newSelectedIds = new Set<string>();

      state.referenceImageUrls.forEach(url => {
        const id = uuidv4();
        newReferenceImages.set(id, {
          id,
          imageUrl: url,
          createdAt: new Date().toISOString(),
          status: PromptStatus.PENDING
        });
        newSelectedIds.add(id); // 默认全选
      });

      setReferenceImagesMap(newReferenceImages);
      setSelectedReferenceImageIds(newSelectedIds);

      // 清除 state 避免刷新时重复添加
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

      // 只有在没有保存的选中状态时，才自动选中所有PENDING状态的prompts
      const savedSelection = localStorage.getItem(`selectedPrompts_${id}`);
      if (!savedSelection) {
        const pendingPromptIds = Array.from(extractedPromptsMap.values())
          .filter(p => p.status === PromptStatus.PENDING)
          .map(p => p.id);
        setSelectedPromptIds(new Set(pendingPromptIds));
      }
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

  // 开始轮询管理器（使用taskIds进行轮询）
  const startPolling = (taskIdsToMonitor: string[]) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    if (taskIdsToMonitor.length === 0) {
      return;
    }

    const interval = setInterval(async () => {
      if (!projectId) return;

      try {
        const statusResponse = await AIImageSessionsAPI.getBatchGenerationStatus(projectId, taskIdsToMonitor);

        updatePromptsFromStatusResponse(statusResponse);

        const hasActiveTasks = statusResponse.results?.some(result =>
          result.status === 'pending' || result.status === 'queued' || result.status === 'processing'
        );

        if (!hasActiveTasks) {
          clearInterval(interval);
          setPollingInterval(null);
        }

      } catch (error) {
        console.error('轮询状态更新失败:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // 根据状态响应更新状态（支持提示词生图和以图生图）
  const updatePromptsFromStatusResponse = (statusResponse: BatchStatusResponse) => {
    const updatedPromptsMap = new Map(promptsMap);
    const updatedReferenceImagesMap = new Map(referenceImagesMap);
    let hasCompletedTasks = false;

    statusResponse.results.forEach(result => {
      // 更新提示词状态（提示词生图）
      if (result.prompt_id) {
        const existingPrompt = updatedPromptsMap.get(result.prompt_id);
        if (existingPrompt) {
          updatedPromptsMap.set(result.prompt_id, {
            ...existingPrompt,
            status: result.status as PromptStatus
          });
        }
      }

      // 检查是否有任务完成
      if (result.status === 'completed') {
        hasCompletedTasks = true;
      }
    });

    setPromptsMap(updatedPromptsMap);
    setReferenceImagesMap(updatedReferenceImagesMap);

    // 如果有任务完成，触发历史图片刷新
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
        height: params.height,
        ...(params.model && { model: params.model })
      };

      const response = await AIImageSessionsAPI.startImageGeneration(request);

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

      // 开始轮询状态（使用返回的taskIDs，过滤掉空字符串）
      if (response.taskIDs && response.taskIDs.length > 0) {
        const validTaskIds = response.taskIDs.filter((id: string) => id && id.trim() !== '');
        if (validTaskIds.length > 0) {
          startPolling(validTaskIds);
        }
      }

    } catch (error) {
      console.error('提交生成任务失败:', error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleBack = () => {
    navigate('/workspace/product-images');
  };

  const handleGoToPromptGeneration = () => {
    navigate(`/workspace/project/${projectId}/prompt-generation`);
  };

  const handleGoToHotProductCopy = () => {
    navigate(`/workspace/project/${projectId}/hot-product-copy`);
  };

  // 切换参考图选择
  const toggleReferenceImageSelection = (id: string) => {
    setSelectedReferenceImageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 以图生图 - 基于参考图生成
  const generateFromImages = async (params: ImageGenerationParams) => {
    const selectedImages = Array.from(referenceImagesMap.values()).filter(img =>
      selectedReferenceImageIds.has(img.id)
    );

    if (selectedImages.length === 0 || !projectId) return;

    setIsGeneratingImages(true);

    try {
      const imageUrls = selectedImages.map(img => img.imageUrl);

      // count 参数表示每张参考图生成多少张图片（1-15）
      const countPerImage = params.count && params.count >= 1 && params.count <= 15 ? params.count : 1;

      const response = await AIImageSessionsAPI.generateImageFromImages({
        projectId,
        imageUrls,
        prompt: 'Generate diverse variations with different subjects while strictly maintaining the exact same theme category, artistic style, color palette, overall tone, background elements, lighting, composition, and atmosphere. Keep the visual consistency across all variations',
        width: params.width,
        height: params.height,
        count: countPerImage // 每张参考图生成 countPerImage 张图片
      });

      // 提交成功后，将选中的参考图状态改为QUEUED
      const updatedReferenceImagesMap = new Map(referenceImagesMap);
      Array.from(selectedReferenceImageIds).forEach(imageId => {
        const image = updatedReferenceImagesMap.get(imageId);
        if (image) {
          updatedReferenceImagesMap.set(imageId, {
            ...image,
            status: PromptStatus.QUEUED
          });
        }
      });
      setReferenceImagesMap(updatedReferenceImagesMap);

      // 清除选中状态
      setSelectedReferenceImageIds(new Set());

      // 触发历史图片数据重新加载
      setHistoryRefreshTrigger(prev => prev + 1);

      // 开始轮询状态（使用返回的taskIds，过滤掉空字符串）
      if (response.taskIds && response.taskIds.length > 0) {
        const validTaskIds = response.taskIds.filter((id: string) => id && id.trim() !== '');
        if (validTaskIds.length > 0) {
          startPolling(validTaskIds);
        }
      }

    } catch (error) {
      console.error('提交以图生图任务失败:', error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // 为子组件创建扩展的session对象
  const extendedSession: ExtendedAIImageSession = {
    ...session,
    prompts: promptsMap,
    images: new Map(),
    referenceImages: referenceImagesMap
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
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGoToPromptGeneration}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI对话生图
                </Button>
                <Button
                  onClick={handleGoToHotProductCopy}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  以图生图
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 - 全屏 */}
        <div>
          <ImageGenerationStep
            session={extendedSession}
            selectedPromptIds={selectedPromptIds}
            selectedReferenceImageIds={selectedReferenceImageIds}
            onGenerateImages={generateImages}
            onGenerateFromImages={generateFromImages}
            onToggleReferenceImageSelection={toggleReferenceImageSelection}
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
