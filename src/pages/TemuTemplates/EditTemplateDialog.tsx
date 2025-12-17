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
  onEditUpdateSpecValues,
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
