import { useState, useEffect } from 'react';
import { ImageGenerationStepProps, PromptStatus, GeneratedImage } from './types';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { GenerationParamsPanel } from './GenerationParamsPanel';
import { ImageContentArea } from './ImageContentArea';


export function ImageGenerationStep({
  session,
  selectedPromptIds,
  selectedReferenceImageIds,
  onGenerateImages,
  onGenerateFromImages,
  onTogglePromptSelection,
  onToggleReferenceImageSelection,
  refreshTrigger,
  projectName,
  isGeneratingImages,
  onStartPolling
}: ImageGenerationStepProps) {
  const selectedPrompts = Array.from(session.prompts?.values() || []).filter(p => selectedPromptIds.has(p.id));
  const selectedReferenceImages = Array.from(session.referenceImages?.values() || []).filter(img =>
    selectedReferenceImageIds?.has(img.id)
  );

  // 根据选择的模型判断是提示词生图还是以图生图模式
  // flux-dev: 提示词生图
  // doubao-seedream-4-0-250828: 以图生图
  const [selectedModel, setSelectedModel] = useState<string>('flux-dev');
  const isImageToImageMode = selectedModel === 'doubao-seedream-4-0-250828';

  // 加载状态
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false);

  // 历史图片状态
  const [historicalImages, setHistoricalImages] = useState<GeneratedImage[]>([]);

  // 组件挂载时加载图片数据
  useEffect(() => {
    if (session.projectId) {
      setIsLoadingHistoricalData(true);

      AIImageSessionsAPI.loadImages(session.projectId)
        .then((images) => {
          setHistoricalImages(images || []);

          // 检查是否有非完成状态的图片，如果有则开始轮询
          if (images) {
            const processingImages = images.filter(img =>
              img.status === PromptStatus.PENDING ||
              img.status === PromptStatus.QUEUED ||
              img.status === PromptStatus.PROCESSING
            );

            if (processingImages.length > 0) {
              // 获取这些图片对应的taskId，过滤掉null/undefined
              const taskIdsToMonitor = processingImages
                .map(img => img.taskId)
                .filter((taskId): taskId is string => taskId !== null && taskId.trim() !== '');
              // 去重
              const uniqueTaskIds = Array.from(new Set(taskIdsToMonitor));

              // 调用父组件的轮询方法
              if (onStartPolling && uniqueTaskIds.length > 0) {
                onStartPolling(uniqueTaskIds);
              }
            }
          }
        })
        .catch((error) => {
          console.error('Error loading images:', error);
        })
        .finally(() => {
          setIsLoadingHistoricalData(false);
        });
    }
  }, [session.projectId]);

  // 监听refreshTrigger变化，重新加载历史图片数据
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && session.projectId) {
      setIsLoadingHistoricalData(true);

      AIImageSessionsAPI.loadImages(session.projectId)
        .then((images) => {
          setHistoricalImages(images || []);
        })
        .catch((error) => {
          console.error('Error refreshing images:', error);
        })
        .finally(() => {
          setIsLoadingHistoricalData(false);
        });
    }
  }, [refreshTrigger, session.projectId]);



  // 检查是否有可用的提示词和参考图
  const hasPrompts = session.prompts && session.prompts.size > 0;
  const hasReferenceImages = session.referenceImages && session.referenceImages.size > 0;

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 左侧生成参数区域 */}
      <GenerationParamsPanel
        selectedPromptsCount={isImageToImageMode ? selectedReferenceImages.length : selectedPrompts.length}
        isGeneratingImages={isGeneratingImages}
        onGenerateImages={isImageToImageMode && onGenerateFromImages ? onGenerateFromImages : onGenerateImages}
        isImageToImageMode={isImageToImageMode}
        hasPrompts={hasPrompts}
        hasReferenceImages={hasReferenceImages}
        onModelChange={setSelectedModel}
      />

      {/* 右侧内容区域 */}
      <ImageContentArea
        selectedPrompts={selectedPrompts}
        selectedReferenceImages={selectedReferenceImages}
        historicalImages={historicalImages}
        isLoadingHistoricalData={isLoadingHistoricalData}
        projectName={projectName}
        projectId={session.projectId}
        onRefreshImages={async () => {
          if (session.projectId) {
            const images = await AIImageSessionsAPI.loadImages(session.projectId);
            setHistoricalImages(images || []);
          }
        }}
        onTogglePromptSelection={onTogglePromptSelection}
        onToggleReferenceImageSelection={onToggleReferenceImageSelection}
      />
    </div>
  );
}