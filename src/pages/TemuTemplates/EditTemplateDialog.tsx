import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import type { TemuTemplate, TemuSpecification, TemuSkuDefaultConfig, TemuSpecVolumeWeightConfig } from '@/services/temuTemplateService';
import type { ParentSpecification } from '@/services/temuShopCategoryService';
import { AttributeFormValue, isMultiSelect } from './types';
import { SkuConfigTable } from './SkuConfigTable';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: TemuTemplate | null;
  loadingEditData: boolean;
  // Label
  editLabel: string;
  setEditLabel: (label: string) => void;
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
  // SKU config state
  editSkuDefaultConfig: TemuSkuDefaultConfig;
  setEditSkuDefaultConfig: (config: TemuSkuDefaultConfig) => void;
  editVolumeWeightConfigs: TemuSpecVolumeWeightConfig[];
  onEditVolumeWeightConfigChange: (index: number, data: Partial<TemuSpecVolumeWeightConfig>) => void;
  // Actions
  onSave: () => void;
  onClose: () => void;
  submitting: boolean;
}

export function EditTemplateDialog({
  open,
  onOpenChange,
  editingTemplate,
  loadingEditData,
  editLabel,
  setEditLabel,
  editAttributeFormValues,
  updateEditAttributeValue,
  editInputMaxSpecNum,
  editSingleSpecValueNum,
  editParentSpecs,
  editSpecFormValues,
  onEditAddSpec,
  onEditRemoveSpec,
  onEditUpdateSpecParent,
  onEditUpdateSpecValues,
  editSkuDefaultConfig,
  setEditSkuDefaultConfig,
  editVolumeWeightConfigs,
  onEditVolumeWeightConfigChange,
  onSave,
  onClose,
  submitting,
}: EditTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
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
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* 标签 */}
            <div className="flex items-center gap-3">
              <Label className="text-sm w-20 shrink-0">标签</Label>
              <Input
                placeholder="如：日历"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="max-w-48"
              />
            </div>

            {/* 产品属性 */}
            {editAttributeFormValues.map((item, index) => (
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
                          const selectedVal = item.property.values?.find(v => v.vid.toString() === vid);
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
                      onChange={(e) => updateEditAttributeValue(index, { customValue: e.target.value })}
                      className="max-w-48"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* 规格配置 */}
            {editInputMaxSpecNum > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-medium">商品规格配置</Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      最多可添加 {editInputMaxSpecNum} 个规格，每个规格最多 {editSingleSpecValueNum} 个值
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onEditAddSpec}
                    disabled={editSpecFormValues.length >= editInputMaxSpecNum}
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
                  <div className="space-y-3">
                    {editSpecFormValues.map((spec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm w-16 shrink-0">规格{index + 1}</Label>
                            <Select
                              value={spec.parentSpecId > 0 ? spec.parentSpecId.toString() : ''}
                              onValueChange={(val) => onEditUpdateSpecParent(index, parseInt(val))}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="选择规格类型" />
                              </SelectTrigger>
                              <SelectContent>
                                {editParentSpecs
                                  .filter(p => !editSpecFormValues.some((s, i) => i !== index && s.parentSpecId === p.parentSpecId))
                                  .map((p) => (
                                    <SelectItem key={p.parentSpecId} value={p.parentSpecId.toString()}>
                                      {p.parentSpecName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm w-16 shrink-0">规格值</Label>
                            <Input
                              placeholder="多个值用逗号分隔，如：红色,蓝色,绿色"
                              value={spec.specValues.map(v => v.specName).join(',')}
                              onChange={(e) => onEditUpdateSpecValues(index, e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          {spec.specValues.length > editSingleSpecValueNum && (
                            <p className="text-xs text-red-500">
                              规格值数量超过限制（最多 {editSingleSpecValueNum} 个）
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditRemoveSpec(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
