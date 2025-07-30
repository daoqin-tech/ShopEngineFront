import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Edit3, ArrowRight, Check, Square } from 'lucide-react';
import { PromptGenerationStepProps } from './types';

export function PromptGenerationStep({
  session,
  isGeneratingPrompts,
  currentChatInput,
  setCurrentChatInput,
  selectedPromptsForOptimization,
  setSelectedPromptsForOptimization,
  onTogglePromptSelection,
  onTogglePromptForOptimization,
  onUpdatePromptText,
  onChatSubmit,
  onNextStep,
  canGoToNextStep
}: PromptGenerationStepProps) {
  const selectedPrompts = Array.from(session.prompts?.values() || []).filter(p => p.selected);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const handleStartEdit = (prompt: {id: string, text: string}) => {
    setEditingPromptId(prompt.id);
    setEditingText(prompt.text);
  };

  const handleSaveEdit = () => {
    if (editingPromptId && editingText.trim()) {
      onUpdatePromptText(editingPromptId, editingText.trim());
    }
    setEditingPromptId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingPromptId(null);
    setEditingText('');
  };

  return (
    <div className="space-y-6">
      {/* 对话区域 - 可滚动，占据剩余高度 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex flex-col h-[65vh]">
          {/* 对话历史 */}
          <div className="flex-1 overflow-y-auto p-6">
            {session.conversations.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>开始对话来生成商品图提示词</p>
                  <p className="text-xs text-gray-400 mt-2">例如：为苹果手机制作白底产品图</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {session.conversations.map((conversation) => 
                  conversation.messages.map((message, msgIndex) => (
                    <div key={`${conversation.id}-${msgIndex}`} className="space-y-3">
                      {message.role === 'user' ? (
                        // 用户消息
                        <div className="flex justify-end">
                          <div className="max-w-2xl px-4 py-2 bg-blue-500 text-white rounded-lg">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        // AI回复
                        <div className="flex justify-start">
                          <div className="max-w-2xl px-4 py-2 bg-white border rounded-lg shadow-sm">
                            <p className="text-sm text-gray-800">{message.content}</p>
                            
                            {/* 显示生成的提示词 - 可交互选择 */}
                            {message.promptIds && message.promptIds.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500 font-medium">生成的提示词（点击选择）：</p>
                                  {(() => {
                                    // 获取当前消息关联的提示词
                                    const messagePrompts = message.promptIds?.map(id => session.prompts.get(id)).filter(Boolean) || [];
                                    const allSelected = messagePrompts.every(p => p?.selected);
                                    
                                    return (
                                      <button
                                        onClick={() => {
                                          messagePrompts.forEach(prompt => {
                                            if (prompt) {
                                              const isCurrentlySelected = prompt.selected;
                                              if (allSelected && isCurrentlySelected) {
                                                // 如果全部已选中，则取消全选
                                                onTogglePromptSelection(prompt.id);
                                              } else if (!allSelected && !isCurrentlySelected) {
                                                // 如果不是全部选中，则选中未选中的
                                                onTogglePromptSelection(prompt.id);
                                              }
                                            }
                                          });
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                                          allSelected 
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300' 
                                            : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                                        }`}
                                        title={allSelected ? '取消选择所有提示词' : '选择所有提示词'}
                                      >
                                        {allSelected ? (
                                          <>
                                            <Check className="w-3 h-3" />
                                            取消全选
                                          </>
                                        ) : (
                                          <>
                                            <Square className="w-3 h-3" />
                                            全选
                                          </>
                                        )}
                                      </button>
                                    );
                                  })()}
                                </div>
                                <div className="space-y-2">
                                  {message.promptIds?.map((promptId, pIndex) => {
                                    const prompt = session.prompts.get(promptId);
                                    if (!prompt) return null;
                                    
                                    const isSelected = prompt.selected;
                                    const isSelectedForOptimization = selectedPromptsForOptimization.includes(promptId);
                                    
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
                                            onChange={() => onTogglePromptSelection(promptId)}
                                            className="w-3 h-3 text-blue-600 rounded focus:ring-1 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                                          />
                                          <span 
                                            className={`flex-1 cursor-pointer ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}
                                            onClick={() => onTogglePromptSelection(promptId)}
                                          >
                                            {prompt.text}
                                          </span>
                                          <button
                                            onClick={() => onTogglePromptForOptimization(promptId)}
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
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* 底部区域：优化状态提示 + 输入框 */}
          <div className="border-t border-gray-200 p-6 space-y-4">
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
                placeholder="描述您要制作的商品图片，例如：为苹果手机制作白底产品图..."
                onKeyDown={(e) => e.key === 'Enter' && !isGeneratingPrompts && onChatSubmit()}
                className="flex-1"
                disabled={isGeneratingPrompts}
              />
              <Button 
                onClick={onChatSubmit} 
                disabled={!currentChatInput.trim() || isGeneratingPrompts}
                size="lg"
              >
                {isGeneratingPrompts ? '生成中...' : '发送'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 选中提示词编辑区域 */}
      {selectedPrompts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-800">
              已选中的提示词 ({selectedPrompts.length}个)
            </h4>
            {canGoToNextStep && (
              <Button onClick={onNextStep} size="sm" className="bg-green-600 hover:bg-green-700">
                <ArrowRight className="w-4 h-4 mr-2" />
                下一步：生成图片
              </Button>
            )}
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {selectedPrompts.map((prompt, index) => (
              <div key={prompt.id} className="p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    {editingPromptId === prompt.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full text-sm text-gray-700 leading-relaxed border rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            保存
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-700 leading-relaxed flex-1">
                          {prompt.text}
                        </p>
                        <button
                          onClick={() => handleStartEdit(prompt)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-white"
                          title="编辑提示词"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}