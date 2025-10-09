import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { productService, type Product } from '@/services/productService';
import { TEMU_SHOPS } from '@/types/shop';
import { toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';

export function ProductListing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // 选择状态
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<number | ''>(100);

  // 筛选条件
  const [productCodes, setProductCodes] = useState(''); // 货号，逗号分隔
  const [shopId, setShopId] = useState(''); // 店铺ID
  const [startTime, setStartTime] = useState(''); // 开始时间（datetime-local格式）
  const [endTime, setEndTime] = useState(''); // 结束时间（datetime-local格式）

  // 获取商品列表
  const fetchProducts = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;

      // 将 datetime-local 格式转换为秒级时间戳
      const startTimestamp = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : undefined;
      const endTimestamp = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : undefined;

      const response = await productService.getProducts({
        page,
        limit: validPageSize,
        productCodes: productCodes.trim() || undefined,
        shopId: shopId || undefined,
        startTime: startTimestamp,
        endTime: endTimestamp
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

  // 应用筛选
  const handleApplyFilters = () => {
    fetchProducts(1);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setProductCodes('');
    setShopId('');
    setStartTime('');
    setEndTime('');
    setPageSize(100);
  };

  // pageSize 变化时重新查询
  useEffect(() => {
    if (currentPage === 1) {
      fetchProducts(1);
    } else {
      setCurrentPage(1);
      fetchProducts(1);
    }
  }, [pageSize]);

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

  // 根据 shopId 查找店铺名称
  const getShopName = (shopId: string): string => {
    const shop = TEMU_SHOPS.find(s => s.shopId === shopId);
    return shop?.name || '';
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

    // 准备导出数据 - 按照模板格式（59列）
    const exportData = selectedProducts.map(product => {
      // 查找店铺配置
      const shopConfig = TEMU_SHOPS.find(s => s.shopId === product.shopId);

      return {
        '产品标题': product.nameZh || '',
        '英文标题': product.nameEn || '',
        '产品描述': '',
        '产品货号': product.productCode || '',
        '变种名称': product.variantName || '',
        '变种属性名称一': product.variantAttributeName1 || '',
        '变种属性值一': product.variantAttributeValue1 || '',
        '变种属性名称二': '',
        '变种属性值二': '',
        '预览图': product.previewImage || '',
        '申报价格': product.declaredPrice || '',
        'SKU货号': '',
        '长': product.length || '',
        '宽': product.width || '',
        '高': product.height || '',
        '重量': product.weight || '',
        '识别码类型': '',
        '识别码': '',
        '站外产品链接': '',
        '轮播图': product.carouselImages?.join('\r\n') || '',
        '产品素材图': product.materialImage || '',
        '外包装形状': '',
        '外包装类型': '',
        '外包装图片': '',
        '建议零售价(建议零售价币种)': product.suggestedRetailPrice || '',
        '库存': product.stock || '',
        '发货时效': product.shippingTime || '',
        '分类id': product.categoryId || '',
        '产品属性': shopConfig?.productAttributes || '',
        'SPU属性': '',
        'SKC属性': '',
        'SKU属性': '',
        '站点价格': '',
        '来源url': '',
        '产地': product.origin || '',
        '敏感属性': '',
        '备注': '',
        'SKU分类': '',
        'SKU分类数量': '',
        'SKU分类单位': '',
        '独立包装': '',
        '净含量数值': '',
        '净含量单位': '',
        '总净含量': '',
        '总净含量单位': '',
        '混合套装类型': '',
        'SKU分类总数量': '',
        'SKU分类总数量单位': '',
        '包装清单': '',
        '生命周期': '',
        '视频Url': '',
        '运费模板（模板id）': product.freightTemplateId || '',
        '经营站点': product.operatingSite || '',
        '所属店铺': getShopName(product.shopId),
        'SPUID': '',
        'SKCID': '',
        'SKUID': '',
        '创建时间': new Date(product.createdAt).toLocaleString('zh-CN'),
        '更新时间': new Date(product.updatedAt).toLocaleString('zh-CN')
      };
    });

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽 - 按照模板格式59列
    if (!ws['!cols']) ws['!cols'] = [];
    const colWidths = [
      { wch: 35 },  // 1. 产品标题
      { wch: 35 },  // 2. 英文标题
      { wch: 30 },  // 3. 产品描述
      { wch: 15 },  // 4. 产品货号
      { wch: 12 },  // 5. 变种名称
      { wch: 18 },  // 6. 变种属性名称一
      { wch: 12 },  // 7. 变种属性值一
      { wch: 18 },  // 8. 变种属性名称二
      { wch: 12 },  // 9. 变种属性值二
      { wch: 60 },  // 10. 预览图
      { wch: 12 },  // 11. 申报价格
      { wch: 15 },  // 12. SKU货号
      { wch: 8 },   // 13. 长
      { wch: 8 },   // 14. 宽
      { wch: 8 },   // 15. 高
      { wch: 10 },  // 16. 重量
      { wch: 12 },  // 17. 识别码类型
      { wch: 20 },  // 18. 识别码
      { wch: 40 },  // 19. 站外产品链接
      { wch: 70 },  // 20. 轮播图
      { wch: 60 },  // 21. 产品素材图
      { wch: 12 },  // 22. 外包装形状
      { wch: 12 },  // 23. 外包装类型
      { wch: 60 },  // 24. 外包装图片
      { wch: 15 },  // 25. 建议零售价(建议零售价币种)
      { wch: 10 },  // 26. 库存
      { wch: 10 },  // 27. 发货时效
      { wch: 12 },  // 28. 分类id
      { wch: 40 },  // 29. 产品属性
      { wch: 30 },  // 30. SPU属性
      { wch: 40 },  // 31. SKC属性
      { wch: 40 },  // 32. SKU属性
      { wch: 15 },  // 33. 站点价格
      { wch: 40 },  // 34. 来源url
      { wch: 20 },  // 35. 产地
      { wch: 12 },  // 36. 敏感属性
      { wch: 20 },  // 37. 备注
      { wch: 12 },  // 38. SKU分类
      { wch: 12 },  // 39. SKU分类数量
      { wch: 12 },  // 40. SKU分类单位
      { wch: 12 },  // 41. 独立包装
      { wch: 12 },  // 42. 净含量数值
      { wch: 12 },  // 43. 净含量单位
      { wch: 12 },  // 44. 总净含量
      { wch: 12 },  // 45. 总净含量单位
      { wch: 15 },  // 46. 混合套装类型
      { wch: 15 },  // 47. SKU分类总数量
      { wch: 15 },  // 48. SKU分类总数量单位
      { wch: 30 },  // 49. 包装清单
      { wch: 12 },  // 50. 生命周期
      { wch: 60 },  // 51. 视频Url
      { wch: 30 },  // 52. 运费模板（模板id）
      { wch: 12 },  // 53. 经营站点
      { wch: 25 },  // 54. 所属店铺
      { wch: 15 },  // 55. SPUID
      { wch: 15 },  // 56. SKCID
      { wch: 15 },  // 57. SKUID
      { wch: 20 },  // 58. 创建时间
      { wch: 20 }   // 59. 更新时间
    ];
    ws['!cols'] = colWidths;

    // 初始化行高数组
    if (!ws['!rows']) ws['!rows'] = [];

    // 为所有单元格设置样式和行高
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const carouselImageColIndex = 11; // 轮播图列

    for (let row = range.s.r; row <= range.e.r; row++) {
      let maxLines = 1;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress]) {
          const cellValue = ws[cellAddress].v || '';
          const lines = cellValue.toString().split(/\r?\n/).length;
          maxLines = Math.max(maxLines, lines);

          // 表头样式
          if (row === 0) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'center',
                wrapText: true
              },
              font: {
                bold: true,
                sz: 11,
                name: 'Calibri'
              },
              fill: {
                fgColor: { rgb: "F0F0F0" }
              }
            };
          } else {
            // 数据行样式 - 现在使用支持样式的 xlsx-js-style，vertical center 会生效
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: col === carouselImageColIndex || col === 5 || col === 12 ? 'left' : 'center',
                wrapText: true
              },
              font: {
                sz: 10,
                name: 'Calibri'
              }
            };
          }
        }
      }

      // 设置行高 - 根据内容行数计算合适的高度
      if (!ws['!rows'][row]) ws['!rows'][row] = {};
      if (row === 0) {
        ws['!rows'][row].hpt = 30; // 表头固定行高
      } else {
        // 数据行：每行文字约15pt，加上上下边距
        const lineHeight = 15;
        const padding = 10;
        const calculatedHeight = maxLines * lineHeight + padding;
        ws['!rows'][row].hpt = Math.max(25, calculatedHeight); // 最小25pt，自动扩展
      }
    }

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
          <Button
            onClick={() => fetchProducts(currentPage)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0}
          >
            <Download className="w-4 h-4" />
            导出选中商品 {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
          </Button>
          <Button onClick={() => navigate('/workspace/batch-upload/create')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            批量新建商品
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="bg-gray-50 p-4 border rounded-lg mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 货号输入 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">货号:</label>
            <Input
              placeholder="例如：5270A001,5270A002"
              value={productCodes}
              onChange={(e) => setProductCodes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters();
                }
              }}
              className="w-60"
            />
          </div>

          {/* 店铺选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">店铺:</label>
            <select
              className="h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            >
              <option value="">全部店铺</option>
              {TEMU_SHOPS.map(shop => (
                <option key={shop.shopId} value={shop.shopId}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* 开始时间 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">开始时间:</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-48"
            />
          </div>

          {/* 结束时间 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">结束时间:</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-48"
            />
          </div>

          {/* 搜索按钮 */}
          <Button onClick={handleApplyFilters} className="px-6">
            搜索
          </Button>

          {/* 重置按钮 */}
          <Button variant="outline" onClick={handleResetFilters}>
            重置
          </Button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">货号</th>
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
                        {product.productCode || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getShopName(product.shopId)}
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
            {total > 0 && (
              <div className="border-t bg-white p-4">
                <div className="flex items-center gap-4">
                  {/* 统计信息 */}
                  <div className="text-sm text-gray-500">
                    共 {total} 个商品
                  </div>

                  {/* 每页显示 */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">每页</label>
                    <Input
                      type="text"
                      value={pageSize}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (!/^\d*$/.test(input)) return;
                        if (input === '') {
                          setPageSize('' as any);
                          return;
                        }
                        const value = parseInt(input);
                        if (value >= 1 && value <= 200) {
                          setPageSize(value);
                        }
                      }}
                      onBlur={(e) => {
                        const input = e.target.value;
                        const value = parseInt(input);
                        if (!input || !value || value < 1) {
                          setPageSize(100);
                        } else if (value > 200) {
                          setPageSize(200);
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                    />
                    <span className="text-sm text-gray-600">条</span>
                  </div>

                  {/* 分隔线 */}
                  <div className="h-6 w-px bg-gray-300"></div>

                  {/* 上一页按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchProducts(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>

                  {/* 页码按钮 */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;
                      const totalPages = Math.ceil(total / validPageSize);
                      const maxVisiblePages = 7;

                      if (totalPages <= maxVisiblePages) {
                        return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchProducts(page)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ));
                      }

                      const pages: (number | string)[] = [];
                      if (currentPage <= 4) {
                        for (let i = 1; i <= 5; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        pages.push('...');
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      }

                      return pages.map((page, index) =>
                        typeof page === 'number' ? (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchProducts(page)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                        )
                      );
                    })()}
                  </div>

                  {/* 下一页按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchProducts(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(total / (typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100)) || loading}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {/* 分隔线 */}
                  <div className="h-6 w-px bg-gray-300"></div>

                  {/* 跳转输入框 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">跳至</span>
                    <Input
                      type="text"
                      placeholder="页码"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget.value;
                          const value = parseInt(input);
                          const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;
                          const maxPage = Math.ceil(total / validPageSize);

                          if (value >= 1 && value <= maxPage) {
                            fetchProducts(value);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (!/^\d*$/.test(input)) {
                          e.target.value = input.replace(/\D/g, '');
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                    />
                    <span className="text-sm text-gray-600">页</span>
                  </div>

                  {/* 总页数信息 */}
                  <span className="text-sm text-gray-500">
                    共 {Math.ceil(total / (typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100))} 页
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无商品</h3>
            <p className="text-gray-500">
              没有找到符合条件的商品
            </p>
          </div>
        )}
      </div>

    </div>
  );
}