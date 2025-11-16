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
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Product } from '@/services/productService';

interface ImageReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onConfirm: (reorderedProducts: Product[]) => void;
  isCalendar?: boolean; // 是否为日历模式
  // 多日历切换支持
  currentIndex?: number; // 当前日历索引
  totalCount?: number;   // 总日历数量
  onPrevious?: () => void; // 切换到上一个日历
  onNext?: () => void;     // 切换到下一个日历
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
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
}: ImageReorderDialogProps) {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [reorderedProducts, setReorderedProducts] = useState<Product[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 初始化重排序的产品列表
  useEffect(() => {
    if (open) {
      setReorderedProducts(
        products.map(p => ({
          ...p,
          productImages: [...(p.productImages || [])]
        }))
      );
      setCurrentProductIndex(0);
    }
  }, [open, products]);

  const currentProduct = reorderedProducts[currentProductIndex];
  const productImages = currentProduct?.productImages || [];

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

    newProducts[currentProductIndex].productImages = newImages;
    setReorderedProducts(newProducts);
    setDraggedIndex(null);
  };

  // 切换到上一个产品
  const handlePrevProduct = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(currentProductIndex - 1);
    }
  };

  // 切换到下一个产品
  const handleNextProduct = () => {
    if (currentProductIndex < reorderedProducts.length - 1) {
      setCurrentProductIndex(currentProductIndex + 1);
    }
  };

  // 确认并关闭
  const handleConfirm = () => {
    onConfirm(reorderedProducts);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] sm:max-w-[85vw] max-w-[1400px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            调整图片顺序
            {totalCount && totalCount > 1 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({(currentIndex ?? 0) + 1} / {totalCount})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            拖拽图片调整日历页面的顺序
            {totalCount && totalCount > 1 && (
              <span className="ml-2 text-blue-600">
                · 还有 {totalCount - (currentIndex ?? 0) - 1} 个日历待调整
              </span>
            )}
          </DialogDescription>
          {/* 日历模式：月份说明 */}
          {isCalendar && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-center text-gray-700">
              {MONTHS.map((month, index) => (
                <span key={month.number}>
                  <span className="font-medium text-gray-900">{month.chinese}</span>
                  <span className="text-gray-600">={month.english}</span>
                  {index < MONTHS.length - 1 && <span className="mx-2 text-gray-400">|</span>}
                </span>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* 主体内容区域 - 包含左右按钮和中间内容 */}
        <div className="flex-1 flex items-stretch gap-4 overflow-hidden py-4">
          {/* 左侧按钮区域 */}
          {reorderedProducts.length > 1 ? (
            <div className="flex items-center justify-center w-16 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevProduct}
                disabled={currentProductIndex === 0}
                className="h-12 w-12 p-0 rounded-full shadow-md bg-white hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <div className="w-16 flex-shrink-0" />
          )}

          {/* 中间内容区域 */}
          <div className="flex-1 overflow-auto">
            {/* 产品导航指示器 */}
            {reorderedProducts.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                {reorderedProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentProductIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentProductIndex
                        ? 'bg-blue-600 w-12'
                        : 'bg-gray-300 hover:bg-gray-400 w-2'
                    }`}
                    aria-label={`切换到产品 ${index + 1}`}
                  />
                ))}
              </div>
            )}

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

          {/* 右侧按钮区域 */}
          {reorderedProducts.length > 1 ? (
            <div className="flex items-center justify-center w-16 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextProduct}
                disabled={currentProductIndex === reorderedProducts.length - 1}
                className="h-12 w-12 p-0 rounded-full shadow-md bg-white hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <div className="w-16 flex-shrink-0" />
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-600">
              产品 {currentProductIndex + 1} / {reorderedProducts.length}
            </span>
            <div className="flex gap-2">
              {/* 多日历切换按钮（仅在有多个日历时显示） */}
              {totalCount && totalCount > 1 && onPrevious && (
                <Button
                  variant="outline"
                  onClick={onPrevious}
                  disabled={(currentIndex ?? 0) === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一个日历
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button onClick={handleConfirm}>
                {totalCount && totalCount > 1 && (currentIndex ?? 0) < totalCount - 1
                  ? '导出并继续下一个'
                  : '确认并导出'}
              </Button>
              {/* 仅预览下一个日历（不导出） */}
              {totalCount && totalCount > 1 && onNext && (currentIndex ?? 0) < totalCount - 1 && (
                <Button
                  variant="outline"
                  onClick={onNext}
                >
                  预览下一个
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
