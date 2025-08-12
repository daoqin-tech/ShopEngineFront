import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Check, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PromptGenerationStepProps, Prompt, PromptStatus } from './types';


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
  onChatSubmit
}: PromptGenerationStepProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  
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
  




  
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
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
                                      </div>
                                    </div>
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