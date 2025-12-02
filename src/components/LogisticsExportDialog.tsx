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
import { Upload, FileSpreadsheet, Download, X, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { productService, type Product } from '@/services/productService';
import { exportLogisticsInfo } from '@/utils/productExportUtils';
import { toast } from 'sonner';

interface LogisticsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getShopName: (shopId: string) => string;
}

type ExportStage = 'upload' | 'processing' | 'ready';

export function LogisticsExportDialog({
  open,
  onOpenChange,
  getShopName,
}: LogisticsExportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<ExportStage>('upload');
  const [fileName, setFileName] = useState('');
  const [skuCount, setSkuCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);

  // 重置状态
  const resetState = () => {
    setStage('upload');
    setFileName('');
    setSkuCount(0);
    setProducts([]);
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

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置input
    e.target.value = '';
    setFileName(file.name);
    setStage('processing');

    try {
      // 读取xlsx文件
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // 获取第一个sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 转换为JSON数组
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

      setProducts(allProducts);
      setStage('ready');
    } catch (error) {
      console.error('处理文件失败:', error);
      toast.error(error instanceof Error ? error.message : '处理文件失败');
      resetState();
    }
  };

  // 下载物流信息
  const handleDownload = () => {
    try {
      exportLogisticsInfo(products, getShopName);
      toast.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出物流信息</DialogTitle>
          <DialogDescription>
            上传包含SKU列的订单文件，自动匹配产品并导出物流信息
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
              <p className="text-sm text-gray-600 mb-1">正在处理文件...</p>
              <p className="text-xs text-gray-400">{fileName}</p>
            </div>
          )}

          {/* 完成阶段 */}
          {stage === 'ready' && (
            <div className="space-y-4">
              {/* 文件信息 */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileSpreadsheet className="w-8 h-8 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                  <p className="text-xs text-gray-500">
                    解析到 {skuCount} 个SKU，匹配到 {products.length} 个产品
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={resetState}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* 下载按钮 */}
              <Button
                className="w-full"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                下载物流信息表格
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleClose}>
            关闭
          </Button>
          {stage === 'ready' && (
            <Button variant="outline" onClick={resetState}>
              重新上传
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
  );
}
