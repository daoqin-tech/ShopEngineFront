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
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Download, Loader2, X, FileText, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { productService, type Product } from '@/services/productService';
import { productCategoryService } from '@/services/productCategoryService';
import { type ProductCategory } from '@/types/productCategory';
import { exportLogisticsInfo } from '@/utils/productExportUtils';
import {
  generateSingleProductPdf,
  needsUserReorder,
  downloadZip
} from '@/utils/productExportUtils';
import { toast } from 'sonner';
import { ImageReorderDialog } from '@/components/ImageReorderDialog';

interface SenfanExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getShopName: (shopId: string) => string;
}

type InputMode = 'file' | 'manual';
type ExportType = 'logistics' | 'pdf';
type ExportStage = 'input' | 'processing' | 'generating' | 'reorder' | 'ready' | 'completed';

export function SenfanExportDialog({
  open,
  onOpenChange,
  getShopName,
}: SenfanExportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 输入模式和导出类型
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [exportType, setExportType] = useState<ExportType>('logistics');

  // 状态
  const [stage, setStage] = useState<ExportStage>('input');
  const [fileName, setFileName] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [skuCount, setSkuCount] = useState(0);
  const [cachedSkus, setCachedSkus] = useState<string[]>([]); // 缓存解析出的SKU
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // PDF生成进度
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentCategory, setCurrentCategory] = useState<ProductCategory | null>(null);
  const [zipRef, setZipRef] = useState<JSZip | null>(null);

  // 重置状态
  const resetState = () => {
    setStage('input');
    setFileName('');
    setManualInput('');
    setSkuCount(0);
    setCachedSkus([]);
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

  // 解析SKU列表
  const parseSkuList = (text: string): string[] => {
    // 支持逗号、换行、空格分隔
    return text
      .split(/[,\n\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setFileName(file.name);

    try {
      // 读取xlsx文件
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (data.length === 0) {
        toast.error('Excel文件为空');
        setFileName('');
        return;
      }

      // 查找SKU列
      const firstRow = data[0];
      const skuColumnKey = Object.keys(firstRow).find(
        key => key.toUpperCase() === 'SKU' || key.toUpperCase().includes('SKU')
      );

      if (!skuColumnKey) {
        toast.error('未找到SKU列，请确保Excel中有SKU列');
        setFileName('');
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
        setFileName('');
        return;
      }

      // 缓存解析出的SKU
      const skuArray = Array.from(skuSet);
      setCachedSkus(skuArray);
      setSkuCount(skuArray.length);
      toast.success(`解析到 ${skuArray.length} 个SKU`);
    } catch (error) {
      console.error('解析文件失败:', error);
      toast.error('解析文件失败');
      setFileName('');
    }
  };

  // 开始导出
  const handleStartExport = async (selectedExportType: ExportType) => {
    let skuArray: string[] = [];

    if (inputMode === 'file') {
      // 使用缓存的SKU数据
      if (cachedSkus.length === 0) {
        toast.error('请先上传订单文件');
        return;
      }
      skuArray = cachedSkus;
    } else {
      // 手动输入模式
      skuArray = parseSkuList(manualInput);
      if (skuArray.length === 0) {
        toast.error('请输入货号');
        return;
      }
    }

    setExportType(selectedExportType);
    setSkuCount(skuArray.length);
    setStage('processing');

    try {
      // 分批查询产品
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

      setProducts(allProducts);

      if (selectedExportType === 'logistics') {
        // 物流信息导出：直接进入ready阶段
        setStage('ready');
      } else {
        // PDF导出：加载分类并开始生成
        const categoriesData = await productCategoryService.getAllCategories();
        setCategories(categoriesData);

        const zip = new JSZip();
        setZipRef(zip);
        setStage('generating');

        // 开始处理第一个产品
        await processNextProduct(allProducts, 0, zip, categoriesData);
      }
    } catch (error) {
      console.error('处理失败:', error);
      toast.error(error instanceof Error ? error.message : '处理失败');
      resetState();
    }
  };

  // 处理下一个产品（PDF导出）
  const processNextProduct = async (
    productList: Product[],
    index: number,
    zip: JSZip,
    cats: ProductCategory[]
  ) => {
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

    // 判断是否需要用户排序：
    // 1. 是日历类型（需要固定顺序）
    // 2. 且图片尚未排序（imageSorted 为 false 或 undefined）
    // 注：暂时注释掉 imageSorted 判断，强制每次都弹出排序对话框
    const needsReorder = needsUserReorder(category); // && !product.imageSorted;

    if (needsReorder) {
      setStage('reorder');
    } else {
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

    await processNextProduct(products, currentIndex + 1, zipRef, categories);
  };

  // 下载物流信息
  const handleDownloadLogistics = () => {
    try {
      exportLogisticsInfo(products, getShopName);
      toast.success('导出成功');
      setStage('completed');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  // 计算进度
  const progress = products.length > 0 ? Math.round(((currentIndex + 1) / products.length) * 100) : 0;

  return (
    <>
      <Dialog open={open && stage !== 'reorder'} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>森梵物流导出</DialogTitle>
            <DialogDescription>
              上传订单文件或手动输入货号，导出物流信息或产品图PDF
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-5">
            {/* 输入阶段 */}
            {stage === 'input' && (
              <>
                {/* 第一步：货号来源选择 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">货号来源</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        inputMode === 'file'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setInputMode('file')}
                    >
                      <Upload className={`w-5 h-5 ${inputMode === 'file' ? 'text-primary' : 'text-gray-400'}`} />
                      <span className={`text-sm ${inputMode === 'file' ? 'text-primary font-medium' : 'text-gray-600'}`}>
                        上传订单文件
                      </span>
                      {inputMode === 'file' && (
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div
                      className={`relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        inputMode === 'manual'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setInputMode('manual')}
                    >
                      <FileText className={`w-5 h-5 ${inputMode === 'manual' ? 'text-primary' : 'text-gray-400'}`} />
                      <span className={`text-sm ${inputMode === 'manual' ? 'text-primary font-medium' : 'text-gray-600'}`}>
                        手动输入货号
                      </span>
                      {inputMode === 'manual' && (
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 第二步：货号输入区域 */}
                <div className="space-y-2">
                  {inputMode === 'file' ? (
                    <>
                      {!fileName ? (
                        <div
                          className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                          onClick={handleSelectFile}
                        >
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 mb-1">点击上传订单文件</p>
                          <p className="text-xs text-gray-400">支持 .xlsx、.xls 格式</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <FileSpreadsheet className="w-8 h-8 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                            <p className="text-xs text-gray-500">解析到 {skuCount} 个SKU</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => {
                              setFileName('');
                              setSkuCount(0);
                              setCachedSkus([]);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Textarea
                        placeholder="请输入货号，支持逗号、换行或空格分隔&#10;例如：&#10;5270A01AB001&#10;5270A01AB002&#10;5270A01AB003"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="min-h-[120px] font-mono text-sm"
                      />
                      {manualInput && (
                        <p className="text-xs text-gray-500">
                          已输入 {parseSkuList(manualInput).length} 个货号
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 第三步：选择导出内容 */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium text-gray-700">选择导出内容</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1.5"
                      onClick={() => handleStartExport('logistics')}
                      disabled={(inputMode === 'file' && !fileName) || (inputMode === 'manual' && !manualInput.trim())}
                    >
                      <Truck className="w-5 h-5" />
                      <span className="text-sm">导出物流信息</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1.5"
                      onClick={() => handleStartExport('pdf')}
                      disabled={(inputMode === 'file' && !fileName) || (inputMode === 'manual' && !manualInput.trim())}
                    >
                      <FileText className="w-5 h-5" />
                      <span className="text-sm">导出产品PDF</span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* 处理阶段 */}
            {stage === 'processing' && (
              <div className="text-center py-4">
                <Loader2 className="w-10 h-10 mx-auto text-gray-400 mb-3 animate-spin" />
                <p className="text-sm text-gray-600 mb-1">正在查询产品...</p>
                <p className="text-xs text-gray-400">共 {skuCount} 个货号</p>
              </div>
            )}

            {/* 物流信息准备下载 */}
            {stage === 'ready' && exportType === 'logistics' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">查询完成</p>
                    <p className="text-xs text-gray-500">
                      共 {skuCount} 个货号，匹配到 {products.length} 个产品
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleDownloadLogistics}>
                  <Download className="w-4 h-4 mr-2" />
                  下载物流信息表格
                </Button>
              </div>
            )}

            {/* PDF生成进度 */}
            {stage === 'generating' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">正在生成PDF</p>
                    <p className="text-xs text-gray-500">
                      共 {skuCount} 个货号，匹配到 {products.length} 个产品
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {currentProduct?.newProductCode || currentProduct?.id || '-'}
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
                  成功导出 {products.length} 个产品
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
