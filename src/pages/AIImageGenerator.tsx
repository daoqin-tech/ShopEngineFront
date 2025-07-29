import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MessageSquare } from 'lucide-react';

interface Prompt {
  id: string;
  text: string;
  selected: boolean;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
}

interface AIImageSession {
  id: string;
  name: string;
  description: string;
  prompts: Prompt[];
  generatedImages: GeneratedImage[];
  chatMessages: {user: string, assistant: string, prompts?: Prompt[]}[];
}

export function AIImageGenerator() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<AIImageSession>({
    id: projectId || '',
    name: '',
    description: '',
    prompts: [],
    generatedImages: [],
    chatMessages: []
  });
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedPromptsForOptimization, setSelectedPromptsForOptimization] = useState<string[]>([]);

  useEffect(() => {
    if (projectId && !projectId.startsWith('new-')) {
      loadSession(projectId);
    } else {
      setSession(prev => ({
        ...prev,
        name: '新建AI生图会话',
        description: '请输入会话描述'
      }));
    }
  }, [projectId]);

  const loadSession = async (id: string) => {
    const mockSession: AIImageSession = {
      id,
      name: '苹果手机AI生图',
      description: '为新款iPhone制作商品主图',
      prompts: [
        { id: '1', text: '高质量苹果手机产品摄影，白色背景，专业灯光', selected: true },
        { id: '2', text: '苹果手机商业摄影，简约风格，柔和阴影', selected: false }
      ],
      generatedImages: [
        {
          id: '1',
          prompt: '高质量苹果手机产品摄影，白色背景，专业灯光',
          imageUrl: 'https://picsum.photos/400/400?random=1'
        }
      ],
      chatMessages: [
        {
          user: '我需要为苹果手机制作一些产品摄影风格的图片',
          assistant: '好的，我将为您生成一些苹果手机产品摄影风格的AI提示词。这些提示词将帮助您创建高质量的产品图片。',
          prompts: [
            { id: '1', text: '高质量苹果手机产品摄影，白色背景，专业灯光', selected: true },
            { id: '2', text: '苹果手机商业摄影，简约风格，柔和阴影', selected: false }
          ]
        }
      ]
    };
    setSession(mockSession);
  };

  const extractNumberFromText = (text: string): number | null => {
    const match = text.match(/(\d+)/);
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
        selected: false
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
    setSession(prev => ({
      ...prev,
      prompts: prev.prompts.map(prompt => 
        prompt.id === id 
          ? { ...prompt, selected: !prompt.selected }
          : prompt
      )
    }));
    setHasUnsavedChanges(true);
  };

  const generateImages = async () => {
    const selectedPrompts = session.prompts.filter(p => p.selected);
    if (selectedPrompts.length === 0) return;
    
    setIsGeneratingImages(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockImages = selectedPrompts.map(prompt => ({
        id: Math.random().toString(36).substring(2, 11),
        prompt: prompt.text,
        imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`
      }));
      
      setSession(prev => ({ ...prev, generatedImages: mockImages }));
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
        const selectedPrompts = session.prompts.filter(p => newSelection.includes(p.id));
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
          const originalPrompts = session.prompts.filter(p => selectedPromptsForOptimization.includes(p.id));
          if (originalPrompts.length > 0) {
            // 模拟AI优化多个提示词
            const optimizedPrompts = originalPrompts.map((prompt, index) => {
              const optimizedText = `${prompt.text}，4K超高清，专业摄影设备拍摄，完美光影效果，电影级质感`;
              
              return {
                id: `optimized-${Date.now()}-${index}`,
                text: optimizedText,
                selected: false
              };
            });
            
            const assistantResponse = `我已经为您优化了这${originalPrompts.length}个提示词，为每个都增加了更多专业细节和质感描述。优化后的版本应该能产生更高质量的图片效果。`;
            
            setSession(prev => ({
              ...prev,
              prompts: [...prev.prompts, ...optimizedPrompts],
              chatMessages: [...prev.chatMessages, {
                user: userMessage,
                assistant: assistantResponse,
                prompts: optimizedPrompts
              }]
            }));
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
            const assistantResponse = `我理解您的需求，已为您生成了${newPrompts.length}个AI提示词。您可以选择合适的提示词来生成图片。`;
            
            setSession(prev => ({
              ...prev,
              prompts: newPrompts,
              chatMessages: [...prev.chatMessages, {
                user: userMessage,
                assistant: assistantResponse,
                prompts: newPrompts
              }]
            }));
          } else {
            setSession(prev => ({
              ...prev,
              chatMessages: [...prev.chatMessages, {
                user: userMessage,
                assistant: '抱歉，生成提示词时出现问题，请重试。'
              }]
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

  const updateSessionField = (field: keyof AIImageSession, value: any) => {
    setSession(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {/* 会话头部 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div>
                <Input
                  value={session.name}
                  onChange={(e) => updateSessionField('name', e.target.value)}
                  className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
                  placeholder="AI生图会话名称"
                />
                <Input
                  value={session.description}
                  onChange={(e) => updateSessionField('description', e.target.value)}
                  className="text-gray-600 border-none p-0 h-auto bg-transparent mt-1"
                  placeholder="会话描述"
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* AI对话生成提示词 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">生成AI提示词</h2>
            <p className="text-sm text-gray-600 mt-1">像使用ChatGPT一样，描述您想要生成的图片，或请AI优化提示词</p>
          </div>
          
          {/* 对话区域 */}
          <div className="space-y-4">
            {/* 对话历史 */}
            {session.chatMessages.length > 0 && (
              <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                {session.chatMessages.map((msg, index) => (
                  <div key={index} className="space-y-3">
                    {/* 用户消息 */}
                    <div className="flex justify-end">
                      <div className="max-w-xs lg:max-w-md px-4 py-2 bg-blue-500 text-white rounded-lg">
                        <p className="text-sm">{msg.user}</p>
                      </div>
                    </div>
                    
                    {/* AI回复 */}
                    <div className="flex justify-start">
                      <div className="max-w-xs lg:max-w-md px-4 py-2 bg-white border rounded-lg shadow-sm">
                        <p className="text-sm text-gray-800">{msg.assistant}</p>
                        
                        {/* 显示生成的提示词 - 可交互选择 */}
                        {msg.prompts && msg.prompts.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-gray-500 font-medium">生成的提示词（点击选择）：</p>
                            <div className="space-y-2">
                              {msg.prompts.map((prompt, pIndex) => {
                                const isSelected = session.prompts.find(p => p.id === prompt.id)?.selected || false;
                                const isSelectedForOptimization = selectedPromptsForOptimization.includes(prompt.id);
                                
                                return (
                                  <div 
                                    key={pIndex} 
                                    className={`text-xs p-3 rounded border-2 transition-all duration-200 ${
                                      isSelected 
                                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                        : 'bg-gray-100 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => togglePromptSelection(prompt.id)}
                                        className="w-3 h-3 text-blue-600 rounded focus:ring-1 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                                      />
                                      <span 
                                        className={`flex-1 cursor-pointer ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}
                                        onClick={() => togglePromptSelection(prompt.id)}
                                      >
                                        {prompt.text}
                                      </span>
                                      <button
                                        onClick={() => togglePromptForOptimization(prompt.id)}
                                        className={`p-1 transition-all duration-200 flex-shrink-0 ${
                                          isSelectedForOptimization 
                                            ? 'text-purple-600 bg-purple-100 rounded' 
                                            : 'text-purple-400 hover:text-purple-600'
                                        }`}
                                        title={isSelectedForOptimization ? "取消选择优化" : "选择此提示词进行AI优化"}
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* 显示选中数量和快速生成按钮 */}
                            {session.prompts.some(p => p.selected) && (
                              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-blue-700">
                                    已选择 {session.prompts.filter(p => p.selected).length} 个提示词
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={generateImages}
                                    disabled={isGeneratingImages}
                                    className="text-xs px-3 py-1 h-auto"
                                  >
                                    {isGeneratingImages ? '生成中...' : '立即生成图片'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 优化状态提示 */}
            {selectedPromptsForOptimization.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700 font-medium">
                    已选择 {selectedPromptsForOptimization.length} 个提示词待优化
                  </span>
                  <button
                    onClick={() => setSelectedPromptsForOptimization([])}
                    className="ml-auto text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    清空选择
                  </button>
                </div>
              </div>
            )}
            
            {/* 输入框 */}
            <div className="flex gap-3">
              <Input
                value={currentChatInput}
                onChange={(e) => setCurrentChatInput(e.target.value)}
                placeholder="描述您想要生成的图片，或点击提示词旁的💬让我帮您优化..."
                onKeyDown={(e) => e.key === 'Enter' && !isGeneratingPrompts && handleChatSubmit()}
                className="flex-1"
                disabled={isGeneratingPrompts}
              />
              <Button 
                onClick={handleChatSubmit} 
                disabled={!currentChatInput.trim() || isGeneratingPrompts}
                size="lg"
              >
                {isGeneratingPrompts ? '生成中...' : '发送'}
              </Button>
            </div>
          </div>
        </div>

        {/* 查看生成结果 */}
        {session.generatedImages.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">查看生成结果</h2>
            <p className="text-sm text-gray-600 mb-6">以下是基于您选择的提示词生成的AI图片</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {session.generatedImages.map(image => (
                <div key={image.id} className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <img 
                    src={image.imageUrl} 
                    alt="AI生成的商品图"
                    className="w-full h-64 object-cover rounded-lg border shadow-sm"
                  />
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">使用的提示词：</p>
                    <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded border">
                      {image.prompt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}