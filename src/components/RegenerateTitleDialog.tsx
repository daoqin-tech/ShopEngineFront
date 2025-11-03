import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JOURNAL_PAPER_SPECS, DECORATIVE_PAPER_SPECS, CALENDAR_SPECS } from '@/types/shop';

interface RegenerateTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (productSpec: string, productUsage: string) => void;
}

export function RegenerateTitleDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: RegenerateTitleDialogProps) {
  // 产品类型：手账纸、装饰纸 或 日历
  const [productType, setProductType] = useState<'journal' | 'decorative' | 'calendar'>('journal');
  const [selectedSpecId, setSelectedSpecId] = useState('');

  // 根据产品类型获取对应的规格
  const currentSpecs = productType === 'journal' ? JOURNAL_PAPER_SPECS :
                       productType === 'decorative' ? DECORATIVE_PAPER_SPECS :
                       CALENDAR_SPECS;

  // 当产品类型改变时，重置规格选择
  const handleProductTypeChange = (value: string) => {
    setProductType(value as 'journal' | 'decorative' | 'calendar');
    setSelectedSpecId('');
  };

  // 确认并生成
  const handleConfirm = () => {
    if (!selectedSpecId) {
      return;
    }

    const selectedSpec = currentSpecs.find(spec => spec.id === selectedSpecId);
    if (!selectedSpec) {
      return;
    }

    // 构建 productSpec 和 productUsage
    const productSpec = selectedSpec.productSpec || `${selectedSpec.size} ${selectedSpec.sheets}张`;
    const productUsage = selectedSpec.productUsage || '';

    onConfirm(productSpec, productUsage);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>重新生成商品标题</DialogTitle>
          <DialogDescription>
            选择商品规格以生成更准确的标题（已选择 {selectedCount} 个商品）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 产品类型选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">产品类型 *</Label>
            <Tabs
              value={productType}
              onValueChange={handleProductTypeChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="journal">手账纸</TabsTrigger>
                <TabsTrigger value="decorative">装饰纸</TabsTrigger>
                <TabsTrigger value="calendar">日历</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 商品规格选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">商品规格 *</Label>
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
              {currentSpecs.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => setSelectedSpecId(spec.id)}
                  className={`
                    relative p-4 rounded-md border-2 text-left transition-colors
                    ${selectedSpecId === spec.id
                      ? 'border-primary bg-primary/5'
                      : 'border-input bg-background hover:bg-accent'
                    }
                  `}
                >
                  <div className="space-y-2">
                    <div className="font-medium text-sm">{spec.name}</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{spec.sheets}张 • {spec.size}</div>
                      <div>¥{spec.declaredPrice} / ${spec.suggestedRetailPrice}</div>
                    </div>
                  </div>
                  {selectedSpecId === spec.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSpecId}
          >
            确认生成 ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
