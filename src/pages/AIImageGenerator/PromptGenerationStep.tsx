import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Edit3, ArrowRight, Check, Square, RotateCcw } from 'lucide-react';
import { PromptGenerationStepProps } from './types';

interface OriginalPromptState {
  id: string;
  text: string;
  selected: boolean;
}

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
  
  // 跟踪提示词的原始状态
  const [originalPromptStates, setOriginalPromptStates] = useState<Map<string, OriginalPromptState>>(new Map());

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

  // 初始化和更新原始状态跟踪
  useEffect(() => {
    const currentPrompts = Array.from(session.prompts?.values() || []);
    
    setOriginalPromptStates(prevOriginal => {
      const newOriginal = new Map(prevOriginal);
      
      // 为新的提示词添加原始状态记录
      currentPrompts.forEach(prompt => {
        if (!newOriginal.has(prompt.id)) {
          newOriginal.set(prompt.id, {
            id: prompt.id,
            text: prompt.text,
            selected: prompt.selected
          });
        }
      });
      
      // 移除已不存在的提示词的原始状态记录
      Array.from(newOriginal.keys()).forEach(id => {
        if (!session.prompts?.has(id)) {
          newOriginal.delete(id);
        }
      });
      
      return newOriginal;
    });
  }, [session.prompts]);

  // 计算修改统计和分类提示词
  const calculateChangeStats = () => {
    const currentPrompts = Array.from(session.prompts?.values() || []);
    let newlyAdded = 0;
    let deselected = 0;
    let edited = 0;
    let unchanged = 0;
    let toRegenerate = 0;
    let toDelete = 0;

    const newlyAddedPrompts: Array<{id: string, text: string}> = [];
    const editedPrompts: Array<{id: string, text: string, originalText: string}> = [];
    const deselectedPrompts: Array<{id: string, text: string}> = [];

    currentPrompts.forEach(current => {
      const original = originalPromptStates.get(current.id);
      if (!original) {
        // 新添加的提示词
        if (current.selected) {
          newlyAdded++;
          toRegenerate++;
          newlyAddedPrompts.push({id: current.id, text: current.text});
        }
      } else {
        // 现有提示词的变化
        const textChanged = current.text !== original.text;
        const selectionChanged = current.selected !== original.selected;
        
        if (textChanged && current.selected) {
          edited++;
          toRegenerate++;
          editedPrompts.push({id: current.id, text: current.text, originalText: original.text});
        } else if (selectionChanged) {
          if (current.selected && !original.selected) {
            // 重新选择
            newlyAdded++;
            toRegenerate++;
            newlyAddedPrompts.push({id: current.id, text: current.text});
          } else if (!current.selected && original.selected) {
            // 取消选择
            deselected++;
            toDelete++;
            deselectedPrompts.push({id: current.id, text: original.text});
          }
        } else if (current.selected && !textChanged && !selectionChanged) {
          unchanged++;
        }
      }
    });

    return {
      newlyAdded,
      deselected,
      edited,
      unchanged,
      toRegenerate,
      toDelete,
      newlyAddedPrompts,
      editedPrompts,
      deselectedPrompts
    };
  };

  // 恢复原始状态
  const handleRestoreOriginal = () => {
    originalPromptStates.forEach(original => {
      const current = session.prompts?.get(original.id);
      if (current) {
        if (current.selected !== original.selected) {
          onTogglePromptSelection(original.id);
        }
        if (current.text !== original.text) {
          onUpdatePromptText(original.id, original.text);
        }
      }
    });
  };

  const changeStats = calculateChangeStats();
  
  return (
    <div className="space-y-6">
      {/* 对话区域 - 可滚动，占据剩余高度 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex flex-col h-[65vh]">
          {/* 对话历史 */}
          <div className="flex-1 overflow-y-auto p-6">
            {session.conversation.messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>开始对话来生成商品图提示词</p>
                  <p className="text-xs text-gray-400 mt-2">例如：为苹果手机制作白底产品图</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {session.conversation.messages.map((message, msgIndex) => (
                    <div key={`${session.conversation.id}-${msgIndex}`} className="space-y-3">
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
                                          {editingPromptId === prompt.id ? (
                                            <div className="flex-1 space-y-2">
                                              <textarea
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                className="w-full text-xs text-gray-700 leading-relaxed border rounded p-2 resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                rows={2}
                                                autoFocus
                                              />
                                              <div className="flex gap-1">
                                                <Button size="sm" onClick={handleSaveEdit} className="text-xs h-6 px-2">
                                                  保存
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="text-xs h-6 px-2">
                                                  取消
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <span 
                                              className={`flex-1 cursor-pointer ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}
                                              onClick={() => onTogglePromptSelection(promptId)}
                                            >
                                              {prompt.text}
                                            </span>
                                          )}
                                          {editingPromptId !== prompt.id && (
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleStartEdit({id: prompt.id, text: prompt.text})}
                                                className="p-1 transition-all duration-200 flex-shrink-0 text-gray-400 hover:text-blue-600"
                                                title="编辑提示词"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
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
                                          )}
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
                }
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

      {/* 选中提示词统计区域 */}
      {selectedPrompts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-800">
              提示词修改情况
            </h4>
            <div className="flex gap-2">
              <Button 
                onClick={handleRestoreOriginal} 
                size="sm" 
                variant="outline"
                className="text-gray-600 hover:text-gray-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                恢复原状态
              </Button>
              {canGoToNextStep && (
                <Button onClick={onNextStep} size="sm" className="bg-green-600 hover:bg-green-700">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  下一步：生成图片
                </Button>
              )}
            </div>
          </div>
          
          {/* 修改统计信息 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800">
                  重新生成 {changeStats.toRegenerate} 张照片
                  {(changeStats.newlyAdded > 0 || changeStats.edited > 0) && (
                    <span className="text-xs font-normal ml-1">
                      (
                      {changeStats.newlyAdded > 0 && `新增${changeStats.newlyAdded}个`}
                      {changeStats.newlyAdded > 0 && changeStats.edited > 0 && ','}
                      {changeStats.edited > 0 && `修改${changeStats.edited}个`}
                      )
                    </span>
                  )}
                </div>
                
                {/* 具体提示词列表 */}
                {changeStats.toRegenerate > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {changeStats.newlyAddedPrompts.map((prompt) => (
                      <div key={prompt.id} className="text-xs text-green-700 bg-white p-2 rounded border-l-2 border-green-400">
                        <span className="font-medium text-green-600">[新增]</span> {prompt.text}
                      </div>
                    ))}
                    {changeStats.editedPrompts.map((prompt) => (
                      <div key={prompt.id} className="text-xs text-green-700 bg-white p-2 rounded border-l-2 border-green-400">
                        <div><span className="font-medium text-green-600">[修改]</span> {prompt.text}</div>
                        <div className="text-gray-500 mt-1"><span className="font-medium">原文：</span>{prompt.originalText}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-sm font-medium text-red-800">
                  删除 {changeStats.toDelete} 张照片
                  <span className="text-xs font-normal ml-1">(取消选择的提示词)</span>
                </div>
                
                {/* 具体提示词列表 */}
                {changeStats.toDelete > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {changeStats.deselectedPrompts.map((prompt) => (
                      <div key={prompt.id} className="text-xs text-red-700 bg-white p-2 rounded border-l-2 border-red-400">
                        <span className="font-medium text-red-600">[取消选择]</span> {prompt.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}