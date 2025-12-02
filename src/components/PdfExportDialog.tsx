import { useState, useRef } from 'react';
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
import { Upload, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { productService, type Product } from '@/services/productService';
import { productCategoryService } from '@/services/productCategoryService';
import { type ProductCategory } from '@/types/productCategory';
import {
  generateSingleProductPdf,
  needsUserReorder,
  downloadZip
} from '@/utils/productExportUtils';
import { toast } from 'sonner';
import { ImageReorderDialog } from '@/components/ImageReorderDialog';

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportStage = 'upload' | 'processing' | 'generating' | 'reorder' | 'completed';

export function PdfExportDialog({
  open,
  onOpenChange,
}: PdfExportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<ExportStage>('upload');
  const [fileName, setFileName] = useState('');
  const [skuCount, setSkuCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // PDF生成进度
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentCategory, setCurrentCategory] = useState<ProductCategory | null>(null);
  const [zipRef, setZipRef] = useState<JSZip | null>(null);

  // 重置状态
  const resetState = () => {
    setStage('upload');
    setFileName('');
    setSkuCount(0);
    setProducts([]);
    setCategories([]);
    setCurrentIndex(0);
    setCurrentProduct(null);
    setCurrentCategory(null);
    setZipRef(null);
  };

  // 关闭对话框
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // 触发文件选择
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 获取产品对应的分类
  const getCategoryForProduct = (product: Product, cats: ProductCategory[]): ProductCategory | null => {
    return cats.find(c => c.id === product.productCategoryId) || null;
  };

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setFileName(file.name);
    setStage('processing');

    try {
      // 读取xlsx文件
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (data.length === 0) {
        toast.error('Excel文件为空');
        resetState();
        return;
      }

      // 查找SKU列
      const firstRow = data[0];
      const skuColumnKey = Object.keys(firstRow).find(
        key => key.toUpperCase() === 'SKU' || key.toUpperCase().includes('SKU')
      );

      if (!skuColumnKey) {
        toast.error('未找到SKU列，请确保Excel中有SKU列');
        resetState();
        return;
      }

      // 提取所有SKU值并去重
      const skuSet = new Set<string>();
      data.forEach(row => {
        const skuValue = row[skuColumnKey];
        if (skuValue) {
          const skus = String(skuValue).split(',').map(s => s.trim()).filter(Boolean);
          skus.forEach(sku => skuSet.add(sku));
        }
      });

      if (skuSet.size === 0) {
        toast.error('未找到有效的SKU值');
        resetState();
        return;
      }

      setSkuCount(skuSet.size);

      // 分批查询产品
      const skuArray = Array.from(skuSet);
      const BATCH_SIZE = 200;
      const allProducts: Product[] = [];

      for (let i = 0; i < skuArray.length; i += BATCH_SIZE) {
        const batchSkus = skuArray.slice(i, i + BATCH_SIZE);
        const productCodes = batchSkus.join(',');
        const response = await productService.getProducts({
          page: 1,
          limit: BATCH_SIZE,
          productCodes: productCodes,
        });
        allProducts.push(...response.data);
      }

      if (allProducts.length === 0) {
        toast.error('未找到匹配的产品');
        resetState();
        return;
      }

      // 加载分类数据
      const categoriesData = await productCategoryService.getAllCategories();
      setCategories(categoriesData);
      setProducts(allProducts);

      // 开始生成PDF
      const zip = new JSZip();
      setZipRef(zip);
      setStage('generating');

      // 开始处理第一个产品
      await processNextProduct(allProducts, 0, zip, categoriesData);
    } catch (error) {
      console.error('处理文件失败:', error);
      toast.error(error instanceof Error ? error.message : '处理文件失败');
      resetState();
    }
  };

  // 处理下一个产品
  const processNextProduct = async (
    productList: Product[],
    index: number,
    zip: JSZip,
    cats: ProductCategory[]
  ) => {
    // 如果所有产品都处理完了，下载ZIP
    if (index >= productList.length) {
      try {
        await downloadZip(zip);
        toast.success(`成功导出 ${productList.length} 个产品的PDF`);
        setStage('completed');
      } catch (error) {
        console.error('下载ZIP失败:', error);
        toast.error('下载失败，请重试');
        resetState();
      }
      return;
    }

    const product = productList[index];
    const category = getCategoryForProduct(product, cats);

    setCurrentIndex(index);
    setCurrentProduct(product);
    setCurrentCategory(category);

    if (!category) {
      console.warn(`产品 ${product.newProductCode || product.id} 找不到分类，跳过`);
      await processNextProduct(productList, index + 1, zip, cats);
      return;
    }

    // 判断是否需要用户排序
    if (needsUserReorder(category)) {
      setStage('reorder');
    } else {
      // 不需要排序：直接生成 PDF
      try {
        const pdfBlob = await generateSingleProductPdf(product, category);
        const pdfFileName = `${product.newProductCode || product.id}.pdf`;
        zip.file(pdfFileName, pdfBlob);
      } catch (error) {
        console.error(`生成PDF失败: ${product.newProductCode || product.id}`, error);
        toast.error(`生成PDF失败: ${product.newProductCode || product.id}`);
      }
      await processNextProduct(productList, index + 1, zip, cats);
    }
  };

  // 日历排序确认后的处理
  const handleConfirmReorder = async (reorderedProducts: Product[]) => {
    if (!zipRef || !currentCategory || reorderedProducts.length === 0) return;

    const product = reorderedProducts[0];
    setStage('generating');

    try {
      const pdfBlob = await generateSingleProductPdf(product, currentCategory);
      const pdfFileName = `${product.newProductCode || product.id}.pdf`;
      zipRef.file(pdfFileName, pdfBlob);
    } catch (error) {
      console.error(`生成日历PDF失败: ${product.newProductCode || product.id}`, error);
      toast.error(`生成日历PDF失败: ${product.newProductCode || product.id}`);
    }

    // 继续处理下一个产品
    await processNextProduct(products, currentIndex + 1, zipRef, categories);
  };

  // 计算进度
  const progress = products.length > 0 ? Math.round(((currentIndex + 1) / products.length) * 100) : 0;

  return (
    <>
      <Dialog open={open && stage !== 'reorder'} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出产品图PDF</DialogTitle>
            <DialogDescription>
              上传包含SKU列的订单文件，自动匹配产品并导出PDF
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* 上传阶段 */}
            {stage === 'upload' && (
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={handleSelectFile}
              >
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">点击上传订单文件</p>
                <p className="text-xs text-gray-400">支持 .xlsx、.xls 格式</p>
              </div>
            )}

            {/* 处理阶段 */}
            {stage === 'processing' && (
              <div className="text-center py-4">
                <Loader2 className="w-10 h-10 mx-auto text-gray-400 mb-3 animate-spin" />
                <p className="text-sm text-gray-600 mb-1">正在解析文件并查询产品...</p>
                <p className="text-xs text-gray-400">{fileName}</p>
              </div>
            )}

            {/* 生成PDF阶段 */}
            {stage === 'generating' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                    <p className="text-xs text-gray-500">
                      解析到 {skuCount} 个SKU，匹配到 {products.length} 个产品
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      正在生成: {currentProduct?.newProductCode || currentProduct?.id || '-'}
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500 text-center">
                    第 {currentIndex + 1} / {products.length} 个产品
                  </p>
                </div>
              </div>
            )}

            {/* 完成阶段 */}
            {stage === 'completed' && (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">导出完成</p>
                <p className="text-xs text-gray-500">
                  成功导出 {products.length} 个产品的PDF
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {stage === 'completed' ? '关闭' : '取消'}
            </Button>
            {stage === 'completed' && (
              <Button variant="outline" onClick={resetState}>
                继续导出
              </Button>
            )}
          </DialogFooter>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </DialogContent>
      </Dialog>

      {/* 图片重排序对话框 */}
      {stage === 'reorder' && currentProduct && (
        <ImageReorderDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              // 用户取消，停止导出
              resetState();
            }
          }}
          products={[currentProduct]}
          onConfirm={handleConfirmReorder}
          isCalendar={true}
          currentIndex={currentIndex}
          totalCount={products.length}
        />
      )}
    </>
  );
}
