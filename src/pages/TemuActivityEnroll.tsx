import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Search,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { temuActivityService } from '@/services/temuActivityService';
import type {
  ActivityProduct,
  ActivitySession,
  ActivityType,
  EnrollProductSubmit,
} from '@/types/temuActivity';
import { ActivityTypeNames } from '@/types/temuActivity';
import { toast } from 'sonner';

// 格式化价格（分转元）
const formatPrice = (priceInCents?: number): string => {
  if (priceInCents === undefined || priceInCents === null || priceInCents === 0) return '-';
  return `¥${(priceInCents / 100).toFixed(2)}`;
};

// 商品填写状态（价格和库存）
interface ProductFillState {
  activityPrice: number;    // 用户设置的活动价（分）
  activityStock: number;    // 用户设置的库存
}

// 选中商品的状态（场次选择）
interface SelectedProductState {
  productId: number;
  selectedSessionIds: number[];
}

export function TemuActivityEnroll() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 从 URL 参数获取
  const shopId = searchParams.get('shopId') || '';
  const activityType = Number(searchParams.get('activityType')) as ActivityType;
  const activityThematicId = searchParams.get('activityThematicId')
    ? Number(searchParams.get('activityThematicId'))
    : undefined;
  const activityName = searchParams.get('activityName') || ActivityTypeNames[activityType] || '活动报名';

  // 商品列表状态
  const [products, setProducts] = useState<ActivityProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [scrollContext, setScrollContext] = useState('');

  // 筛选状态
  const [idType, setIdType] = useState<'spu' | 'skc' | 'sku'>('spu');
  const [idValue, setIdValue] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');

  // 选中状态（只存储选中的商品ID和场次）
  const [selectedProducts, setSelectedProducts] = useState<Map<number, SelectedProductState>>(new Map());

  // 商品填写状态（存储所有商品的价格和库存）
  const [productFillStates, setProductFillStates] = useState<Map<number, ProductFillState>>(new Map());

  // 批量填写状态
  // 价格模式: suggest=参考申报价, daily_discount=日常价打折, daily_reduce=日常价降价, suggest_discount=参考价打折, suggest_reduce=参考价降价, manual=手动设置
  const [batchPriceMode, setBatchPriceMode] = useState<string>('suggest');
  const [batchPriceValue, setBatchPriceValue] = useState<string>(''); // 打折比例或降价金额（字符串，支持小数输入）
  // 库存模式: suggest=参考库存, manual=手动设置
  const [batchStockMode, setBatchStockMode] = useState<string>('suggest');
  const [batchCustomStock, setBatchCustomStock] = useState<string>('30'); // 字符串，支持输入

  // 场次选择弹窗状态
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogProductId, setSessionDialogProductId] = useState<number | null>(null);
  const [sessionDialogBatchMode, setSessionDialogBatchMode] = useState(false); // 是否批量设置模式
  const [availableSessions, setAvailableSessions] = useState<ActivitySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [tempSelectedSessions, setTempSelectedSessions] = useState<Set<number>>(new Set());
  const [sessionSiteFilter, setSessionSiteFilter] = useState<string>('all'); // 场次站点筛选

  // 提交状态
  const [submitting, setSubmitting] = useState(false);

  // 获取所有站点ID（从商品列表中提取）
  const allSiteIds = useMemo(() => {
    const siteSet = new Set<number>();
    products.forEach(p => p.siteIds?.forEach(s => siteSet.add(s)));
    return Array.from(siteSet).sort((a, b) => a - b);
  }, [products]);

  // 站点ID到名称的映射（从商品数据中构建）
  const siteNames = useMemo(() => {
    const nameMap: Record<number, string> = {};
    products.forEach(p => {
      p.siteIds?.forEach((id, index) => {
        if (p.sites?.[index]) {
          nameMap[id] = p.sites[index];
        }
      });
    });
    return nameMap;
  }, [products]);

  // 加载商品列表
  const fetchProducts = async (reset: boolean = false, filters?: {
    idType?: string;
    idValue?: string;
    siteId?: string;
  }) => {
    if (!shopId || !activityType) {
      toast.error('缺少必要参数');
      return;
    }

    // 使用传入的过滤条件或当前状态
    const currentIdType = filters?.idType ?? idType;
    const currentIdValue = filters?.idValue ?? idValue;
    const currentSiteId = filters?.siteId ?? selectedSiteId;

    try {
      setLoading(true);
      const params: {
        shopId: string;
        activityType: ActivityType;
        activityThematicId?: number;
        rowCount: number;
        searchScrollContext?: string;
        productIds?: number[];
        siteIds?: number[];
      } = {
        shopId,
        activityType,
        rowCount: 50,
      };

      if (activityThematicId) {
        params.activityThematicId = activityThematicId;
      }

      if (!reset && scrollContext) {
        params.searchScrollContext = scrollContext;
      }

      // 处理 ID 查询
      if (currentIdValue.trim()) {
        const ids = currentIdValue.split(/[,，\s]+/).filter(Boolean).map(Number).filter(n => !isNaN(n));
        if (ids.length > 0 && currentIdType === 'spu') {
          params.productIds = ids;
        }
      }

      // 处理站点筛选
      if (currentSiteId !== 'all') {
        params.siteIds = [Number(currentSiteId)];
      }

      console.log('fetchProducts params:', params); // 调试日志

      const response = await temuActivityService.getActivityProducts(params);

      if (reset) {
        setProducts(response.matchList || []);
      } else {
        setProducts(prev => [...prev, ...(response.matchList || [])]);
      }

      setHasMore(response.hasMore);
      setScrollContext(response.searchScrollContext || '');
    } catch (error) {
      console.error('获取商品列表失败:', error);
      toast.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (shopId && activityType) {
      fetchProducts(true);
    }
  }, [shopId, activityType]);

  // 当商品列表变化时，初始化填写状态
  useEffect(() => {
    const newFillStates = new Map(productFillStates);
    products.forEach(product => {
      if (!newFillStates.has(product.productId)) {
        // 使用参考价和参考库存作为默认值
        newFillStates.set(product.productId, {
          activityPrice: product.suggestActivityPrice || 0,
          activityStock: product.suggestActivityStock || 30,
        });
      }
    });
    setProductFillStates(newFillStates);
  }, [products]);

  // 搜索
  const handleSearch = () => {
    setScrollContext('');
    fetchProducts(true, { idType, idValue, siteId: selectedSiteId });
  };

  // 重置筛选
  const handleReset = () => {
    setIdType('spu');
    setIdValue('');
    setSelectedSiteId('all');
    setScrollContext('');
    fetchProducts(true, { idType: 'spu', idValue: '', siteId: 'all' });
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Map<number, SelectedProductState>();
      products.forEach(product => {
        newSelected.set(product.productId, {
          productId: product.productId,
          selectedSessionIds: [],
        });
      });
      setSelectedProducts(newSelected);
    } else {
      setSelectedProducts(new Map());
    }
  };

  // 单选
  const handleSelectProduct = (product: ActivityProduct, checked: boolean) => {
    const newSelected = new Map(selectedProducts);
    if (checked) {
      newSelected.set(product.productId, {
        productId: product.productId,
        selectedSessionIds: [],
      });
    } else {
      newSelected.delete(product.productId);
    }
    setSelectedProducts(newSelected);
  };

  // 更新商品的活动价
  const updateProductPrice = (productId: number, price: number) => {
    const newFillStates = new Map(productFillStates);
    const existing = newFillStates.get(productId) || { activityPrice: 0, activityStock: 30 };
    newFillStates.set(productId, {
      ...existing,
      activityPrice: price,
    });
    setProductFillStates(newFillStates);
  };

  // 更新商品的库存
  const updateProductStock = (productId: number, stock: number) => {
    const newFillStates = new Map(productFillStates);
    const existing = newFillStates.get(productId) || { activityPrice: 0, activityStock: 30 };
    newFillStates.set(productId, {
      ...existing,
      activityStock: stock,
    });
    setProductFillStates(newFillStates);
  };

  // 计算批量填写的价格
  const calculateBatchPrice = (product: ActivityProduct): number => {
    const dailyPrice = product.dailyPrice || 0;
    const suggestPrice = product.suggestActivityPrice || 0;
    const priceValue = parseFloat(batchPriceValue) || 0;

    switch (batchPriceMode) {
      case 'suggest': // 使用参考申报价
        return suggestPrice;
      case 'daily_discount': // 基于日常申报价打折（9.5折 = 95%）
        return Math.round(dailyPrice * priceValue / 10);
      case 'daily_reduce': // 基于日常申报价降价
        return Math.max(0, dailyPrice - priceValue * 100); // priceValue 是元，转为分
      case 'suggest_discount': // 基于参考申报价打折（9.5折 = 95%）
        return Math.round(suggestPrice * priceValue / 10);
      case 'suggest_reduce': // 基于参考申报价降价
        return Math.max(0, suggestPrice - priceValue * 100);
      case 'manual': // 手动设置
        return priceValue * 100; // priceValue 是元，转为分
      default:
        return suggestPrice;
    }
  };

  // 一键填写（填写所有商品的价格和库存）
  const handleBatchFill = () => {
    const newFillStates = new Map(productFillStates);

    products.forEach(product => {
      const calculatedPrice = calculateBatchPrice(product);
      const calculatedStock = batchStockMode === 'suggest'
        ? (product.suggestActivityStock || 30)
        : (parseInt(batchCustomStock) || 30);

      newFillStates.set(product.productId, {
        activityPrice: calculatedPrice,
        activityStock: calculatedStock,
      });
    });

    setProductFillStates(newFillStates);
    toast.success('批量填写完成');
  };

  // 打开场次选择弹窗（单个商品）
  const handleOpenSessionDialog = async (productId: number) => {
    setSessionDialogProductId(productId);
    setSessionDialogBatchMode(false);
    setSessionDialogOpen(true);
    setLoadingSessions(true);
    setSessionSiteFilter('all'); // 重置站点筛选

    try {
      const response = await temuActivityService.getActivitySessions({
        shopId,
        activityType,
        productIds: [productId],
        activityThematicId,
      });

      setAvailableSessions(response.list || []);

      // 初始化已选中的场次
      const existing = selectedProducts.get(productId);
      setTempSelectedSessions(new Set(existing?.selectedSessionIds || []));
    } catch (error) {
      console.error('获取场次列表失败:', error);
      toast.error('获取场次列表失败');
    } finally {
      setLoadingSessions(false);
    }
  };

  // 打开批量设置场次弹窗
  const handleOpenBatchSessionDialog = async () => {
    const selectedProductIds = Array.from(selectedProducts.keys());
    if (selectedProductIds.length === 0) {
      toast.error('请先选择要设置场次的商品');
      return;
    }

    setSessionDialogProductId(null);
    setSessionDialogBatchMode(true);
    setSessionDialogOpen(true);
    setLoadingSessions(true);
    setSessionSiteFilter('all'); // 重置站点筛选

    try {
      const response = await temuActivityService.getActivitySessions({
        shopId,
        activityType,
        productIds: selectedProductIds,
        activityThematicId,
      });

      setAvailableSessions(response.list || []);
      setTempSelectedSessions(new Set()); // 批量模式下清空已选
    } catch (error) {
      console.error('获取场次列表失败:', error);
      toast.error('获取场次列表失败');
    } finally {
      setLoadingSessions(false);
    }
  };

  // 获取场次对应的站点列表（去重）
  const sessionSiteList = useMemo(() => {
    const siteMap = new Map<number, string>();
    availableSessions.forEach(s => {
      if (s.siteId && s.siteName) {
        siteMap.set(s.siteId, s.siteName);
      }
    });
    return Array.from(siteMap.entries()).map(([id, name]) => ({ id, name }));
  }, [availableSessions]);

  // 根据站点筛选后的场次
  const filteredSessions = useMemo(() => {
    if (sessionSiteFilter === 'all') return availableSessions;
    return availableSessions.filter(s => String(s.siteId) === sessionSiteFilter);
  }, [availableSessions, sessionSiteFilter]);

  // 获取场次状态标签
  const getSessionStatusLabel = (status: number) => {
    switch (status) {
      case 1: return { text: '未开始', color: 'text-orange-500', dot: 'bg-orange-500' };
      case 2: return { text: '进行中', color: 'text-blue-500', dot: 'bg-blue-500' };
      case 3: return { text: '已结束', color: 'text-gray-500', dot: 'bg-gray-500' };
      default: return { text: '未知', color: 'text-gray-400', dot: 'bg-gray-400' };
    }
  };

  // 全选/取消全选场次
  const handleSelectAllSessions = (checked: boolean) => {
    if (checked) {
      setTempSelectedSessions(new Set(filteredSessions.map(s => s.sessionId)));
    } else {
      setTempSelectedSessions(new Set());
    }
  };

  const isAllSessionsSelected = filteredSessions.length > 0 && filteredSessions.every(s => tempSelectedSessions.has(s.sessionId));

  // 确认场次选择
  const handleConfirmSessions = () => {
    const sessionIds = Array.from(tempSelectedSessions);

    if (sessionDialogBatchMode) {
      // 批量模式：为所有选中的商品设置相同的场次
      const newSelected = new Map(selectedProducts);
      newSelected.forEach((state, productId) => {
        newSelected.set(productId, {
          ...state,
          selectedSessionIds: sessionIds,
        });
      });
      setSelectedProducts(newSelected);
      toast.success(`已为 ${newSelected.size} 个商品设置场次`);
    } else if (sessionDialogProductId !== null) {
      // 单个商品模式
      const newSelected = new Map(selectedProducts);
      const existing = newSelected.get(sessionDialogProductId);
      if (existing) {
        newSelected.set(sessionDialogProductId, {
          ...existing,
          selectedSessionIds: sessionIds,
        });
        setSelectedProducts(newSelected);
      }
    }

    setSessionDialogOpen(false);
    setSessionDialogProductId(null);
    setSessionDialogBatchMode(false);
  };

  // 提交报名
  const handleSubmit = async () => {
    const selectedList = Array.from(selectedProducts.values());
    if (selectedList.length === 0) {
      toast.error('请先选择要报名的商品');
      return;
    }

    // 检查是否都选择了场次
    const noSessionProducts = selectedList.filter(p => p.selectedSessionIds.length === 0);
    if (noSessionProducts.length > 0) {
      toast.error(`有 ${noSessionProducts.length} 个商品未选择场次`);
      return;
    }

    try {
      setSubmitting(true);

      // 构建请求数据
      const productList: EnrollProductSubmit[] = [];
      for (const selected of selectedList) {
        const product = products.find(p => p.productId === selected.productId);
        if (!product) continue;

        // 从 productFillStates 获取价格和库存
        const fillState = productFillStates.get(selected.productId);
        const activityPrice = fillState?.activityPrice || product.suggestActivityPrice || 0;
        const activityStock = fillState?.activityStock || product.suggestActivityStock || 30;

        // 构建skcList，skuList嵌套在skcList内部，sessionIds在每个product内部
        productList.push({
          productId: selected.productId,
          activityStock: activityStock,
          sessionIds: selected.selectedSessionIds.length > 0 ? selected.selectedSessionIds : undefined,
          skcList: product.skcList.map(skc => ({
            skcId: skc.skcId,
            activityPrice: activityPrice,
            // skuList 嵌套在 skcList 内部
            skuList: skc.skuList.map(sku => ({
              skuId: sku.skuId,
              // 半托管店铺需要提供 siteActivityPriceList，直接从 SKU 的 sitePriceList 获取站点信息
              siteActivityPriceList: sku.sitePriceList?.map(site => ({
                siteId: site.siteId,
                activityPrice: activityPrice,
              })) || [],
            })),
          })),
        });
      }

      const response = await temuActivityService.submitActivityEnroll({
        shopId,
        activityType,
        activityThematicId,
        productList,
      });

      if (response.successCount > 0) {
        toast.success(`报名成功 ${response.successCount} 个商品`);
      }
      if (response.failCount > 0) {
        toast.error(`报名失败 ${response.failCount} 个商品`);
      }

      // 刷新列表
      fetchProducts(true);
      setSelectedProducts(new Map());
    } catch (error) {
      console.error('提交报名失败:', error);
      toast.error('提交报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  const isAllSelected = products.length > 0 && products.every(p => selectedProducts.has(p.productId));
  const selectedCount = selectedProducts.size;

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* 页面标题 - 面包屑导航风格 */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/workspace/temu-activities')}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            营销活动
          </Button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2 text-primary">
            <span className="w-1 h-5 bg-primary rounded" />
            <h1 className="text-xl font-bold">{activityName}</h1>
          </div>
        </div>
      </div>

      {/* 搜索筛选区 */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="space-y-3">
          {/* ID查询 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">ID查询</span>
            <div className="flex h-9 rounded-md border border-input bg-background">
              <select
                className="h-full px-3 text-sm bg-transparent border-r border-input rounded-l-md focus:outline-none w-24"
                value={idType}
                onChange={(e) => setIdType(e.target.value as 'spu' | 'skc' | 'sku')}
              >
                <option value="spu">SPU ID</option>
                <option value="skc">SKC ID</option>
                <option value="sku">SKU ID</option>
              </select>
              <input
                type="text"
                placeholder="请输入，多个请空格或逗号隔开"
                value={idValue}
                onChange={(e) => setIdValue(e.target.value)}
                className="h-full px-3 text-sm bg-transparent border-0 focus:outline-none w-80"
              />
            </div>
          </div>

          {/* 站点和按钮 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">站点</span>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部站点</SelectItem>
                {allSiteIds.map(siteId => (
                  <SelectItem key={siteId} value={String(siteId)}>
                    {siteNames[siteId] || `站点${siteId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              查询
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* Tab 和内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="enrollable" className="flex-1 flex flex-col">
          <div className="px-6 pt-4 border-b">
            <TabsList>
              <TabsTrigger value="enrollable" className="text-primary">可报名商品</TabsTrigger>
              <TabsTrigger value="not-enrollable">不可报名商品</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="enrollable" className="flex-1 flex flex-col m-0 overflow-hidden">
            {/* 批量填写区 */}
            <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">批量填写</span>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">活动申报价</span>
                <Select value={batchPriceMode} onValueChange={setBatchPriceMode}>
                  <SelectTrigger className="w-44 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggest">使用参考申报价</SelectItem>
                    <SelectItem value="daily_discount">基于日常申报价打折</SelectItem>
                    <SelectItem value="daily_reduce">基于日常申报价降价</SelectItem>
                    <SelectItem value="suggest_discount">基于参考申报价打折</SelectItem>
                    <SelectItem value="suggest_reduce">基于参考申报价降价</SelectItem>
                    <SelectItem value="manual">手动设置参考申报价</SelectItem>
                  </SelectContent>
                </Select>
                {(batchPriceMode === 'daily_discount' || batchPriceMode === 'suggest_discount') && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={batchPriceValue}
                      onChange={(e) => setBatchPriceValue(e.target.value)}
                      className="w-16 h-8"
                      placeholder="9.5"
                    />
                    <span className="text-sm text-muted-foreground">折</span>
                  </div>
                )}
                {(batchPriceMode === 'daily_reduce' || batchPriceMode === 'suggest_reduce') && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">降</span>
                    <Input
                      type="text"
                      value={batchPriceValue}
                      onChange={(e) => setBatchPriceValue(e.target.value)}
                      className="w-20 h-8"
                      placeholder="金额"
                    />
                    <span className="text-sm text-muted-foreground">元</span>
                  </div>
                )}
                {batchPriceMode === 'manual' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={batchPriceValue}
                      onChange={(e) => setBatchPriceValue(e.target.value)}
                      className="w-24 h-8"
                      placeholder="请输入"
                    />
                    <span className="text-sm text-muted-foreground">元</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">活动库存</span>
                <Select value={batchStockMode} onValueChange={setBatchStockMode}>
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggest">使用参考活动库存</SelectItem>
                    <SelectItem value="manual">手动设置活动库存</SelectItem>
                  </SelectContent>
                </Select>
                {batchStockMode === 'manual' && (
                  <Input
                    type="text"
                    value={batchCustomStock}
                    onChange={(e) => setBatchCustomStock(e.target.value)}
                    className="w-24 h-8"
                    placeholder="请输入"
                  />
                )}
              </div>

              <Button size="sm" variant="outline" onClick={handleBatchFill}>
                一键填写
              </Button>
            </div>

            {/* 商品表格 */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[160px]">
                        <div className="flex items-center gap-2">
                          <span>报名场次</span>
                          <button
                            className="text-primary text-xs hover:underline"
                            onClick={handleOpenBatchSessionDialog}
                          >
                            批量设置场次
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[200px]">商品信息</TableHead>
                      <TableHead className="w-[100px]">报名站点</TableHead>
                      <TableHead className="w-[140px]">SKC信息</TableHead>
                      <TableHead className="w-[120px]">SKU属性集</TableHead>
                      <TableHead className="w-[200px]">活动申报价格</TableHead>
                      <TableHead className="w-[160px]">场次共用活动库存</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            加载中...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-8 h-8" />
                            暂无可报名商品
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => {
                        const isSelected = selectedProducts.has(product.productId);
                        const selectedState = selectedProducts.get(product.productId);
                        const fillState = productFillStates.get(product.productId);
                        const firstSkc = product.skcList?.[0];
                        const dailyPrice = product.dailyPrice || 0;
                        const suggestPrice = product.suggestActivityPrice || 0;
                        const siteName = product.sites.join(', ');

                        return (
                          <TableRow key={product.productId}>
                            {/* 复选框 */}
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectProduct(product, checked as boolean)}
                              />
                            </TableCell>

                            {/* 报名场次 */}
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div>可报名场次: 2</div>
                                <div className="flex items-center gap-1">
                                  已选中场次: {selectedState?.selectedSessionIds.length || 0}
                                  <button
                                    className="text-primary hover:underline inline-flex items-center"
                                    onClick={() => handleOpenSessionDialog(product.productId)}
                                  >
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </button>
                                </div>
                              </div>
                            </TableCell>

                            {/* 商品信息 */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium line-clamp-2">{product.productName}</div>
                                <div className="text-xs text-muted-foreground">SPU ID: {product.productId}</div>
                                <div className="text-xs text-muted-foreground">经营站点: {siteName}</div>
                              </div>
                            </TableCell>

                            {/* 报名站点 */}
                            <TableCell className="text-sm">{siteName}</TableCell>

                            {/* SKC信息 */}
                            <TableCell>
                              <div className="text-sm">
                                {firstSkc?.skcId || '-'}
                              </div>
                            </TableCell>

                            {/* SKU属性集 */}
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                -
                              </div>
                            </TableCell>

                            {/* 活动申报价格 */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm">日常价: {formatPrice(dailyPrice)}</div>
                                <div className="text-sm text-muted-foreground">参考价: {formatPrice(suggestPrice)}</div>
                                <div className="flex items-center gap-1 mt-2">
                                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">自定义</span>
                                  <Input
                                    type="text"
                                    value={fillState?.activityPrice ? (fillState.activityPrice / 100).toString() : ''}
                                    onChange={(e) => updateProductPrice(product.productId, Math.round((parseFloat(e.target.value) || 0) * 100))}
                                    className="w-20 h-7 text-sm"
                                    placeholder="请输入"
                                  />
                                </div>
                                {fillState?.activityPrice && suggestPrice > 0 && fillState.activityPrice > suggestPrice && (
                                  <div className="text-xs text-red-500">不可大于参考价格</div>
                                )}
                              </div>
                            </TableCell>

                            {/* 场次共用活动库存 */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm">参考库存: {product.suggestActivityStock || '-'}</div>
                                <div className="text-sm text-muted-foreground">销售库存: 99999</div>
                                <Input
                                  type="text"
                                  value={fillState?.activityStock || ''}
                                  onChange={(e) => updateProductStock(product.productId, parseInt(e.target.value) || 0)}
                                  className="w-24 h-7 text-sm mt-2"
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchProducts(false)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="not-enrollable" className="flex-1 m-0 p-6">
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p>暂无不可报名商品</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部操作栏 - 固定在底部，更醒目 */}
      <div className="px-6 py-4 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/workspace/temu-activities')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <span className="text-sm text-muted-foreground">
              已选择 <span className="text-primary font-bold text-base">{selectedCount}</span> 个商品
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedCount === 0}
            size="lg"
            className="px-10"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            提交报名
          </Button>
        </div>
      </div>

      {/* 场次选择弹窗 */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {sessionDialogBatchMode
                  ? `批量设置场次（已选 ${selectedProducts.size} 个商品）`
                  : '设置场次'}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* 提示信息 */}
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>每个商品仅可报名其已加站站点下的场次</span>
          </div>

          {/* 站点Tab筛选 */}
          {!loadingSessions && sessionSiteList.length > 0 && (
            <div className="flex items-center gap-4 border-b">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  sessionSiteFilter === 'all'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSessionSiteFilter('all')}
              >
                全部
              </button>
              {sessionSiteList.map(site => (
                <button
                  key={site.id}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    sessionSiteFilter === String(site.id)
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setSessionSiteFilter(String(site.id))}
                >
                  {site.name}
                </button>
              ))}
            </div>
          )}

          {/* 场次列表 */}
          <div className="flex-1 overflow-auto py-4">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无可选场次
              </div>
            ) : (
              <>
                {/* 按站点分组显示 */}
                {sessionSiteList.map(site => {
                  const siteSessions = filteredSessions.filter(s => s.siteId === site.id);
                  if (siteSessions.length === 0) return null;

                  return (
                    <div key={site.id} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-1 h-4 bg-primary rounded" />
                        <span className="font-medium">{site.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {siteSessions.map(session => {
                          const statusLabel = getSessionStatusLabel(session.sessionStatus);
                          const isChecked = tempSelectedSessions.has(session.sessionId);

                          return (
                            <label
                              key={session.sessionId}
                              className={`relative p-4 border rounded-lg cursor-pointer transition-colors ${
                                isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                            >
                              {/* 状态标签 */}
                              <div className="absolute top-3 right-3 flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${statusLabel.dot}`} />
                                <span className={`text-xs ${statusLabel.color}`}>{statusLabel.text}</span>
                              </div>

                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(tempSelectedSessions);
                                    if (checked) {
                                      newSet.add(session.sessionId);
                                    } else {
                                      newSet.delete(session.sessionId);
                                    }
                                    setTempSelectedSessions(newSet);
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium pr-16 truncate">
                                    {session.siteName}-{session.startDateStr}~{session.endDateStr}
                                  </div>
                                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div>活动站点: {session.siteName}</div>
                                    <div>活动时间: {session.startDateStr}~{session.endDateStr} ({session.durationDays}天)</div>
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* 底部操作区 */}
          <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isAllSessionsSelected}
                onCheckedChange={handleSelectAllSessions}
              />
              <span className="text-sm">全选</span>
            </label>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmSessions}>
                确认
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
