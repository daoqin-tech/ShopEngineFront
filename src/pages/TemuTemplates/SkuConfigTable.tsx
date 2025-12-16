import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TemuSpecification, TemuSkuDefaultConfig, TemuSpecVolumeWeightConfig } from '@/services/temuTemplateService';
import { SENSITIVE_TYPES } from './types';

interface SkuConfigTableProps {
  specFormValues: TemuSpecification[];
  skuDefaultConfig: TemuSkuDefaultConfig;
  volumeWeightConfigs: TemuSpecVolumeWeightConfig[];
  onSkuDefaultConfigChange: (config: TemuSkuDefaultConfig) => void;
  onVolumeWeightConfigChange: (index: number, data: Partial<TemuSpecVolumeWeightConfig>) => void;
}

export function SkuConfigTable({
  specFormValues,
  skuDefaultConfig,
  volumeWeightConfigs,
  onSkuDefaultConfigChange,
  onVolumeWeightConfigChange,
}: SkuConfigTableProps) {
  const validSpecs = specFormValues.filter(s => s.parentSpecId > 0 && s.specValues.length > 0);

  return (
    <div className="mt-6 pt-4 border-t">
      <Label className="text-sm font-medium">SKU 默认配置</Label>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        配置 SKU 的默认值，发布商品时将自动填充
      </p>

      {/* 价格和库存配置 */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm text-gray-600 mb-2 block">供货价（元）</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="供货价"
            value={skuDefaultConfig.defaultSupplierPrice ? skuDefaultConfig.defaultSupplierPrice / 100 : ''}
            onChange={(e) => {
              const val = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined;
              onSkuDefaultConfigChange({
                ...skuDefaultConfig,
                defaultSupplierPrice: val
              });
            }}
            className="w-full"
          />
        </div>
        <div>
          <Label className="text-sm text-gray-600 mb-2 block">默认库存</Label>
          <Input
            type="number"
            placeholder="库存数量"
            value={skuDefaultConfig.defaultStockQuantity || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined;
              onSkuDefaultConfigChange({
                ...skuDefaultConfig,
                defaultStockQuantity: val
              });
            }}
            className="w-full"
          />
        </div>
        <div>
          <Label className="text-sm text-gray-600 mb-2 block">建议零售价（元）</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="建议零售价"
            value={skuDefaultConfig.suggestedPrice ? skuDefaultConfig.suggestedPrice / 100 : ''}
            onChange={(e) => {
              const val = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined;
              onSkuDefaultConfigChange({
                ...skuDefaultConfig,
                suggestedPrice: val
              });
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* 敏感属性和体积重量配置表格 */}
      <div className="mt-4">
        <Label className="text-sm text-gray-600 mb-2 block">敏感属性 & 体积重量配置</Label>
        <p className="text-xs text-gray-500 mb-2">
          根据规格组合配置每个 SKU 的敏感属性、体积和重量
        </p>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {validSpecs.map((spec) => (
                  <TableHead key={spec.parentSpecId} className="text-xs font-medium text-center whitespace-nowrap">
                    {spec.parentSpecName}
                  </TableHead>
                ))}
                {validSpecs.length === 0 && (
                  <TableHead className="text-xs font-medium text-center">规格</TableHead>
                )}
                <TableHead className="text-xs font-medium text-center whitespace-nowrap">敏感属性</TableHead>
                <TableHead className="text-xs font-medium text-center whitespace-nowrap">最长边(cm)</TableHead>
                <TableHead className="text-xs font-medium text-center whitespace-nowrap">次长边(cm)</TableHead>
                <TableHead className="text-xs font-medium text-center whitespace-nowrap">最短边(cm)</TableHead>
                <TableHead className="text-xs font-medium text-center whitespace-nowrap">重量(g)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volumeWeightConfigs.map((config, index) => (
                <TableRow key={index}>
                  {config.specValues.map((specValue, specIndex) => (
                    <TableCell key={specIndex} className="text-xs text-center py-2">
                      {specValue}
                    </TableCell>
                  ))}
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={config.isSensitive}
                          onCheckedChange={(checked) => {
                            onVolumeWeightConfigChange(index, {
                              isSensitive: !!checked,
                              sensitiveList: checked ? config.sensitiveList : []
                            });
                          }}
                        />
                        <span className="text-xs">{config.isSensitive ? '是' : '否'}</span>
                      </div>
                      {config.isSensitive && (
                        <Select
                          value={config.sensitiveList.length > 0 ? config.sensitiveList.join(',') : undefined}
                          onValueChange={(value) => {
                            onVolumeWeightConfigChange(index, {
                              sensitiveList: value ? value.split(',').map(Number) : []
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-24">
                            <SelectValue placeholder="选择类型" />
                          </SelectTrigger>
                          <SelectContent>
                            {SENSITIVE_TYPES.map((type) => (
                              <SelectItem key={type.id} value={String(type.id)}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={config.longestSide ? config.longestSide / 10 : ''}
                      onChange={(e) => {
                        const val = e.target.value ? Math.round(parseFloat(e.target.value) * 10) : 0;
                        onVolumeWeightConfigChange(index, { longestSide: val });
                      }}
                      className="w-16 h-7 text-xs text-center"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={config.middleSide ? config.middleSide / 10 : ''}
                      onChange={(e) => {
                        const val = e.target.value ? Math.round(parseFloat(e.target.value) * 10) : 0;
                        onVolumeWeightConfigChange(index, { middleSide: val });
                      }}
                      className="w-16 h-7 text-xs text-center"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={config.shortestSide ? config.shortestSide / 10 : ''}
                      onChange={(e) => {
                        const val = e.target.value ? Math.round(parseFloat(e.target.value) * 10) : 0;
                        onVolumeWeightConfigChange(index, { shortestSide: val });
                      }}
                      className="w-16 h-7 text-xs text-center"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={config.weight ? config.weight / 1000 : ''}
                      onChange={(e) => {
                        const val = e.target.value ? Math.round(parseFloat(e.target.value) * 1000) : 0;
                        onVolumeWeightConfigChange(index, { weight: val });
                      }}
                      className="w-16 h-7 text-xs text-center"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
