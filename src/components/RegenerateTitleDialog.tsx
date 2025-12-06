import { useState, useEffect, useMemo } from 'react';
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
import { productCategoryService } from '@/services/productCategoryService';
import type { ProductCategoryWithChildren } from '@/types/productCategory';

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
  // 数据库分类数据
  const [parentCategories, setParentCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // 加载分类数据
  useEffect(() => {
    if (open) {
      const loadCategories = async () => {
        try {
          setLoadingCategories(true);
          const data = await productCategoryService.getCategoryTree();
          setParentCategories(data);
        } catch (error) {
          console.error('Failed to load categories:', error);
        } finally {
          setLoadingCategories(false);
        }
      };
      loadCategories();
    }
  }, [open]);

  // 获取当前选中父分类的子分类
  const currentChildCategories = useMemo(() => {
    const parent = parentCategories.find(p => p.id === selectedParentId);
    return parent?.children || [];
  }, [parentCategories, selectedParentId]);

  // 当产品类型改变时，重置规格选择
  const handleParentChange = (parentId: string) => {
    setSelectedParentId(parentId);
    setSelectedSpecId('');
  };

  // 确认并生成
  const handleConfirm = () => {
    if (!selectedSpecId) {
      return;
    }

    const selectedChild = currentChildCategories.find(c => c.id === selectedSpecId);
    if (!selectedChild) {
      return;
    }

    // 构建 productSpec 和 productUsage
    const productSpec = selectedChild.productSpec || selectedChild.name;
    const productUsage = selectedChild.productUsage || '';

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
          {/* 产品类型选择 - 从数据库读取父分类 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">产品类型 *</Label>
            {loadingCategories ? (
              <div className="text-sm text-muted-foreground">加载中...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {parentCategories.map((parent) => (
                  <button
                    key={parent.id}
                    type="button"
                    onClick={() => handleParentChange(parent.id)}
                    className={`
                      px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${selectedParentId === parent.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    {parent.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 商品规格选择 - 从数据库读取子分类 */}
          {selectedParentId && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">商品规格 *</Label>
              {currentChildCategories.length === 0 ? (
                <div className="text-sm text-muted-foreground">该分类下暂无规格配置</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
                  {currentChildCategories.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedSpecId(child.id)}
                      className={`
                        relative p-4 rounded-md border-2 text-left transition-colors
                        ${selectedSpecId === child.id
                          ? 'border-primary bg-primary/5'
                          : 'border-input bg-background hover:bg-accent'
                        }
                      `}
                    >
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{child.name}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            {child.productLength && child.productWidth ? (
                              `${child.productLength}×${child.productWidth}${child.productHeight ? `×${child.productHeight}` : ''}cm`
                            ) : (
                              child.productSpec || '未设置尺寸'
                            )}
                            {child.weight && ` • ${child.weight}g`}
                          </div>
                          {(child.declaredPrice || child.suggestedRetailPrice) && (
                            <div>
                              {child.declaredPrice && `¥${child.declaredPrice}`}
                              {child.declaredPrice && child.suggestedRetailPrice && ' / '}
                              {child.suggestedRetailPrice && `$${child.suggestedRetailPrice}`}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedSpecId === child.id && (
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
              )}
            </div>
          )}
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
