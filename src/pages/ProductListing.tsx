import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Search, Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { productService, type Product } from '@/services/productService';
import { TEMU_SHOPS } from '@/types/shop';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function ProductListing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // 选择状态
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  // 获取商品列表
  const fetchProducts = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const response = await productService.getProducts({
        page,
        limit: pageSize,
        keyword: searchTerm || undefined
      });
      setProducts(response.data);
      setTotal(response.total);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('获取商品列表失败:', error);
      toast.error(error.response?.data?.message || '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchProducts(1);
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchProducts(1);
      } else {
        setCurrentPage(1);
        fetchProducts(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      default:
        return '处理中';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  // 切换商品选择
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const productIds = products.map(p => p.id);
    const allSelected = productIds.every(id => selectedProductIds.has(id));

    if (allSelected) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(productIds));
    }
  };

  // 导出功能
  const handleExport = () => {
    if (selectedProductIds.size === 0) {
      toast.error('请至少选择一个商品');
      return;
    }

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

    // 准备导出数据
    const exportData = selectedProducts.map(product => {
      // 查找对应的店铺配置
      const shopConfig = TEMU_SHOPS.find(shop => shop.shopId === product.shopId);

      return {
        '产品标题': product.nameZh || '',
        '英文标题': product.nameEn || '',
        '变种名称': shopConfig?.variantName || '',
        '变种属性名称一': shopConfig?.variantAttributeName1 || '',
        '变种属性值一': shopConfig?.variantAttributeValue1 || '',
        '预览图': product.previewImage || '',
        '申报价格': shopConfig?.declaredPrice || '',
        '长': shopConfig?.length || '',
        '宽': shopConfig?.width || '',
        '高': shopConfig?.height || '',
        '重量': shopConfig?.weight || '',
        '轮播图': '', // 待补充
        '产品素材图': '', // 待补充
        '建议零售价(建议零售价币种)': shopConfig?.suggestedRetailPrice ? `${shopConfig.suggestedRetailPrice} USD` : '',
        '库存': shopConfig?.stock || '',
        '发货时效': shopConfig?.shippingTime || '',
        '分类id': shopConfig?.categoryId || '',
        '产品属性': '', // 待补充
        'SPU属性': '', // 待补充
        'SKC属性': '', // 待补充
        'SKU属性': '', // 待补充
        '产地': '', // 待补充
        'SKU分类': '', // 待补充
        'SKU分类数量': '', // 待补充
        'SKU分类单位': '', // 待补充
        '净含量数值': '', // 待补充
        '总净含量': '', // 待补充
        '总净含量单位': '', // 待补充
        'SKU分类总数量': '', // 待补充
        '包装清单': '', // 待补充
        '运费模板（模板id）': shopConfig?.freightTemplateId || '',
        '经营站点': shopConfig?.operatingSite || '',
        '所属店铺': product.shopName || '',
        'SKUID': product.productId || '',
        '创建时间': new Date(product.createdAt).toLocaleString('zh-CN'),
        '更新时间': product.updatedAt ? new Date(product.updatedAt).toLocaleString('zh-CN') : ''
      };
    });

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品列表');

    // 导出文件
    const fileName = `商品列表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success(`成功导出 ${selectedProductIds.size} 个商品`);
    setSelectedProductIds(new Set());
  };

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">批量上架(文件版)</h1>
          <p className="text-gray-600">商品信息管理</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedProductIds.size > 0 && (
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出选中商品 ({selectedProductIds.size})
            </Button>
          )}
          <Button onClick={() => navigate('/workspace/batch-upload/create')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            批量新建商品
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="搜索商品名称、品牌或分类..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 商品列表 */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={products.length > 0 && products.every(p => selectedProductIds.has(p.id))}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预览图</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品信息</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">店铺</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedProductIds.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {product.previewImage ? (
                          <img
                            src={product.previewImage}
                            alt="预览图"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-gray-400 text-xs">无图片</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {product.nameZh || '未生成标题'}
                          </div>
                          {product.nameEn && (
                            <div className="text-sm text-gray-500 mt-1">
                              {product.nameEn}
                            </div>
                          )}
                          {product.categoryName && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">{product.categoryName}</Badge>
                            </div>
                          )}
                          {product.productId && (
                            <div className="text-xs text-gray-500 mt-1">
                              商品ID: {product.productId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.shopName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(product.status)}
                          <span className={`ml-2 text-sm font-medium ${getStatusColor(product.status)}`}>
                            {getStatusText(product.status)}
                          </span>
                        </div>
                        {product.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">
                            {product.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(product.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            {total > pageSize && (
              <div className="border-t bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    共 {total} 个商品，第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchProducts(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一页
                    </Button>

                    <div className="text-sm text-gray-600">
                      {currentPage} / {Math.ceil(total / pageSize)}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchProducts(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                    >
                      下一页
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无商品</h3>
            <p className="text-gray-500">
              {searchTerm ? '没有找到符合条件的商品' : '还没有创建任何商品，请点击批量新建商品开始'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}