import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, Pencil, Search, ChevronRight, X, Check, FolderTree } from 'lucide-react';
import type { TemuTemplate, TemuSpecification, TemuSkuDefaultConfig, TemuSpecVolumeWeightConfig } from '@/services/temuTemplateService';
import type { ParentSpecification, TemuCategoryPath, TemuAPICategory } from '@/services/temuShopCategoryService';
import type { ProductCategoryWithChildren } from '@/types/productCategory';
import { TemuSite, AttributeFormValue, isMultiSelect, shouldShowAttribute, getValidValues } from './types';
import { SkuConfigTable } from './SkuConfigTable';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: TemuTemplate | null;
  loadingEditData: boolean;
  // Name
  editName: string;
  setEditName: (name: string) => void;
  // Attribute state
  editAttributeFormValues: AttributeFormValue[];
  updateEditAttributeValue: (index: number, value: Partial<AttributeFormValue>) => void;
  // Spec state
  editInputMaxSpecNum: number;
  editSingleSpecValueNum: number;
  editParentSpecs: ParentSpecification[];
  editSpecFormValues: TemuSpecification[];
  onEditAddSpec: () => void;
  onEditRemoveSpec: (index: number) => void;
  onEditUpdateSpecParent: (index: number, parentSpecId: number) => void;
  onEditUpdateSpecValues: (index: number, valuesStr: string) => void;
  onEditAddSpecValue: (specIndex: number) => void;
  onEditRemoveSpecValue: (specIndex: number, valueIndex: number) => void;
  onEditUpdateSpecValue: (specIndex: number, valueIndex: number, value: string) => void;
  // SKU config state
  editSkuDefaultConfig: TemuSkuDefaultConfig;
  setEditSkuDefaultConfig: (config: TemuSkuDefaultConfig) => void;
  editVolumeWeightConfigs: TemuSpecVolumeWeightConfig[];
  onEditVolumeWeightConfigChange: (index: number, data: Partial<TemuSpecVolumeWeightConfig>) => void;
  // Actions
  onSave: () => void;
  onClose: () => void;
  submitting: boolean;
  // Product category selection (dropdown)
  productCategories: ProductCategoryWithChildren[];
  editSelectedParentCategoryId: string;
  setEditSelectedParentCategoryId: (id: string) => void;
  editSelectedChildCategoryId: string;
  setEditSelectedChildCategoryId: (id: string) => void;
  editCurrentChildCategories: ProductCategoryWithChildren[];
  // Category change state
  editIsChangingCategory: boolean;
  temuSites: TemuSite[];
  selectedSiteId: number | undefined;
  setSelectedSiteId: (id: number | undefined) => void;
  editTemuSearchKeyword: string;
  setEditTemuSearchKeyword: (keyword: string) => void;
  editSearchResults: TemuCategoryPath[];
  editSearching: boolean;
  editIsSearchMode: boolean;
  onEditSearch: () => void;
  onEditClearSearch: () => void;
  editBrowseColumns: TemuAPICategory[][];
  editSelectedPath: TemuAPICategory[];
  editLoadingColumn: number | null;
  onEditSelectCategory: (cat: TemuAPICategory, colIndex: number) => void;
  onEditLoadCategories: (parentCatId: number | undefined, level: number) => void;
  editPendingCategory: TemuAPICategory | null;
  editFetchingAttributes: boolean;
  onEditSelectSearchResult: (path: TemuCategoryPath) => void;
  onEditConfirmCategory: () => void;
  onEditStartChangeCategory: () => void;
  onEditCancelChangeCategory: () => void;
  getPathFromSearchResult: (path: TemuCategoryPath) => TemuAPICategory[];
  templates: TemuTemplate[];
}

export function EditTemplateDialog({
  open,
  onOpenChange,
  editingTemplate,
  loadingEditData,
  editName,
  setEditName,
  editAttributeFormValues,
  updateEditAttributeValue,
  editInputMaxSpecNum,
  editSingleSpecValueNum,
  editParentSpecs,
  editSpecFormValues,
  onEditAddSpec,
  onEditRemoveSpec,
  onEditUpdateSpecParent,
  onEditUpdateSpecValues: _onEditUpdateSpecValues,
  onEditAddSpecValue,
  onEditRemoveSpecValue,
  onEditUpdateSpecValue,
  editSkuDefaultConfig,
  setEditSkuDefaultConfig,
  editVolumeWeightConfigs,
  onEditVolumeWeightConfigChange,
  onSave,
  onClose,
  submitting,
  // Product category props (dropdown)
  productCategories,
  editSelectedParentCategoryId,
  setEditSelectedParentCategoryId,
  editSelectedChildCategoryId,
  setEditSelectedChildCategoryId,
  editCurrentChildCategories,
  // Category change props
  editIsChangingCategory,
  temuSites,
  selectedSiteId,
  setSelectedSiteId,
  editTemuSearchKeyword,
  setEditTemuSearchKeyword,
  editSearchResults,
  editSearching,
  editIsSearchMode,
  onEditSearch,
  onEditClearSearch,
  editBrowseColumns,
  editSelectedPath,
  editLoadingColumn,
  onEditSelectCategory,
  onEditLoadCategories,
  editPendingCategory,
  editFetchingAttributes,
  onEditSelectSearchResult,
  onEditConfirmCategory,
  onEditStartChangeCategory,
  onEditCancelChangeCategory,
  getPathFromSearchResult,
  templates,
}: EditTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[85vh] overflow-hidden flex flex-col ${editIsChangingCategory ? 'sm:max-w-6xl max-w-6xl h-[85vh]' : 'sm:max-w-4xl'}`}>
        <DialogHeader>
          <DialogTitle>编辑模板</DialogTitle>
          <DialogDescription>
            {editingTemplate?.fullPath || editingTemplate?.catName}
          </DialogDescription>
        </DialogHeader>

        {loadingEditData ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">加载中...</span>
          </div>
        ) : editIsChangingCategory ? (
          /* 分类选择模式 */
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* 站点选择和搜索框 */}
            <div className="flex items-center gap-2 mb-4">
              <Select
                value={selectedSiteId?.toString() || 'all'}
                onValueChange={(value) => {
                  const newSiteId = value === 'all' ? undefined : parseInt(value);
                  setSelectedSiteId(newSiteId);
                  onEditLoadCategories(undefined, 0);
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
                  value={editTemuSearchKeyword}
                  onChange={(e) => setEditTemuSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onEditSearch()}
                  className="pl-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button onClick={onEditSearch} disabled={editSearching || !editTemuSearchKeyword.trim()}>
                {editSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
              {editIsSearchMode && (
                <Button variant="outline" size="icon" onClick={onEditClearSearch}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* 当前选中路径 */}
            {editSelectedPath.length > 0 && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">选择的分类：</div>
                  <div className="flex items-center flex-wrap gap-1">
                    {editSelectedPath.map((cat, index) => (
                      <div key={cat.catId} className="flex items-center">
                        <span className={`text-sm ${index === editSelectedPath.length - 1 ? 'font-medium text-primary' : 'text-gray-600'}`}>
                          {cat.catName}
                        </span>
                        {index < editSelectedPath.length - 1 && (
                          <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* 选中叶子分类时显示确认按钮 */}
                {editPendingCategory?.isLeaf && (
                  <div className="flex items-center gap-2 ml-4">
                    {editFetchingAttributes ? (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        获取属性中...
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={onEditConfirmCategory}
                      disabled={editFetchingAttributes}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      确认选择
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 搜索模式：扁平列表 */}
            {editIsSearchMode ? (
              <div className="flex-1 border rounded-lg overflow-hidden flex flex-col min-h-0">
                <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                  搜索结果 ({editSearchResults.length})
                </div>
                <div className="flex-1 overflow-y-auto">
                  {editSearchResults.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 py-12">
                      <Search className="w-8 h-8 mr-3 text-gray-300" />
                      <span>未找到匹配的分类，请尝试其他关键词</span>
                    </div>
                  ) : (
                    editSearchResults.map((path, index) => {
                      const fullPath = getPathFromSearchResult(path);
                      const leafCategory = fullPath[fullPath.length - 1];
                      const isSelected = editSelectedPath.length > 0 &&
                        editSelectedPath[editSelectedPath.length - 1]?.catId === leafCategory?.catId;
                      const isAdded = leafCategory && templates.some(c => c.catId === leafCategory.catId);
                      const isCurrent = leafCategory && editingTemplate?.catId === leafCategory.catId;

                      return (
                        <div
                          key={index}
                          onClick={() => onEditSelectSearchResult(path)}
                          className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 ${
                            isSelected ? 'bg-primary/10' : ''
                          } ${isCurrent ? 'bg-blue-50' : ''}`}
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
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs text-blue-600 px-1 ml-2 shrink-0">当前</Badge>
                          )}
                          {isAdded && !isCurrent && (
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
                  {editBrowseColumns.length === 0 && editLoadingColumn === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-500">加载分类中...</span>
                    </div>
                  ) : editBrowseColumns.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Button variant="outline" onClick={() => onEditLoadCategories(undefined, 0)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        加载分类
                      </Button>
                    </div>
                  ) : (
                    editBrowseColumns.map((column, colIndex) => (
                      <div
                        key={colIndex}
                        className="w-48 flex-shrink-0 border-r last:border-r-0 flex flex-col min-h-0"
                      >
                        <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                          {colIndex === 0 ? '一级分类' : `${colIndex + 1}级分类`}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {editLoadingColumn === colIndex ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              加载中...
                            </div>
                          ) : (
                            column.map((cat) => {
                              const isSelected = editSelectedPath[colIndex]?.catId === cat.catId;
                              const isAdded = templates.some(c => c.catId === cat.catId);
                              const isCurrent = editingTemplate?.catId === cat.catId;

                              return (
                                <div
                                  key={cat.catId}
                                  onClick={() => onEditSelectCategory(cat, colIndex)}
                                  className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm hover:bg-gray-50 border-b border-gray-100 ${
                                    isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                                  } ${isCurrent ? 'bg-blue-50' : ''}`}
                                >
                                  <span className="truncate flex-1">{cat.catName}</span>
                                  <div className="flex items-center gap-1 ml-1">
                                    {isCurrent && (
                                      <Badge variant="outline" className="text-xs text-blue-600 px-1">当前</Badge>
                                    )}
                                    {isAdded && !isCurrent && (
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

            {/* 取消按钮 */}
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={onEditCancelChangeCategory}>
                取消更改分类
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* 当前分类 */}
            <div className="flex items-center gap-3">
              <Label className="text-sm w-20 shrink-0">Temu分类</Label>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  {editingTemplate?.fullPath || editingTemplate?.catName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditStartChangeCategory}
                  className="h-7 px-2"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  更改
                </Button>
              </div>
            </div>

            {/* 模板名称 */}
            <div className="flex items-center gap-3">
              <Label className="text-sm w-20 shrink-0">模板名称</Label>
              <Input
                placeholder="输入模板名称（可选）"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-48"
              />
            </div>

            {/* 产品分类选择器（两个下拉框） */}
            <div className="flex items-center gap-3">
              <Label className="text-sm w-20 shrink-0 flex items-center gap-1">
                <FolderTree className="w-4 h-4" />
                产品分类
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={editSelectedParentCategoryId}
                  onValueChange={(value) => {
                    setEditSelectedParentCategoryId(value);
                    setEditSelectedChildCategoryId('');
                  }}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="一级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={editSelectedChildCategoryId}
                  onValueChange={setEditSelectedChildCategoryId}
                  disabled={!editSelectedParentCategoryId || editCurrentChildCategories.length === 0}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="二级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {editCurrentChildCategories.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 产品属性 - 根据 showCondition 过滤显示 */}
            {editAttributeFormValues.map((item, index) => {
              // 检查属性是否应该根据 showCondition 显示
              if (!shouldShowAttribute(item.property, editAttributeFormValues)) {
                return null;
              }

              // 过滤出满足父子依赖关系的值
              const validValues = getValidValues(item.property, editAttributeFormValues);

              // 如果没有有效值，不显示这个属性
              if (validValues.length === 0) {
                return null;
              }

              return (
                <div key={item.property.templatePid} className="flex items-start gap-3">
                  <Label className="text-sm w-20 shrink-0 pt-2">{item.property.name}</Label>
                  <div className="flex-1">
                    {isMultiSelect(item.property) ? (
                      <div className="grid grid-cols-6 gap-x-2 gap-y-1">
                        {validValues.map((val) => {
                          const isChecked = item.selectedValues?.some(v => v.vid === val.vid) ?? false;
                          const isDisabled = !isChecked &&
                            (item.selectedValues?.length ?? 0) >= (item.property.chooseMaxNum ?? 1);
                          return (
                            <div key={val.vid} className="flex items-center space-x-1">
                              <Checkbox
                                id={`edit-attr-${item.property.templatePid}-${val.vid}`}
                                checked={isChecked}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => {
                                  const currentValues = item.selectedValues || [];
                                  if (checked) {
                                    updateEditAttributeValue(index, {
                                      selectedValues: [...currentValues, val],
                                      selectedValue: undefined,
                                      customValue: undefined
                                    });
                                  } else {
                                    updateEditAttributeValue(index, {
                                      selectedValues: currentValues.filter(v => v.vid !== val.vid),
                                      selectedValue: undefined,
                                      customValue: undefined
                                    });
                                  }
                                }}
                              />
                              <label
                                htmlFor={`edit-attr-${item.property.templatePid}-${val.vid}`}
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
                          const selectedVal = validValues.find(v => v.vid.toString() === vid);
                          updateEditAttributeValue(index, {
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
                          {validValues.map((val) => (
                            <SelectItem key={val.vid} value={val.vid.toString()}>
                              {val.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 规格配置 */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium">商品规格配置</Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    最多可添加 {editInputMaxSpecNum || 3} 个规格，每个规格最多 {editSingleSpecValueNum || 20} 个值
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEditAddSpec}
                  disabled={editSpecFormValues.length >= (editInputMaxSpecNum || 3)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加规格
                </Button>
              </div>

              {editSpecFormValues.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center border border-dashed rounded-lg">
                  暂未配置规格，点击"添加规格"开始配置
                </div>
              ) : (
                  <div className="space-y-4">
                    {editSpecFormValues.map((spec, specIndex) => (
                      <div key={specIndex} className="border rounded-lg overflow-hidden">
                        {/* 规格类型选择 */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">规格{specIndex + 1}</span>
                            <Select
                              value={spec.parentSpecId > 0 ? spec.parentSpecId.toString() : ''}
                              onValueChange={(val) => onEditUpdateSpecParent(specIndex, parseInt(val))}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="选择规格" />
                              </SelectTrigger>
                              <SelectContent>
                                {editParentSpecs
                                  .filter(p => !editSpecFormValues.some((s, i) => i !== specIndex && s.parentSpecId === p.parentSpecId))
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
                            onClick={() => onEditRemoveSpec(specIndex)}
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
                                        onChange={(e) => onEditUpdateSpecValue(specIndex, valueIndex, e.target.value)}
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        onClick={() => onEditRemoveSpecValue(specIndex, valueIndex)}
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
                                onClick={() => onEditAddSpecValue(specIndex)}
                                disabled={spec.specValues.length >= editSingleSpecValueNum}
                                className="text-blue-600 hover:text-blue-700 h-8 px-0"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                添加
                              </Button>
                              {spec.specValues.length >= editSingleSpecValueNum && (
                                <span className="text-xs text-gray-400 ml-2">
                                  （已达上限 {editSingleSpecValueNum} 个）
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

            {/* SKU 默认配置 */}
            <SkuConfigTable
              specFormValues={editSpecFormValues}
              skuDefaultConfig={editSkuDefaultConfig}
              volumeWeightConfigs={editVolumeWeightConfigs}
              onSkuDefaultConfigChange={setEditSkuDefaultConfig}
              onVolumeWeightConfigChange={onEditVolumeWeightConfigChange}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onSave} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
