import { useState, useEffect } from 'react';
import { ImageGenerationStepProps, PromptStatus, GeneratedImage } from './types';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { GenerationParamsPanel } from './GenerationParamsPanel';
import { ImageContentArea } from './ImageContentArea';


export function ImageGenerationStep({
  session,
  selectedPromptIds,
  onGenerateImages,
  refreshTrigger,
  projectName,
  isGeneratingImages,
  onStartPolling
}: ImageGenerationStepProps) {
  const selectedPrompts = Array.from(session.prompts?.values() || []).filter(p => selectedPromptIds.has(p.id));

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
              // 获取这些图片对应的promptId
              const promptIdsToMonitor = processingImages.map(img => img.promptId);
              // 去重
              const uniquePromptIds = Array.from(new Set(promptIdsToMonitor));

              // 调用父组件的轮询方法
              if (onStartPolling) {
                onStartPolling(uniquePromptIds);
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



  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 左侧生成参数区域 */}
      <GenerationParamsPanel
        selectedPromptsCount={selectedPrompts.length}
        isGeneratingImages={isGeneratingImages}
        onGenerateImages={onGenerateImages}
      />

      {/* 右侧内容区域 */}
      <ImageContentArea
        selectedPrompts={selectedPrompts}
        historicalImages={historicalImages}
        isLoadingHistoricalData={isLoadingHistoricalData}
        projectName={projectName}
        onRefreshImages={async () => {
          if (session.projectId) {
            const images = await AIImageSessionsAPI.loadImages(session.projectId);
            setHistoricalImages(images || []);
          }
        }}
      />
    </div>
  );
}