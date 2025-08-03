import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

import { StepIndicator } from './StepIndicator';
import { PromptGenerationStep } from './PromptGenerationStep';
import { ImageGenerationStep } from './ImageGenerationStep';
import { AIImageSession, Step, Prompt } from './types';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';

export function AIImageGenerator() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<AIImageProject | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(Step.PROMPT_GENERATION);
  const [session, setSession] = useState<AIImageSession>({
    id: projectId || '',
    projectId: projectId || '',
    prompts: new Map(),
    conversation: {
      id: 'conv-1',
      timestamp: new Date().toISOString(),
      messages: []
    }
  });
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
    const conversationId = 'conv-1';
    const timestamp = new Date().toISOString();
    
    // 创建提示词Map
    const promptsMap = new Map();
    promptsMap.set('1', {
      id: '1',
      text: '高质量苹果手机产品摄影，白色背景，专业灯光',
      selected: true,
      imageGenerated: true,
      imageUrl: 'https://picsum.photos/400/400?random=1',
      createdAt: timestamp,
      conversationId
    });
    promptsMap.set('2', {
      id: '2',
      text: '苹果手机商业摄影，简约风格，柔和阴影',
      selected: false,
      imageGenerated: false,
      createdAt: timestamp,
      conversationId
    });

    const mockSession: AIImageSession = {
      id,
      projectId: id,
      prompts: promptsMap,
      conversation: {
        id: conversationId,
        timestamp,
        messages: [
          {
            role: 'user',
            content: '我需要为苹果手机制作一些产品摄影风格的图片'
          },
          {
            role: 'assistant',
            content: '好的，我将为您生成一些苹果手机产品摄影风格的AI提示词。这些提示词将帮助您创建高质量的产品图片。',
            promptIds: ['1', '2']
          }
        ]
      }
    };
    setSession(mockSession);
  };

  const extractNumberFromText = (text: string): number | null => {
    const match = text.match(/(\\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const generatePromptsFromChat = async (userInput: string) => {
    if (!userInput.trim()) return;
    
    setIsGeneratingPrompts(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 根据用户输入智能生成提示词
      const keywords = userInput.toLowerCase();
      let basePrompts: string[] = [];
      
      if (keywords.includes('手机') || keywords.includes('iphone') || keywords.includes('苹果')) {
        basePrompts = [
          '高质量苹果手机产品摄影，白色背景，专业灯光',
          '苹果手机商业摄影，简约风格，柔和阴影',
          '苹果手机电商主图，清晰细节，中性色调',
          '苹果手机产品展示，现代简约，高端质感'
        ];
      } else if (keywords.includes('鞋') || keywords.includes('运动')) {
        basePrompts = [
          '高质量运动鞋产品摄影，白色背景，专业灯光',
          '运动鞋商业摄影，简约风格，柔和阴影',
          '运动鞋电商主图，清晰细节，中性色调',
          '运动鞋产品展示，现代简约，高端质感'
        ];
      } else if (keywords.includes('english') || keywords.includes('英文')) {
        basePrompts = [
          'High-quality product photography, white background, professional lighting',
          'Commercial photography, minimalist style, soft shadows',
          'E-commerce main image, clear details, neutral tones',
          'Product showcase, modern minimalist, premium texture'
        ];
      } else {
        // 通用提示词生成，根据用户输入的数量决定
        const requestedCount = extractNumberFromText(userInput) || 4;
        basePrompts = [
          '高质量产品摄影，白色背景，专业灯光',
          '商业摄影，简约风格，柔和阴影',
          '电商主图，清晰细节，中性色调',
          '产品展示，现代简约，高端质感',
          '特写镜头，突出质感，工作室灯光',
          '平面广告，创意构图，视觉冲击',
          'lifestyle场景，自然环境，生活化',
          'minimalist风格，极简设计，留白艺术',
          '360度展示，多角度，全方位视角'
        ].slice(0, requestedCount);
      }
      
      const newPrompts = basePrompts.map((text, index) => ({
        id: String(Date.now() + index),
        text,
        selected: false,
        imageGenerated: false,
        createdAt: new Date().toISOString(),
        conversationId: '' // 将在使用时设置
      }));
      
      return newPrompts;
    } catch (error) {
      console.error('生成提示词失败:', error);
      return [];
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const togglePromptSelection = (id: string) => {
    setSession(prev => {
      const newPromptsMap = new Map(prev.prompts);
      const prompt = newPromptsMap.get(id);
      
      if (prompt) {
        newPromptsMap.set(id, {
          ...prompt,
          selected: !prompt.selected
        });
      }

      return {
        ...prev,
        prompts: newPromptsMap
      };
    });
    setHasUnsavedChanges(true);
  };

  const generateImages = async () => {
    const selectedPrompts = Array.from(session.prompts.values()).filter(p => p.selected);
    if (selectedPrompts.length === 0) return;
    
    setIsGeneratingImages(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 更新选中的提示词，设置图片URL和生成状态
      setSession(prev => {
        const newPromptsMap = new Map(prev.prompts);
        for (const [id, prompt] of newPromptsMap) {
          if (prompt.selected) {
            newPromptsMap.set(id, {
              ...prompt,
              imageGenerated: true,
              imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`
            });
          }
        }
        return {
          ...prev,
          prompts: newPromptsMap
        };
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
      
      // 自动更新输入框内容
      if (newSelection.length > 0) {
        const selectedPrompts = Array.from(session.prompts.values()).filter(p => newSelection.includes(p.id));
        const promptTexts = selectedPrompts.map(p => `"${p.text}"`).join('、');
        
        const optimizationRequest = `请帮我优化这${selectedPrompts.length}个提示词：${promptTexts}`;
        
        setCurrentChatInput(optimizationRequest);
        
        // 聚焦到输入框但不滚动
        setTimeout(() => {
          const inputElement = document.querySelector('input[placeholder*="描述"]') as HTMLInputElement;
          if (inputElement) {
            inputElement.focus({ preventScroll: true });
          }
        }, 100);
      } else {
        setCurrentChatInput('');
      }
      
      return newSelection;
    });
  };

  const handleChatSubmit = async () => {
    if (!currentChatInput.trim()) return;
    
    const userMessage = currentChatInput;
    const isOptimizationRequest = selectedPromptsForOptimization.length > 0 && (userMessage.includes('优化') || userMessage.includes('optimize'));
    
    setCurrentChatInput('');
    setIsGeneratingPrompts(true);
    
    try {
      if (isOptimizationRequest && selectedPromptsForOptimization.length > 0) {
        // 处理多个提示词优化请求
        setTimeout(() => {
          // 从提示词Map中查找要优化的提示词
          const originalPrompts = selectedPromptsForOptimization
            .map(id => session.prompts.get(id))
            .filter(Boolean) as Array<Prompt>;
          
          if (originalPrompts.length > 0) {
            // 模拟AI优化多个提示词
            const conversationId = `conv-${Date.now()}`;
            const timestamp = new Date().toISOString();
            
            const optimizedPrompts = originalPrompts.map((prompt, index) => {
              const optimizedText = `${prompt.text}，4K超高清，专业摄影设备拍摄，完美光影效果，电影级质感`;
              
              return {
                id: `optimized-${Date.now()}-${index}`,
                text: optimizedText,
                selected: false,
                imageGenerated: false,
                createdAt: timestamp,
                conversationId
              };
            });
            
            const assistantResponse = `我已经为您优化了这${originalPrompts.length}个提示词，为每个都增加了更多专业细节和质感描述。优化后的版本应该能产生更高质量的图片效果。`;
            
            setSession(prev => {
              const newPromptsMap = new Map(prev.prompts);
              optimizedPrompts.forEach(prompt => {
                newPromptsMap.set(prompt.id, prompt);
              });
              
              return {
                ...prev,
                prompts: newPromptsMap,
                conversation: {
                  ...prev.conversation,
                  messages: [...prev.conversation.messages,
                    { role: 'user', content: userMessage },
                    { 
                      role: 'assistant', 
                      content: assistantResponse,
                      promptIds: optimizedPrompts.map(p => p.id)
                    }
                  ]
                }
              };
            });
          }
          
          setSelectedPromptsForOptimization([]);
          setHasUnsavedChanges(true);
          setIsGeneratingPrompts(false);
        }, 1500);
      } else {
        // 处理常规对话和提示词生成
        const newPrompts = await generatePromptsFromChat(userMessage);
        
        setTimeout(() => {
          if (newPrompts && newPrompts.length > 0) {
            const conversationId = `conv-${Date.now()}`;
            
            // 更新提示词的conversationId
            const updatedPrompts = newPrompts.map(prompt => ({
              ...prompt,
              conversationId
            }));
            
            const assistantResponse = `我理解您的需求，已为您生成了${newPrompts.length}个AI提示词。您可以选择合适的提示词来生成图片。`;
            
            setSession(prev => {
              const newPromptsMap = new Map(prev.prompts);
              updatedPrompts.forEach(prompt => {
                newPromptsMap.set(prompt.id, prompt);
              });
              
              return {
                ...prev,
                prompts: newPromptsMap,
                conversation: {
                  ...prev.conversation,
                  messages: [...prev.conversation.messages,
                    { role: 'user', content: userMessage },
                    { 
                      role: 'assistant', 
                      content: assistantResponse,
                      promptIds: updatedPrompts.map(p => p.id)
                    }
                  ]
                }
              };
            });
          } else {
            setSession(prev => ({
              ...prev,
              conversation: {
                ...prev.conversation,
                messages: [...prev.conversation.messages,
                  { role: 'user', content: userMessage },
                  { role: 'assistant', content: '抱歉，生成提示词时出现问题，请重试。' }
                ]
              }
            }));
          }
          setHasUnsavedChanges(true);
          setIsGeneratingPrompts(false);
        }, 1500);
      }
    } catch (error) {
      console.error('处理对话失败:', error);
      setIsGeneratingPrompts(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      console.log('AI生图会话已保存:', session);
    } catch (error) {
      console.error('保存失败:', error);
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
    if (step === Step.IMAGE_GENERATION && Array.from(session.prompts.values()).filter(p => p.selected).length === 0) {
      return; // 不允许跳转到第二步如果没有选中的提示词
    }
    setCurrentStep(step);
  };

  const goToStep2 = () => {
    if (currentStep === Step.PROMPT_GENERATION && Array.from(session.prompts.values()).filter(p => p.selected).length > 0) {
      setCurrentStep(Step.IMAGE_GENERATION);
    }
  };

  const canAccessStep2 = Array.from(session.prompts.values()).filter(p => p.selected).length > 0;

  const updatePromptText = (id: string, newText: string) => {
    setSession(prev => {
      const newPromptsMap = new Map(prev.prompts);
      const prompt = newPromptsMap.get(id);
      if (prompt) {
        newPromptsMap.set(id, {
          ...prompt,
          text: newText,
          imageGenerated: false,
          imageUrl: undefined
        });
      }
      return {
        ...prev,
        prompts: newPromptsMap
      };
    });
    setHasUnsavedChanges(true);
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
            session={session}
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
          />
        )}

        {currentStep === Step.IMAGE_GENERATION && (
          <ImageGenerationStep 
            session={session}
            isGeneratingImages={isGeneratingImages}
            onGenerateImages={generateImages}
          />
        )}
      </div>
    </div>
  );
}