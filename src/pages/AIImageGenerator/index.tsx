import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

import { StepIndicator } from './StepIndicator';
import { PromptGenerationStep } from './PromptGenerationStep';
import { ImageGenerationStep } from './ImageGenerationStep';
import { AIImageSession, Step, Prompt, GeneratedImage, ExtendedAIImageSession } from './types';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';

export function AIImageGenerator() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<AIImageProject | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(Step.PROMPT_GENERATION);
  const [session, setSession] = useState<AIImageSession>({
    id: projectId || '',
    projectId: projectId || '',
    messages: []
  });
  
  // 前端UI状态管理
  const [promptsMap, setPromptsMap] = useState<Map<string, Prompt>>(new Map());
  const [imagesMap, setImagesMap] = useState<Map<string, GeneratedImage>>(new Map());
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedPromptsForOptimization, setSelectedPromptsForOptimization] = useState<string[]>([]);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      if (!projectId.startsWith('new-')) {
        loadSession(projectId);
      } else {
        setSession(prev => ({
          ...prev
        }));
      }
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
      const sessionData = await AIImageSessionsAPI.getProjectSession(id);
      setSession(sessionData);
      
      // 从messages中提取prompts
      const extractedPromptsMap = new Map<string, Prompt>();
      if (sessionData.messages) {
        sessionData.messages.forEach(message => {
          // 如果消息包含prompts数组，将它们添加到promptsMap中
          if (message.prompts && Array.isArray(message.prompts)) {
            message.prompts.forEach(prompt => {
              extractedPromptsMap.set(prompt.id, prompt);
            });
          }
        });
      }
      setPromptsMap(extractedPromptsMap);
      
      // imagesMap 暂时保持为空，如你所说后续会处理
      setImagesMap(new Map());
    } catch (err) {
      console.error('Error loading session:', err);
      // 后端保证会话存在，如果到这里说明网络或其他错误
    }
  };


  const togglePromptSelection = (id: string) => {
    const prompt = promptsMap.get(id);
    if (!prompt) return;

    const updatedPrompt = {
      ...prompt,
      selected: !prompt.selected
    };

    // 更新 promptsMap
    setPromptsMap(prev => {
      const newPromptsMap = new Map(prev);
      newPromptsMap.set(id, updatedPrompt);
      return newPromptsMap;
    });

    // 更新session.messages中对应的prompt数据
    setSession(prevSession => ({
      ...prevSession,
      messages: prevSession.messages.map(message => ({
        ...message,
        prompts: message.prompts?.map(p => 
          p.id === id ? updatedPrompt : p
        )
      }))
    }));

    setHasUnsavedChanges(true);
  };

  const generateImages = async () => {
    const selectedPrompts = Array.from(promptsMap.values()).filter(p => p.selected);
    if (selectedPrompts.length === 0) return;
    
    setIsGeneratingImages(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 为选中的提示词生成图片，创建独立的图片对象
      setImagesMap(prev => {
        const newImagesMap = new Map(prev);
        
        selectedPrompts.forEach(prompt => {
          const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          const newImage = {
            id: imageId,
            promptId: prompt.id,
            imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`,
            createdAt: new Date().toISOString(),
            status: 'completed' as const,
            metadata: {
              width: 400,
              height: 400,
              model: 'DALL-E-3',
              seed: Math.floor(Math.random() * 1000000)
            }
          };
          newImagesMap.set(imageId, newImage);
        });
        
        return newImagesMap;
      });
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('生成图片失败:', error);
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
        setPromptsMap(prev => {
          const newPromptsMap = new Map(prev);
          aiMessage.prompts!.forEach(prompt => {
            newPromptsMap.set(prompt.id, prompt);
          });
          return newPromptsMap;
        });
      }
      
      // 清除优化选择状态
      setSelectedPromptsForOptimization([]);
      setHasUnsavedChanges(true);
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const savedSession = await AIImageSessionsAPI.saveAIImageSession(session, promptsMap, imagesMap);
      setSession(savedSession);
      setHasUnsavedChanges(false);
      console.log('AI生图会话已保存:', savedSession);
    } catch (error) {
      console.error('保存失败:', error);
      // 可以添加toast提示用户保存失败
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('您有未保存的更改，确定要离开吗？')) {
        navigate('/materials/product-images');
      }
    } else {
      navigate('/materials/product-images');
    }
  };

  const handleStepClick = (step: Step) => {
    const selectedCount = Array.from(promptsMap.values()).filter(p => p.selected).length;
    if (step === Step.IMAGE_GENERATION && selectedCount === 0) {
      return; // 不允许跳转到第二步如果没有选中的提示词
    }
    setCurrentStep(step);
  };

  const goToStep2 = () => {
    const selectedCount = Array.from(promptsMap.values()).filter(p => p.selected).length;
    if (currentStep === Step.PROMPT_GENERATION && selectedCount > 0) {
      setCurrentStep(Step.IMAGE_GENERATION);
    }
  };

  const canAccessStep2 = Array.from(promptsMap.values()).filter(p => p.selected).length > 0;

  const updatePromptText = (id: string, newText: string) => {
    setPromptsMap(prev => {
      const newPromptsMap = new Map(prev);
      const prompt = newPromptsMap.get(id);
      if (prompt) {
        newPromptsMap.set(id, {
          ...prompt,
          text: newText
        });
      }
      return newPromptsMap;
    });
    setHasUnsavedChanges(true);
  };

  // 辅助函数：获取某个提示词的图片
  const getImagesForPrompt = (promptId: string) => {
    return Array.from(imagesMap.values()).filter(img => img.promptId === promptId);
  };

  // 为子组件创建扩展的session对象，保持兼容性
  const extendedSession: ExtendedAIImageSession = {
    ...session,
    prompts: promptsMap,
    images: imagesMap
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* 会话头部 - 集成步骤导航 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {/* 第一行：返回按钮、会话信息、保存按钮 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-lg font-bold">
                  {project?.name || '加载中...'}
                </h1>
                <p className="text-sm text-gray-600">
                  AI生图项目
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
          
          {/* 第二行：步骤导航 */}
          <div className="border-t pt-3">
            <StepIndicator 
              currentStep={currentStep}
              onStepClick={handleStepClick}
              canClickStep2={canAccessStep2}
            />
          </div>
        </div>

        {/* 条件渲染的步骤内容 */}
        {currentStep === Step.PROMPT_GENERATION && (
          <PromptGenerationStep 
            session={extendedSession}
            isGeneratingPrompts={isGeneratingPrompts}
            currentChatInput={currentChatInput}
            setCurrentChatInput={setCurrentChatInput}
            selectedPromptsForOptimization={selectedPromptsForOptimization}
            setSelectedPromptsForOptimization={setSelectedPromptsForOptimization}
            onTogglePromptSelection={togglePromptSelection}
            onTogglePromptForOptimization={togglePromptForOptimization}
            onUpdatePromptText={updatePromptText}
            onChatSubmit={handleChatSubmit}
            onNextStep={goToStep2}
            canGoToNextStep={canAccessStep2}
            getImagesForPrompt={getImagesForPrompt}
          />
        )}

        {currentStep === Step.IMAGE_GENERATION && (
          <ImageGenerationStep 
            session={extendedSession}
            isGeneratingImages={isGeneratingImages}
            onGenerateImages={generateImages}
          />
        )}
      </div>
    </div>
  );
}