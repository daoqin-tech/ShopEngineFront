import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, ChevronRight, ArrowLeft, X, RefreshCw } from 'lucide-react';
import type { TemuTemplate, TemuSpecification, TemuSkuDefaultConfig, TemuSpecVolumeWeightConfig } from '@/services/temuTemplateService';
import type { TemuCategoryPath, TemuAPICategory, ParentSpecification } from '@/services/temuShopCategoryService';
import { TemuSite, AttributeFormValue, isMultiSelect } from './types';
import { SkuConfigTable } from './SkuConfigTable';

interface AddTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Step state
  addStep: 'select' | 'attributes';
  setAddStep: (step: 'select' | 'attributes') => void;
  // Template name
  pendingName: string;
  setPendingName: (name: string) => void;
  // Site selection
  selectedSiteId: number | undefined;
  setSelectedSiteId: (id: number | undefined) => void;
  temuSites: TemuSite[];
  // Search state
  temuSearchKeyword: string;
  setTemuSearchKeyword: (keyword: string) => void;
  searchResults: TemuCategoryPath[];
  searching: boolean;
  isSearchMode: boolean;
  onSearch: () => void;
  onClearSearch: () => void;
  // Browse state
  browseColumns: TemuAPICategory[][];
  selectedPath: TemuAPICategory[];
  loadingColumn: number | null;
  onSelectCategory: (cat: TemuAPICategory, colIndex: number) => void;
  onLoadCategories: (parentCatId: number | undefined, level: number) => void;
  // Template state
  templates: TemuTemplate[];
  pendingCategory: TemuAPICategory | null;
  pendingCategoryPath: TemuCategoryPath | null;
  // Attribute state
  fetchedAttributeCount: number;
  fetchingAttributes: boolean;
  attributeFormValues: AttributeFormValue[];
  updateAttributeValue: (index: number, value: Partial<AttributeFormValue>) => void;
  // Spec state
  inputMaxSpecNum: number;
  singleSpecValueNum: number;
  parentSpecs: ParentSpecification[];
  specFormValues: TemuSpecification[];
  fetchingParentSpecs: boolean;
  onAddSpec: () => void;
  onRemoveSpec: (index: number) => void;
  onUpdateSpecParent: (index: number, parentSpecId: number) => void;
  onUpdateSpecValues: (index: number, valuesStr: string) => void;
  onAddSpecValue: (specIndex: number) => void;
  onRemoveSpecValue: (specIndex: number, valueIndex: number) => void;
  onUpdateSpecValue: (specIndex: number, valueIndex: number, value: string) => void;
  // SKU config state
  skuDefaultConfig: TemuSkuDefaultConfig;
  setSkuDefaultConfig: (config: TemuSkuDefaultConfig) => void;
  volumeWeightConfigs: TemuSpecVolumeWeightConfig[];
  onVolumeWeightConfigChange: (index: number, data: Partial<TemuSpecVolumeWeightConfig>) => void;
  // Actions
  onAddFromBrowse: () => void;
  onSelectSearchResult: (path: TemuCategoryPath) => void;
  onBackToSelect: () => void;
  onSubmit: () => void;
  submitting: boolean;
  // Helpers
  getPathFromSearchResult: (path: TemuCategoryPath) => TemuAPICategory[];
}

export function AddTemplateDialog({
  open,
  onOpenChange,
  addStep,
  setAddStep,
  // Template name
  pendingName,
  setPendingName,
  // Temu state
  selectedSiteId,
  setSelectedSiteId,
  temuSites,
  temuSearchKeyword,
  setTemuSearchKeyword,
  searchResults,
  searching,
  isSearchMode,
  onSearch,
  onClearSearch,
  browseColumns,
  selectedPath,
  loadingColumn,
  onSelectCategory,
  onLoadCategories,
  templates,
  pendingCategory,
  fetchedAttributeCount,
  fetchingAttributes,
  attributeFormValues,
  updateAttributeValue,
  inputMaxSpecNum,
  singleSpecValueNum,
  parentSpecs,
  specFormValues,
  fetchingParentSpecs,
  onAddSpec,
  onRemoveSpec,
  onUpdateSpecParent,
  onUpdateSpecValues: _onUpdateSpecValues,
  onAddSpecValue,
  onRemoveSpecValue,
  onUpdateSpecValue,
  skuDefaultConfig,
  setSkuDefaultConfig,
  volumeWeightConfigs,
  onVolumeWeightConfigChange,
  onAddFromBrowse,
  onSelectSearchResult,
  onBackToSelect,
  onSubmit,
  submitting,
  getPathFromSearchResult,
}: AddTemplateDialogProps) {
  const handleClose = (openState: boolean) => {
    if (!openState) {
      setAddStep('select');
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {addStep === 'select' ? '添加模板' : '填写产品属性'}
          </DialogTitle>
          <DialogDescription>
            {addStep === 'select'
              ? '输入模板名称并选择 Temu 平台分类'
              : `模板名称：${pendingName}，Temu分类：${pendingCategory?.catName}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* 步骤1：选择Temu分类 */}
        {addStep === 'select' && (
          <>
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* 模板名称 */}
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm shrink-0">
                  <span className="text-red-500">*</span> 模板名称
                </Label>
                <Input
                  placeholder="输入模板名称"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  className="max-w-64 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* 站点选择和搜索框 */}
              <div className="flex items-center gap-2 mb-4">
                <Select
                  value={selectedSiteId?.toString() || 'all'}
                  onValueChange={(value) => {
                    const newSiteId = value === 'all' ? undefined : parseInt(value);
                    setSelectedSiteId(newSiteId);
                    onLoadCategories(undefined, 0);
                  }}
                >
                  <SelectTrigger className="w-32 shadow-none focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="全部站点" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部站点</SelectItem>
                    {temuSites.map((site) => (
                      <SelectItem key={site.siteId} value={site.siteId.toString()}>
                        {site.siteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索分类名称..."
                    value={temuSearchKeyword}
                    onChange={(e) => setTemuSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    className="pl-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button onClick={onSearch} disabled={searching || !temuSearchKeyword.trim()}>
                  {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
                {isSearchMode && (
                  <Button variant="outline" size="icon" onClick={onClearSearch}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* 当前选中路径 */}
              {selectedPath.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">当前选择：</div>
                    <div className="flex items-center flex-wrap gap-1">
                      {selectedPath.map((cat, index) => (
                        <div key={cat.catId} className="flex items-center">
                          <span className={`text-sm ${index === selectedPath.length - 1 ? 'font-medium text-primary' : 'text-gray-600'}`}>
                            {cat.catName}
                          </span>
                          {index < selectedPath.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 选中叶子分类时显示添加按钮 */}
                  {selectedPath.length > 0 && selectedPath[selectedPath.length - 1].isLeaf && (
                    <div className="flex items-center gap-2 ml-4">
                      {fetchingAttributes ? (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          获取属性中...
                        </span>
                      ) : fetchedAttributeCount > 0 ? (
                        <span className="text-xs text-amber-600">
                          {fetchedAttributeCount} 个必填属性
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">无必填属性</span>
                      )}
                      <Button
                        size="sm"
                        onClick={onAddFromBrowse}
                        disabled={!pendingName.trim() || templates.some(c => c.catId === selectedPath[selectedPath.length - 1].catId) || fetchingAttributes}
                      >
                        {templates.some(c => c.catId === selectedPath[selectedPath.length - 1].catId) ? (
                          '已添加'
                        ) : fetchedAttributeCount > 0 ? (
                          '填写属性'
                        ) : (
                          '添加'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 搜索模式：扁平列表 */}
              {isSearchMode ? (
                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col min-h-0">
                  <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                    搜索结果 ({searchResults.length})
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 py-12">
                        <Search className="w-8 h-8 mr-3 text-gray-300" />
                        <span>未找到匹配的分类，请尝试其他关键词</span>
                      </div>
                    ) : (
                      searchResults.map((path, index) => {
                        const fullPath = getPathFromSearchResult(path);
                        const leafCategory = fullPath[fullPath.length - 1];
                        const isSelected = selectedPath.length > 0 &&
                          selectedPath[selectedPath.length - 1]?.catId === leafCategory?.catId;
                        const isAdded = leafCategory && templates.some(c => c.catId === leafCategory.catId);

                        return (
                          <div
                            key={index}
                            onClick={() => onSelectSearchResult(path)}
                            className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 ${
                              isSelected ? 'bg-primary/10' : ''
                            } ${isAdded ? 'bg-green-50' : ''}`}
                          >
                            <div className="flex items-center flex-wrap gap-1 flex-1 min-w-0">
                              {fullPath.map((cat, catIndex) => (
                                <div key={cat.catId} className="flex items-center">
                                  <span className={`text-sm ${catIndex === fullPath.length - 1 ? 'font-medium text-primary' : 'text-gray-600'}`}>
                                    {cat.catName}
                                  </span>
                                  {catIndex < fullPath.length - 1 && (
                                    <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                                  )}
                                </div>
                              ))}
                            </div>
                            {isAdded && (
                              <Badge variant="outline" className="text-xs text-green-600 px-1 ml-2 shrink-0">已添加</Badge>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* 浏览模式：多列分类浏览器 */
                <div className="flex-1 border rounded-lg overflow-x-auto overflow-y-hidden flex flex-col min-h-0">
                  <div className="flex-1 flex min-h-0 min-w-max">
                    {browseColumns.length === 0 && loadingColumn === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">加载分类中...</span>
                      </div>
                    ) : browseColumns.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Button variant="outline" onClick={() => onLoadCategories(undefined, 0)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          加载分类
                        </Button>
                      </div>
                    ) : (
                      browseColumns.map((column, colIndex) => (
                        <div
                          key={colIndex}
                          className="w-48 flex-shrink-0 border-r last:border-r-0 flex flex-col min-h-0"
                        >
                          <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                            {colIndex === 0 ? '一级分类' : `${colIndex + 1}级分类`}
                          </div>
                          <div className="flex-1 overflow-y-auto">
                            {loadingColumn === colIndex ? (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                加载中...
                              </div>
                            ) : (
                              column.map((cat) => {
                                const isSelected = selectedPath[colIndex]?.catId === cat.catId;
                                const isAdded = templates.some(c => c.catId === cat.catId);

                                return (
                                  <div
                                    key={cat.catId}
                                    onClick={() => onSelectCategory(cat, colIndex)}
                                    className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm hover:bg-gray-50 border-b border-gray-100 ${
                                      isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                                    } ${isAdded ? 'bg-green-50' : ''}`}
                                  >
                                    <span className="truncate flex-1">{cat.catName}</span>
                                    <div className="flex items-center gap-1 ml-1">
                                      {isAdded && (
                                        <Badge variant="outline" className="text-xs text-green-600 px-1">已添加</Badge>
                                      )}
                                      {!cat.isLeaf && (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
            </DialogFooter>
          </>
        )}

        {/* 步骤2：填写属性 */}
        {addStep === 'attributes' && pendingCategory && (
          <>
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* 分类路径 */}
              <div className="flex items-center gap-1 mb-4 text-sm text-gray-500">
                {selectedPath.map((cat, index) => (
                  <div key={cat.catId} className="flex items-center">
                    <span className={index === selectedPath.length - 1 ? 'text-gray-900 font-medium' : ''}>
                      {cat.catName}
                    </span>
                    {index < selectedPath.length - 1 && (
                      <ChevronRight className="w-4 h-4 mx-0.5" />
                    )}
                  </div>
                ))}
              </div>

              {/* 表单内容 */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Temu 属性 */}
                {attributeFormValues.map((item, index) => (
                  <div key={item.property.templatePid} className="flex items-start gap-3">
                    <Label className="text-sm w-20 shrink-0 pt-2">{item.property.name}</Label>
                    <div className="flex-1">
                      {item.property.values && item.property.values.length > 0 ? (
                        isMultiSelect(item.property) ? (
                          <div className="grid grid-cols-6 gap-x-2 gap-y-1">
                            {item.property.values.map((val) => {
                              const isChecked = item.selectedValues?.some(v => v.vid === val.vid) ?? false;
                              const isDisabled = !isChecked &&
                                (item.selectedValues?.length ?? 0) >= (item.property.chooseMaxNum ?? 1);
                              return (
                                <div key={val.vid} className="flex items-center space-x-1">
                                  <Checkbox
                                    id={`attr-${item.property.templatePid}-${val.vid}`}
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onCheckedChange={(checked) => {
                                      const currentValues = item.selectedValues || [];
                                      if (checked) {
                                        updateAttributeValue(index, {
                                          selectedValues: [...currentValues, val],
                                          selectedValue: undefined,
                                          customValue: undefined
                                        });
                                      } else {
                                        updateAttributeValue(index, {
                                          selectedValues: currentValues.filter(v => v.vid !== val.vid),
                                          selectedValue: undefined,
                                          customValue: undefined
                                        });
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`attr-${item.property.templatePid}-${val.vid}`}
                                    className={`text-sm cursor-pointer truncate ${isDisabled ? 'text-gray-400' : ''}`}
                                  >
                                    {val.value}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <Select
                            value={item.selectedValue?.vid?.toString() || ''}
                            onValueChange={(vid) => {
                              const selectedVal = item.property.values?.find(v => v.vid.toString() === vid);
                              updateAttributeValue(index, {
                                selectedValue: selectedVal,
                                selectedValues: undefined,
                                customValue: undefined
                              });
                            }}
                          >
                            <SelectTrigger className="max-w-48">
                              <SelectValue placeholder="请选择" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.property.values.map((val) => (
                                <SelectItem key={val.vid} value={val.vid.toString()}>
                                  {val.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      ) : (
                        <Input
                          placeholder="请输入"
                          value={item.customValue || ''}
                          onChange={(e) => updateAttributeValue(index, { customValue: e.target.value })}
                          className="max-w-48"
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* 规格配置 */}
                {inputMaxSpecNum > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label className="text-sm font-medium">商品规格配置</Label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          最多可添加 {inputMaxSpecNum} 个规格，每个规格最多 {singleSpecValueNum} 个值
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddSpec}
                        disabled={specFormValues.length >= inputMaxSpecNum || fetchingParentSpecs}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加规格
                      </Button>
                    </div>

                    {fetchingParentSpecs ? (
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        加载规格选项中...
                      </div>
                    ) : specFormValues.length === 0 ? (
                      <div className="text-sm text-gray-400 py-4 text-center border border-dashed rounded-lg">
                        暂未配置规格，点击"添加规格"开始配置
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {specFormValues.map((spec, specIndex) => (
                          <div key={specIndex} className="border rounded-lg overflow-hidden">
                            {/* 规格类型选择 */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">规格{specIndex + 1}</span>
                                <Select
                                  value={spec.parentSpecId > 0 ? spec.parentSpecId.toString() : ''}
                                  onValueChange={(val) => onUpdateSpecParent(specIndex, parseInt(val))}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue placeholder="选择规格" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parentSpecs
                                      .filter(p => !specFormValues.some((s, i) => i !== specIndex && s.parentSpecId === p.parentSpecId))
                                      .map((p) => (
                                        <SelectItem key={p.parentSpecId} value={p.parentSpecId.toString()}>
                                          {p.parentSpecName}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveSpec(specIndex)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                删除
                              </Button>
                            </div>

                            {/* 规格值表格 */}
                            {spec.parentSpecId > 0 && (
                              <div>
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b bg-gray-50/50">
                                      <th className="text-left text-xs font-medium text-gray-600 px-3 py-2">
                                        <span className="text-red-500">*</span>{spec.parentSpecName}
                                      </th>
                                      <th className="text-right text-xs font-medium text-gray-600 px-3 py-2 w-20">操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {spec.specValues.map((specValue, valueIndex) => (
                                      <tr key={valueIndex} className="border-b last:border-b-0">
                                        <td className="px-3 py-2">
                                          <Input
                                            placeholder={`输入${spec.parentSpecName}值`}
                                            value={specValue.specName}
                                            onChange={(e) => onUpdateSpecValue(specIndex, valueIndex, e.target.value)}
                                            className="h-8"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            onClick={() => onRemoveSpecValue(specIndex, valueIndex)}
                                            className="text-red-500 hover:text-red-600 h-8 px-2"
                                          >
                                            删除
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="px-3 py-2 border-t">
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={() => onAddSpecValue(specIndex)}
                                    disabled={spec.specValues.length >= singleSpecValueNum}
                                    className="text-blue-600 hover:text-blue-700 h-8 px-0"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    添加
                                  </Button>
                                  {spec.specValues.length >= singleSpecValueNum && (
                                    <span className="text-xs text-gray-400 ml-2">
                                      （已达上限 {singleSpecValueNum} 个）
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SKU 默认配置 */}
                <SkuConfigTable
                  specFormValues={specFormValues}
                  skuDefaultConfig={skuDefaultConfig}
                  volumeWeightConfigs={volumeWeightConfigs}
                  onSkuDefaultConfigChange={setSkuDefaultConfig}
                  onVolumeWeightConfigChange={onVolumeWeightConfigChange}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onBackToSelect}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
              <Button
                onClick={onSubmit}
                disabled={submitting || (attributeFormValues.length > 0 && !attributeFormValues.every(item => {
                  if (isMultiSelect(item.property)) {
                    return (item.selectedValues?.length ?? 0) > 0;
                  }
                  return item.selectedValue || item.customValue;
                }))}
              >
                {submitting ? '添加中...' : '确认添加'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
