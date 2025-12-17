import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  volumeWeightConfigs,
  onVolumeWeightConfigChange,
}: SkuConfigTableProps) {
  const validSpecs = specFormValues.filter(s => s.parentSpecId > 0 && s.specValues.length > 0);
  const hasSpecs = validSpecs.length > 0 && volumeWeightConfigs.length > 0;

  return (
    <div className="mt-6 pt-4 border-t">
      <Label className="text-sm font-medium">SKU 默认配置</Label>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        配置 SKU 的默认值，发布商品时将自动填充
      </p>

      {!hasSpecs ? (
        <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">
          请先添加商品规格，配置规格值后将自动生成 SKU 配置表格
        </div>
      ) : (
        <>
          {/* SKU 信息表格 */}
          <div className="mb-6">
            <Label className="text-sm text-gray-600 mb-2 block">SKU 信息</Label>
            <p className="text-xs text-gray-500 mb-2">
              根据规格组合配置每个 SKU 的申报价格、SKU分类、建议零售价和SKU货号
            </p>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {validSpecs.map((spec) => (
                      <TableHead key={spec.parentSpecId} className="text-xs font-medium text-center whitespace-nowrap">
                        {spec.parentSpecName}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs font-medium text-center whitespace-nowrap">
                      <span className="text-red-500">*</span>申报价格(元)
                    </TableHead>
                    <TableHead className="text-xs font-medium text-center whitespace-nowrap">库存</TableHead>
                    <TableHead className="text-xs font-medium text-center whitespace-nowrap">SKU分类</TableHead>
                    <TableHead className="text-xs font-medium text-center whitespace-nowrap">建议零售价(美元)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumeWeightConfigs.map((config, index) => (
                <TableRow key={index}>
                  {(config.specValues || []).map((specValue, specIndex) => (
                    <TableCell key={specIndex} className="text-xs text-center py-2">
                      {specValue}
                    </TableCell>
                  ))}
                  {/* 申报价格 CNY（分） */}
                  <TableCell className="py-2 text-center">
                    <Input
                      type="text"
                      placeholder="0"
                      value={config.supplierPrice ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        onVolumeWeightConfigChange(index, { supplierPrice: val });
                      }}
                      className="w-20 h-7 text-xs text-center mx-auto"
                    />
                  </TableCell>
                  {/* 库存 */}
                  <TableCell className="py-2 text-center">
                    <Input
                      type="text"
                      placeholder="0"
                      value={config.stockQuantity || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        onVolumeWeightConfigChange(index, { stockQuantity: val });
                      }}
                      className="w-16 h-7 text-xs text-center mx-auto"
                    />
                  </TableCell>
                  {/* SKU分类 */}
                  <TableCell className="py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Select
                        value={config.skuClassType || 'single'}
                        onValueChange={(value: 'single' | 'sameMultiPack' | 'mixedSet') => {
                          onVolumeWeightConfigChange(index, {
                            skuClassType: value,
                            multiPackQuantity: value === 'single' ? 1 : (config.multiPackQuantity || 2)
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">单品</SelectItem>
                          <SelectItem value="sameMultiPack">同款多件装</SelectItem>
                          <SelectItem value="mixedSet">混合套装</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        placeholder="数量"
                        value={config.multiPackQuantity || 1}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : 1;
                          onVolumeWeightConfigChange(index, { multiPackQuantity: val });
                        }}
                        className="w-12 h-7 text-xs text-center"
                      />
                      <span className="text-xs text-gray-500">件</span>
                    </div>
                  </TableCell>
                  {/* 建议零售价 USD（分） */}
                  <TableCell className="py-2 text-center">
                    <Input
                      type="text"
                      placeholder="0"
                      value={config.suggestedPrice ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        onVolumeWeightConfigChange(index, { suggestedPrice: val });
                      }}
                      className="w-20 h-7 text-xs text-center mx-auto"
                    />
                  </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                      {(config.specValues || []).map((specValue, specIndex) => (
                        <TableCell key={specIndex} className="text-xs text-center py-2">
                          {specValue}
                        </TableCell>
                      ))}
                      <TableCell className="py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Select
                            value={config.isSensitive ? 'yes' : 'no'}
                            onValueChange={(value) => {
                              const isSensitive = value === 'yes';
                              onVolumeWeightConfigChange(index, {
                                isSensitive,
                                sensitiveList: isSensitive ? (config.sensitiveList || []) : []
                              });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs w-14">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">否</SelectItem>
                              <SelectItem value="yes">是</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={config.sensitiveList && config.sensitiveList.length > 0 ? config.sensitiveList.join(',') : undefined}
                            onValueChange={(value) => {
                              onVolumeWeightConfigChange(index, {
                                sensitiveList: value ? value.split(',').map(Number) : []
                              });
                            }}
                            disabled={!config.isSensitive}
                          >
                            <SelectTrigger className={`h-7 text-xs w-24 ${!config.isSensitive ? 'opacity-50' : ''}`}>
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
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Input
                          type="text"
                          placeholder="0"
                          value={config.longestSide || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : 0;
                            onVolumeWeightConfigChange(index, { longestSide: val });
                          }}
                          className="w-16 h-7 text-xs text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Input
                          type="text"
                          placeholder="0"
                          value={config.middleSide || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : 0;
                            onVolumeWeightConfigChange(index, { middleSide: val });
                          }}
                          className="w-16 h-7 text-xs text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Input
                          type="text"
                          placeholder="0"
                          value={config.shortestSide || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : 0;
                            onVolumeWeightConfigChange(index, { shortestSide: val });
                          }}
                          className="w-16 h-7 text-xs text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Input
                          type="text"
                          placeholder="0"
                          value={config.weight || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : 0;
                            onVolumeWeightConfigChange(index, { weight: val });
                          }}
                          className="w-16 h-7 text-xs text-center mx-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
