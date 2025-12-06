import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GripVertical, Loader2 } from 'lucide-react';
import { Product, productService } from '@/services/productService';
import { toast } from 'sonner';

interface ImageReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];  // 当前要排序的产品（简化后只传一个产品）
  onConfirm: (reorderedProducts: Product[]) => void;
  isCalendar?: boolean; // 是否为日历模式
  // 进度显示
  currentIndex?: number; // 当前处理到第几个产品（0-based）
  totalCount?: number;   // 总产品数量
}

// 月份对照表
const MONTHS = [
  { number: 1, chinese: '1月', english: 'January' },
  { number: 2, chinese: '2月', english: 'February' },
  { number: 3, chinese: '3月', english: 'March' },
  { number: 4, chinese: '4月', english: 'April' },
  { number: 5, chinese: '5月', english: 'May' },
  { number: 6, chinese: '6月', english: 'June' },
  { number: 7, chinese: '7月', english: 'July' },
  { number: 8, chinese: '8月', english: 'August' },
  { number: 9, chinese: '9月', english: 'September' },
  { number: 10, chinese: '10月', english: 'October' },
  { number: 11, chinese: '11月', english: 'November' },
  { number: 12, chinese: '12月', english: 'December' },
];

export function ImageReorderDialog({
  open,
  onOpenChange,
  products,
  onConfirm,
  isCalendar = false,
  currentIndex = 0,
  totalCount = 1,
}: ImageReorderDialogProps) {
  const [reorderedProducts, setReorderedProducts] = useState<Product[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 初始化重排序的产品列表
  useEffect(() => {
    if (open) {
      setReorderedProducts(
        products.map(p => ({
          ...p,
          productImages: [...(p.productImages || [])]
        }))
      );
    }
  }, [open, products]);

  // 简化后只处理一个产品
  const currentProduct = reorderedProducts[0];
  const productImages = currentProduct?.productImages || [];

  // 进度计算
  const progress = totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0;

  // 处理拖拽开始
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 处理拖拽放置
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 处理图片位置交换
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newProducts = [...reorderedProducts];
    const newImages = [...productImages];

    // 交换位置
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);

    newProducts[0].productImages = newImages;
    setReorderedProducts(newProducts);
    setDraggedIndex(null);
  };

  // 确认并保存排序到后端
  const handleConfirm = async () => {
    if (!currentProduct?.taskId) {
      // 没有 taskId 时直接确认，不保存到后端
      onConfirm(reorderedProducts);
      return;
    }

    setIsSaving(true);
    try {
      // 保存排序到后端
      await productService.saveImageSortOrder(currentProduct.taskId, productImages);
      toast.success('图片排序已保存');
      onConfirm(reorderedProducts);
    } catch (error) {
      console.error('保存排序失败:', error);
      toast.error(error instanceof Error ? error.message : '保存排序失败');
      // 即使保存失败也继续导出，使用当前排序
      onConfirm(reorderedProducts);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] sm:max-w-[85vw] max-w-[1400px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          {/* 进度显示区域 */}
          {totalCount > 1 && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  导出进度：第 {currentIndex + 1} / {totalCount} 个产品
                </span>
                <span className="text-sm font-semibold text-blue-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentProduct && (
                <div className="mt-2 text-xs text-gray-600">
                  当前产品：{currentProduct.newProductCode || currentProduct.id}
                </div>
              )}
            </div>
          )}

          <div>
            <DialogTitle>
              调整日历图片顺序
            </DialogTitle>
            <DialogDescription>
              拖拽图片调整日历页面的顺序，排序将自动保存
            </DialogDescription>
          </div>

          {/* 日历模式：月份说明 */}
          {isCalendar && (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-center text-gray-700">
              {MONTHS.map((month, index) => (
                <span key={month.number}>
                  <span className="font-medium text-gray-900">{month.chinese}</span>
                  <span className="text-gray-500">={month.english}</span>
                  {index < MONTHS.length - 1 && <span className="mx-1.5 text-gray-300">|</span>}
                </span>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* 主体内容区域 */}
        <div className="flex-1 overflow-auto py-4">
          {/* 图片列表 */}
          <div className="grid grid-cols-4 gap-4">
              {productImages.map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`
                    relative group cursor-move border-2 rounded-lg overflow-hidden
                    ${draggedIndex === index ? 'opacity-50 border-blue-500' : 'border-gray-200'}
                    hover:border-blue-400 transition-all
                  `}
                >
                  {/* 拖拽句柄 */}
                  <div className="absolute top-2 right-2 z-10 bg-white/90 rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-gray-600" />
                  </div>

                  {/* 序号标记 */}
                  <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                    {index + 1}
                  </div>

                  {/* 图片 */}
                  <img
                    src={imageUrl}
                    alt={`图片 ${index + 1}`}
                    className="w-full h-48 object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

          {productImages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              当前产品没有图片
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-600">
              共 {productImages.length} 张图片
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                取消导出
              </Button>
              <Button onClick={handleConfirm} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  totalCount > 1 && currentIndex < totalCount - 1
                    ? '确认并继续下一个'
                    : '确认并完成导出'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
