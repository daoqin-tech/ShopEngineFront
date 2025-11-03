import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface Template {
  id: string;
  name: string;
}

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onTemplateSelect: (templateId: string) => void;
  loading?: boolean;
}

// 解析模板名称,提取分类信息
function parseTemplateName(name: string): { displayName: string; category: string } {
  // 匹配括号内的内容作为分类
  const match = name.match(/^(.+?)[(（](.+?)[)）]$/);

  if (match) {
    return {
      displayName: match[1].trim(),
      category: match[2].trim()
    };
  }

  // 如果没有括号,返回原名称和默认分类
  return {
    displayName: name,
    category: '其他'
  };
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  loading = false
}: TemplateSelectorProps) {
  // 按分类分组模板
  const groupedTemplates = useMemo(() => {
    const groups: { [category: string]: Template[] } = {};

    templates.forEach(template => {
      const { category } = parseTemplateName(template.name);

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(template);
    });

    // 排序分类名称
    return Object.keys(groups)
      .sort()
      .reduce((acc, category) => {
        acc[category] = groups[category];
        return acc;
      }, {} as { [category: string]: Template[] });
  }, [templates]);

  // 每个分类的展开/收起状态
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>(() => {
    // 默认全部展开
    const initial: { [key: string]: boolean } = {};
    Object.keys(groupedTemplates).forEach(category => {
      initial[category] = true;
    });
    return initial;
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleAll = () => {
    const allExpanded = Object.values(expandedCategories).every(v => v);
    const newState: { [key: string]: boolean } = {};
    Object.keys(expandedCategories).forEach(category => {
      newState[category] = !allExpanded;
    });
    setExpandedCategories(newState);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">加载模板中...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">暂无可用模板</div>
      </div>
    );
  }

  const allExpanded = Object.values(expandedCategories).every(v => v);

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4" />
          选择模板 *
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAll}
          className="text-xs"
        >
          {allExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              全部收起
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              全部展开
            </>
          )}
        </Button>
      </div>

      {/* "全部模板"选项 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onTemplateSelect('all')}
          className={`
            w-full p-3 rounded-lg border-2 text-left transition-all
            ${selectedTemplateId === 'all' || selectedTemplateId === ''
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-sm">全部模板</span>
            <span className="text-xs text-gray-500">({templates.length})</span>
          </div>
        </button>
      </div>

      {/* 分类展示 */}
      <div className="space-y-3">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category} className="border rounded-lg bg-white overflow-hidden">
            {/* 分类标题 */}
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-sm text-gray-900">{category}</span>
                <span className="text-xs text-gray-500">({categoryTemplates.length})</span>
              </div>
              {expandedCategories[category] ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* 分类下的模板列表 */}
            {expandedCategories[category] && (
              <div className="p-3 space-y-2">
                {categoryTemplates.map(template => {
                  const { displayName } = parseTemplateName(template.name);
                  const isSelected = selectedTemplateId === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onTemplateSelect(template.id)}
                      className={`
                        w-full p-3 rounded-md border text-left transition-all
                        ${isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {displayName}
                        </span>
                        {isSelected && (
                          <div className="flex items-center justify-center w-5 h-5 bg-primary rounded-full">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
