import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Check, Square, HelpCircle, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PromptGenerationStepProps, Prompt, PromptStatus } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';


// 辅助函数：处理全选/取消全选（只处理可选择的提示词）
const handleToggleAllPrompts = (messagePrompts: Prompt[], selectedPromptIds: Set<string>, onTogglePromptSelection: (id: string) => void) => {
  // 只处理状态为PENDING或FAILED的提示词（可以重新生成）
  const selectablePrompts = messagePrompts.filter(p => p.status === PromptStatus.PENDING || p.status === PromptStatus.FAILED);
  const allSelectableSelected = selectablePrompts.every(p => selectedPromptIds.has(p.id));
  
  selectablePrompts.forEach(prompt => {
    if (allSelectableSelected && selectedPromptIds.has(prompt.id)) {
      // 如果全部已选中，则取消全选
      onTogglePromptSelection(prompt.id);
    } else if (!allSelectableSelected && !selectedPromptIds.has(prompt.id)) {
      // 如果不是全部选中，则选中未选中的
      onTogglePromptSelection(prompt.id);
    }
  });
};

// 辅助函数：渲染全选按钮（只处理可选择的提示词）
const renderSelectAllButton = (messagePrompts: Prompt[], selectedPromptIds: Set<string>, onTogglePromptSelection: (id: string) => void) => {
  // 只处理状态为PENDING或FAILED的提示词（可以重新生成）
  const selectablePrompts = messagePrompts.filter(p => p.status === PromptStatus.PENDING || p.status === PromptStatus.FAILED);
  
  // 如果没有可选择的提示词，不显示按钮
  if (selectablePrompts.length === 0) {
    return null;
  }
  
  const allSelectableSelected = selectablePrompts.every(p => selectedPromptIds.has(p.id));
  
  return (
    <button
      onClick={() => handleToggleAllPrompts(messagePrompts, selectedPromptIds, onTogglePromptSelection)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
        allSelectableSelected 
          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300' 
          : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'
      }`}
      title={allSelectableSelected ? '取消选择所有可重新生成的提示词' : '选择所有可重新生成的提示词'}
    >
      {allSelectableSelected ? (
        <>
          <Check className="w-3 h-3" />
          取消全选
        </>
      ) : (
        <>
          <Square className="w-3 h-3" />
          全选 ({selectablePrompts.length})
        </>
      )}
    </button>
  );
};

export function PromptGenerationStep({
  session,
  selectedPromptIds,
  isGeneratingPrompts,
  currentChatInput,
  setCurrentChatInput,
  selectedPromptsForOptimization,
  setSelectedPromptsForOptimization,
  onTogglePromptSelection,
  onTogglePromptForOptimization,
  onChatSubmit,
  onCopyPrompt
}: PromptGenerationStepProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [hasOpenedHelp, setHasOpenedHelp] = useState(false);
  // 复制悬浮面板状态
  const [activeCopyPromptId, setActiveCopyPromptId] = useState<string>('');
  const [activeCopyMessageId, setActiveCopyMessageId] = useState<string>('');
  const [copyCount, setCopyCount] = useState(4);
  const [isCopying, setIsCopying] = useState(false);
  
  // 当帮助对话框第一次打开时，自动展开第一个部分
  useEffect(() => {
    if (isHelpDialogOpen && !hasOpenedHelp) {
      setOpenSections(prev => ({ ...prev, features: true }));
      setHasOpenedHelp(true);
    }
  }, [isHelpDialogOpen, hasOpenedHelp]);
  
  // 自动调整textarea高度
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = Math.max(scrollHeight, 48) + 'px';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentChatInput(e.target.value);
    adjustTextareaHeight(e.target);
  };

  // 当输入清空时重置textarea高度
  useEffect(() => {
    if (currentChatInput === '') {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = '48px';
      }
    }
  }, [currentChatInput]);

  // 自动滚动到底部 - 只在有新消息时滚动
  useEffect(() => {
    const currentMessageCount = session.messages.length;
    
    // 只在消息数量增加时才滚动（有新消息）
    if (currentMessageCount > lastMessageCount) {
      setLastMessageCount(currentMessageCount);
      
      if (scrollContainerRef.current) {
        // 使用setTimeout确保DOM更新完成后再滚动
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    } else {
      // 更新消息计数但不滚动
      setLastMessageCount(currentMessageCount);
    }
  }, [session.messages, lastMessageCount]);
  
  // 处理复制按钮点击
  const handleCopyClick = (promptId: string, messageId: string) => {
    if (activeCopyPromptId === promptId) {
      // 如果点击的是已激活的提示词，关闭面板
      setActiveCopyPromptId('');
      setActiveCopyMessageId('');
    } else {
      // 激活新的复制面板
      setActiveCopyPromptId(promptId);
      setActiveCopyMessageId(messageId);
      setCopyCount(4); // 重置为默认值
    }
  };

  // 处理快捷数量选择
  const handleQuickCopy = async (promptId: string, count: number, messageId: string) => {
    if (!onCopyPrompt) return;
    
    setIsCopying(true);
    try {
      await onCopyPrompt(promptId, count, messageId);
      setActiveCopyPromptId(''); // 关闭面板
    } catch (error) {
      console.error('复制提示词失败:', error);
    } finally {
      setIsCopying(false);
    }
  };

  // 处理自定义数量复制确认
  const handleCustomCopyConfirm = async () => {
    if (!onCopyPrompt || !activeCopyPromptId || !activeCopyMessageId) return;
    
    setIsCopying(true);
    try {
      await onCopyPrompt(activeCopyPromptId, copyCount, activeCopyMessageId);
      setActiveCopyPromptId(''); // 关闭面板
      setActiveCopyMessageId('');
    } catch (error) {
      console.error('复制提示词失败:', error);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] relative">
      {/* 右上角帮助按钮 */}
      <div className="absolute top-4 right-6 z-10">
        <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-md transition-all duration-200"
              title="使用说明"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI提示词生成器使用说明</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* 基础功能 */}
              <Collapsible 
                open={openSections['features']} 
                onOpenChange={(open) => setOpenSections(prev => ({...prev, features: open}))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-medium">AI提示词生成器能做什么？</span>
                  {openSections['features'] ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <div className="space-y-3 pt-3 text-sm text-gray-600">
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">智能生成提示词</div>
                          <div>根据您的商品描述，自动生成专业的AI绘图提示词，支持多种风格和场景</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">AI优化提示词</div>
                          <div>选择已生成的提示词进行深度优化，让描述更精准、更有效果</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">批量操作管理</div>
                          <div>支持全选、批量选择和批量优化，提高工作效率</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium text-gray-900">自由对话交互</div>
                          <div>支持自然语言对话，可随时调整需求和优化方向</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 优化操作指南 */}
              <Collapsible 
                open={openSections['optimization']} 
                onOpenChange={(open) => setOpenSections(prev => ({...prev, optimization: open}))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-medium">如何优化提示词？</span>
                  {openSections['optimization'] ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <div className="space-y-3 pt-3 text-sm text-gray-600">
                    <div className="flex items-start gap-3">
                      <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                      <div>
                        <div className="font-medium text-gray-900">选择要优化的提示词</div>
                        <div>点击提示词右侧的 💬 图标，选中的提示词会显示在输入框上方</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                      <div>
                        <div className="font-medium text-gray-900">输入优化指令</div>
                        <div>在输入框中详细描述您希望如何优化，例如：</div>
                        <div className="mt-1 space-y-1 text-xs bg-gray-50 p-2 rounded">
                          <div>• "让背景更简洁，突出产品"</div>
                          <div>• "增加光影效果，提升质感"</div>
                          <div>• "调整为白色背景，商业摄影风格"</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                      <div>
                        <div className="font-medium text-gray-900">查看优化结果</div>
                        <div>AI会根据您的指令生成优化后的提示词，您可以继续迭代优化</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>


              {/* 复制功能 */}
              <Collapsible
                open={openSections['copy']} 
                onOpenChange={(open) => setOpenSections(prev => ({...prev, copy: open}))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-medium">如何复制提示词？</span>
                  {openSections['copy'] ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <div className="space-y-3 pt-3 text-sm text-gray-600">
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                      <div>
                        <div className="font-medium text-gray-900">找到想要复制的提示词</div>
                        <div>在提示词列表中，找到您想要复制的提示词</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                      <div>
                        <div className="font-medium text-gray-900">点击复制按钮</div>
                        <div>点击提示词右侧的复制图标，展开复制面板</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                      <div>
                        <div className="font-medium text-gray-900">选择复制数量</div>
                        <div>可选择快捷数量（4、8、12、20、32）或在自定义框中直接输入数量</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">4</span>
                      <div>
                        <div className="font-medium text-gray-900">确认复制</div>
                        <div>选择快捷数量会直接复制，自定义数量需点击"确认"按钮</div>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      💡 <strong>提示：</strong>复制功能适用于快速生成多个相同的提示词，便于批量图片生成
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 对话历史区域 - 占据剩余空间，无边框 */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="space-y-6">
            {session.messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {message.role === 'user' ? (
                    // 用户消息 - ChatGPT风格
                    <div className="flex justify-end">
                      <div className="max-w-3xl px-5 py-3 bg-gray-900 text-white rounded-2xl">
                        <div className="text-sm prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        
                        {/* 显示用户消息中的提示词（仅展示，不可编辑） */}
                        {message.prompts && message.prompts.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-gray-300">包含的提示词：</p>
                            <div className="space-y-1">
                              {message.prompts.map((prompt) => (
                                <div 
                                  key={prompt.id}
                                  className="text-xs p-2 bg-gray-800 rounded"
                                >
                                  <span className="text-gray-200">{prompt.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // AI回复 - ChatGPT风格
                    <div className="flex justify-start">
                      <div className="max-w-3xl px-5 py-3 bg-gray-50 rounded-2xl">
                        {message.isThinking ? (
                          // AI生成提示词状态
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                            <span>正在生成商品图提示词...</span>
                          </div>
                        ) : (
                          <div className="text-sm prose prose-sm max-w-none text-gray-800">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        )}
                        
                        {/* 显示生成的提示词 - 可交互选择 */}
                        {!message.isThinking && message.prompts && message.prompts.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600 font-medium">生成的提示词（点击选择）：</p>
                              {renderSelectAllButton(message.prompts || [], selectedPromptIds, onTogglePromptSelection)}
                            </div>
                            <div className="space-y-2">
                              {message.prompts?.map((prompt) => {
                                const isSelected = selectedPromptIds.has(prompt.id);
                                const isSelectedForOptimization = selectedPromptsForOptimization.includes(prompt.id);
                                const canSelect = prompt.status === PromptStatus.PENDING || prompt.status === PromptStatus.FAILED;
                                const isQueued = prompt.status === PromptStatus.QUEUED;
                                const isGenerating = prompt.status === PromptStatus.PROCESSING;
                                const isCompleted = prompt.status === PromptStatus.COMPLETED;
                                const isFailed = prompt.status === PromptStatus.FAILED;
                                
                                // 根据状态确定样式
                                const getPromptClassName = () => {
                                  if (isSelected) {
                                    return 'bg-gray-900 border-gray-900 text-white';
                                  }
                                  if (isQueued) return 'bg-blue-50 border-blue-200 opacity-75';
                                  if (isGenerating) return 'bg-yellow-50 border-yellow-200 opacity-75';
                                  if (isCompleted) return 'bg-green-50 border-green-200 opacity-75';
                                  if (isFailed) return 'bg-red-50 border-red-200 hover:border-red-300 hover:bg-red-100';
                                  // PENDING状态
                                  return 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50';
                                };

                                const getStatusText = () => {
                                  if (isQueued) return '队列中...';
                                  if (isGenerating) return '生成中...';
                                  if (isCompleted) return '已生成';
                                  if (isFailed) return '生成失败，可重试';
                                  return null;
                                };
                                
                                return (
                                  <div 
                                    key={prompt.id} 
                                    className={`text-sm p-4 rounded-xl border transition-all duration-200 ${getPromptClassName()}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => canSelect && onTogglePromptSelection(prompt.id)}
                                        disabled={!canSelect}
                                        className={`w-4 h-4 rounded focus:ring-2 mt-0.5 flex-shrink-0 ${
                                          !canSelect 
                                            ? 'opacity-50 cursor-not-allowed'
                                            : isSelected 
                                              ? 'text-white focus:ring-white accent-white' 
                                              : 'text-gray-900 focus:ring-gray-900'
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <span 
                                          className={`${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'} ${
                                            isSelected ? 'text-white font-medium' : 
                                            !canSelect ? 'text-gray-500' : 'text-gray-800'
                                          }`}
                                          onClick={() => canSelect && onTogglePromptSelection(prompt.id)}
                                        >
                                          {prompt.text}
                                        </span>
                                        {getStatusText() && (
                                          <div className={`text-xs mt-1 flex items-center gap-1 ${
                                            isQueued ? 'text-blue-600' :
                                            isGenerating ? 'text-yellow-600' :
                                            isCompleted ? 'text-green-600' :
                                            isFailed ? 'text-red-600' : ''
                                          }`}>
                                            {(isQueued || isGenerating) && (
                                              <div className={`w-3 h-3 border border-t-transparent rounded-full animate-spin ${
                                                isQueued ? 'border-blue-400' : 'border-yellow-400'
                                              }`}></div>
                                            )}
                                            {getStatusText()}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => onTogglePromptForOptimization(prompt.id)}
                                          className={`p-1.5 transition-all duration-200 flex-shrink-0 rounded ${
                                            isSelectedForOptimization 
                                              ? 'text-purple-600 bg-purple-100' 
                                              : isSelected 
                                                ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                                                : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                                          }`}
                                          title={isSelectedForOptimization ? "取消选择优化" : "选择此提示词进行AI优化"}
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleCopyClick(prompt.id, message.id)}
                                          className={`p-1.5 transition-all duration-200 flex-shrink-0 rounded ${
                                            activeCopyPromptId === prompt.id
                                              ? 'text-blue-600 bg-blue-100' 
                                              : isSelected 
                                                ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                          }`}
                                          title="复制此提示词"
                                        >
                                          <Copy className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* 复制悬浮面板 */}
                                    {activeCopyPromptId === prompt.id && (
                                      <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm font-medium text-gray-900">复制数量</div>
                                          <div className="text-xs text-gray-500">用于批量生成图片</div>
                                        </div>
                                        
                                        {/* 快捷数量选择 */}
                                        <div className="flex gap-2">
                                          {[4, 8, 12, 20, 32].map(count => (
                                            <button
                                              key={count}
                                              onClick={() => handleQuickCopy(prompt.id, count, message.id)}
                                              disabled={isCopying}
                                              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {count}
                                            </button>
                                          ))}
                                        </div>
                                        
                                        {/* 自定义数量 */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-gray-700">自定义:</span>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="40"
                                            value={copyCount}
                                            onChange={(e) => setCopyCount(Math.min(40, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="w-16 h-8 text-sm text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            style={{ MozAppearance: 'textfield' }}
                                            placeholder="4"
                                            disabled={isCopying}
                                          />
                                        </div>
                                        
                                        {/* 操作按钮 */}
                                        <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
                                          <button
                                            onClick={() => {
                                              setActiveCopyPromptId('');
                                              setActiveCopyMessageId('');
                                            }}
                                            disabled={isCopying}
                                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
                                          >
                                            取消
                                          </button>
                                          <button
                                            onClick={handleCustomCopyConfirm}
                                            disabled={isCopying}
                                            className="px-2 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {isCopying ? '复制中...' : '确认'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* 底部固定输入区域 - ChatGPT风格 */}
      <div className="flex-shrink-0 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 space-y-4">
          {/* 优化提示词标签显示 */}
          {selectedPromptsForOptimization.length > 0 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700 font-medium">
                  待优化的提示词：
                </span>
                <button
                  onClick={() => setSelectedPromptsForOptimization([])}
                  className="ml-auto text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  清空选择
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPromptsForOptimization.map(promptId => {
                  const prompt = session.prompts?.get(promptId);
                  if (!prompt) return null;
                  
                  return (
                    <div
                      key={promptId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 rounded-full text-sm text-purple-700"
                    >
                      <span className="max-w-32 truncate">{prompt.text}</span>
                      <button
                        onClick={() => onTogglePromptForOptimization(promptId)}
                        className="w-4 h-4 rounded-full bg-purple-200 hover:bg-purple-300 flex items-center justify-center"
                        title="移除此提示词"
                      >
                        <span className="text-xs text-purple-600">×</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 输入框 - ChatGPT风格，参考首页设计 */}
          <div className="relative">
            <div className="relative bg-white rounded-3xl border border-gray-200 transition-all duration-200 focus-within:shadow-lg focus-within:border-gray-300">
              {/* 输入框 */}
              <textarea
                value={currentChatInput}
                onChange={handleInputChange}
                placeholder={
                  selectedPromptsForOptimization.length > 0 
                    ? `请输入优化指令，例如：请优化这${selectedPromptsForOptimization.length}个提示词...`
                    : "描述您要制作的商品图片..."
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isGeneratingPrompts) {
                    e.preventDefault();
                    onChatSubmit();
                  }
                }}
                className="w-full px-5 py-3 pr-12 text-base text-gray-900 placeholder-gray-500 bg-transparent border-0 rounded-3xl focus:outline-none focus:ring-0 resize-none min-h-[48px] max-h-[200px] overflow-y-auto scrollbar-hide"
                style={{
                  height: '48px',
                  minHeight: '48px',
                  maxHeight: '200px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                rows={1}
                disabled={isGeneratingPrompts}
              />

              {/* 右侧垂直居中发送按钮 */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={onChatSubmit}
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}