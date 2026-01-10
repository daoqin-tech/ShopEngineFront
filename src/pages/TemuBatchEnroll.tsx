import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Square,
} from 'lucide-react';
import { temuActivityService } from '@/services/temuActivityService';
import {
  temuBatchEnrollService,
  type PriceStrategy,
  type StockStrategy,
  type BatchEnrollProgress,
  priceStrategyNames,
  stockStrategyNames,
} from '@/services/temuBatchEnrollService';
import type { ActivitySession, ActivityProduct, ActivityType } from '@/types/temuActivity';
import { ActivityTypeNames } from '@/types/temuActivity';
import { toast } from 'sonner';

// 格式化价格（分转元）
const formatPrice = (priceInCents?: number): string => {
  if (priceInCents === undefined || priceInCents === null || priceInCents === 0) return '-';
  return `¥${(priceInCents / 100).toFixed(2)}`;
};

// 步骤类型
type Step = 1 | 2 | 3;

export function TemuBatchEnroll() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 从 URL 参数获取
  const shopId = searchParams.get('shopId') || '';
  const activityType = Number(searchParams.get('activityType')) as ActivityType;
  const activityThematicId = searchParams.get('activityThematicId')
    ? Number(searchParams.get('activityThematicId'))
    : undefined;
  const activityName = searchParams.get('activityName') || ActivityTypeNames[activityType] || '批量报名';

  // 步骤状态
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: 场次选择
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());
  const [siteFilter, setSiteFilter] = useState<string>('all');

  // Step 2: 策略配置
  const [priceStrategy, setPriceStrategy] = useState<PriceStrategy>('suggest');
  const [priceValue, setPriceValue] = useState<string>('');
  const [stockStrategy, setStockStrategy] = useState<StockStrategy>('suggest');
  const [stockValue, setStockValue] = useState<string>('');
  const [previewProducts, setPreviewProducts] = useState<ActivityProduct[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Step 3: 执行状态
  const [taskId, setTaskId] = useState<number | null>(null);
  const [progress, setProgress] = useState<BatchEnrollProgress | null>(null);
  const [, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 从场次中提取站点列表
  const siteList = useMemo(() => {
    const sites = new Map<number, string>();
    sessions.forEach((session) => {
      if (!sites.has(session.siteId)) {
        sites.set(session.siteId, session.siteName);
      }
    });
    return Array.from(sites.entries()).map(([siteId, siteName]) => ({ siteId, siteName }));
  }, [sessions]);

  // 过滤后的场次列表
  const filteredSessions = useMemo(() => {
    if (siteFilter === 'all') return sessions;
    return sessions.filter((s) => String(s.siteId) === siteFilter);
  }, [sessions, siteFilter]);

  // 加载场次列表
  const fetchSessions = async () => {
    if (!shopId) return;
    setLoadingSessions(true);
    try {
      // 先获取一些商品ID用于获取场次
      const productsResp = await temuActivityService.getActivityProducts({
        shopId,
        activityType,
        activityThematicId,
        rowCount: 5,
      });

      if (productsResp.matchList.length === 0) {
        toast.error('暂无可报名商品');
        setSessions([]);
        return;
      }

      const productIds = productsResp.matchList.map((p) => p.productId);
      const sessionsResp = await temuActivityService.getActivitySessions({
        shopId,
        activityType,
        activityThematicId,
        productIds,
      });

      setSessions(sessionsResp.list || []);
    } catch (error) {
      console.error('获取场次列表失败:', error);
      toast.error('获取场次列表失败');
    } finally {
      setLoadingSessions(false);
    }
  };

  // 加载预览商品
  const fetchPreviewProducts = async () => {
    if (!shopId) return;
    setLoadingPreview(true);
    try {
      const resp = await temuActivityService.getActivityProducts({
        shopId,
        activityType,
        activityThematicId,
        rowCount: 3,
      });
      setPreviewProducts(resp.matchList || []);
    } catch (error) {
      console.error('获取预览商品失败:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // 计算预览活动价
  const calculatePreviewPrice = (product: ActivityProduct): number => {
    const dailyPrice = product.dailyPrice || 0;
    const suggestPrice = product.suggestActivityPrice || 0;
    const value = parseFloat(priceValue) || 0;

    let activityPrice: number;
    switch (priceStrategy) {
      case 'suggest':
        activityPrice = suggestPrice;
        break;
      case 'daily_discount':
        activityPrice = Math.round(dailyPrice * value / 10);
        break;
      case 'daily_reduce':
        activityPrice = dailyPrice - Math.round(value * 100);
        break;
      case 'suggest_discount':
        activityPrice = Math.round(suggestPrice * value / 10);
        break;
      case 'suggest_reduce':
        activityPrice = suggestPrice - Math.round(value * 100);
        break;
      default:
        activityPrice = suggestPrice;
    }

    // 活动价不能高于参考价
    if (activityPrice > suggestPrice) {
      activityPrice = suggestPrice;
    }
    // 最低1分
    if (activityPrice < 1) {
      activityPrice = 1;
    }

    return activityPrice;
  };

  // 计算预览库存
  const calculatePreviewStock = (product: ActivityProduct): number => {
    if (stockStrategy === 'manual' && stockValue) {
      return parseInt(stockValue) || product.suggestActivityStock;
    }
    return product.suggestActivityStock;
  };

  // 场次选择
  const handleSessionSelect = (sessionId: number) => {
    setSelectedSessionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedSessionIds.size === filteredSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(filteredSessions.map((s) => s.sessionId)));
    }
  };

  // 开始执行
  const handleStart = async () => {
    if (selectedSessionIds.size === 0) {
      toast.error('请至少选择一个场次');
      return;
    }

    try {
      const resp = await temuBatchEnrollService.createTask({
        shopId,
        activityType,
        activityThematicId,
        activityName,
        sessionIds: Array.from(selectedSessionIds),
        priceStrategy,
        priceValue: priceValue ? parseFloat(priceValue) : undefined,
        stockStrategy,
        stockValue: stockValue ? parseInt(stockValue) : undefined,
      });

      setTaskId(resp.taskId);
      setCurrentStep(3);
      startPolling(resp.taskId);
    } catch (error) {
      console.error('创建任务失败:', error);
      toast.error('创建任务失败');
    }
  };

  // 开始轮询
  const startPolling = (id: number) => {
    setIsPolling(true);
    const poll = async () => {
      try {
        const prog = await temuBatchEnrollService.getTaskProgress(id);
        setProgress(prog);

        if (prog.status === 'completed' || prog.status === 'failed' || prog.status === 'cancelled') {
          stopPolling();
        }
      } catch (error) {
        console.error('获取进度失败:', error);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);
  };

  // 停止轮询
  const stopPolling = () => {
    setIsPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // 取消任务
  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await temuBatchEnrollService.cancelTask(taskId);
      toast.success('任务已取消');
    } catch (error) {
      console.error('取消任务失败:', error);
      toast.error('取消任务失败');
    }
  };

  // 返回
  const handleBack = () => {
    if (currentStep === 1) {
      navigate(-1);
    } else if (currentStep === 3 && (progress?.status === 'completed' || progress?.status === 'failed' || progress?.status === 'cancelled')) {
      navigate('/workspace/temu-activities');
    } else {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedSessionIds.size === 0) {
        toast.error('请至少选择一个场次');
        return;
      }
      setCurrentStep(2);
      fetchPreviewProducts();
    } else if (currentStep === 2) {
      handleStart();
    }
  };

  // 初始化
  useEffect(() => {
    fetchSessions();
  }, [shopId, activityType, activityThematicId]);

  // 清理轮询
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* 顶部标题栏 */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">批量报名 - {activityName}</h1>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex justify-center pb-4">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step < currentStep
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                <span className={`ml-2 text-sm ${step === currentStep ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step === 1 ? '选择场次' : step === 2 ? '配置策略' : '执行报名'}
                </span>
                {step < 3 && <ChevronRight className="w-4 h-4 mx-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {/* Step 1: 选择场次 */}
        {currentStep === 1 && (
          <div className="h-full flex flex-col p-6">
            <div className="mb-4">
              <h2 className="text-base font-medium mb-2">选择要报名的场次（可多选）</h2>
              {/* 站点筛选 */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">站点筛选：</span>
                <Button
                  variant={siteFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSiteFilter('all')}
                >
                  全部
                </Button>
                {siteList.map((site) => (
                  <Button
                    key={site.siteId}
                    variant={siteFilter === String(site.siteId) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSiteFilter(String(site.siteId))}
                  >
                    {site.siteName}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredSessions.length > 0 && selectedSessionIds.size === filteredSessions.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>场次名称</TableHead>
                    <TableHead className="w-24">站点</TableHead>
                    <TableHead className="w-32">活动时间</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSessions ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                        <span className="text-muted-foreground mt-2 block">加载中...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground" />
                        <span className="text-muted-foreground mt-2 block">暂无可选场次</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => (
                      <TableRow
                        key={session.sessionId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSessionSelect(session.sessionId)}
                      >
                        <TableCell>
                          <Checkbox checked={selectedSessionIds.has(session.sessionId)} />
                        </TableCell>
                        <TableCell className="font-medium">{session.sessionName}</TableCell>
                        <TableCell>{session.siteName}</TableCell>
                        <TableCell className="text-sm">
                          {session.startDateStr} ~ {session.endDateStr}
                          <span className="text-muted-foreground ml-1">({session.durationDays}天)</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.sessionStatus === 1 ? 'secondary' : session.sessionStatus === 2 ? 'default' : 'outline'}>
                            {session.sessionStatus === 1 ? '未开始' : session.sessionStatus === 2 ? '进行中' : '已结束'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-bottom"
                  checked={filteredSessions.length > 0 && selectedSessionIds.size === filteredSessions.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all-bottom" className="text-sm">
                  全选
                </Label>
              </div>
              <span className="text-sm text-muted-foreground">
                已选择 <span className="font-medium text-foreground">{selectedSessionIds.size}</span> 个场次
              </span>
            </div>
          </div>
        )}

        {/* Step 2: 配置策略 */}
        {currentStep === 2 && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* 价格策略 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">活动申报价格</h3>
                  <RadioGroup value={priceStrategy} onValueChange={(v) => setPriceStrategy(v as PriceStrategy)} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suggest" id="price-suggest" />
                      <Label htmlFor="price-suggest">{priceStrategyNames.suggest}（推荐）</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily_discount" id="price-daily-discount" />
                      <Label htmlFor="price-daily-discount" className="flex items-center gap-2">
                        {priceStrategyNames.daily_discount}
                        {priceStrategy === 'daily_discount' && (
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="9.9"
                              placeholder="9.5"
                              value={priceValue}
                              onChange={(e) => setPriceValue(e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="ml-1">折</span>
                          </div>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily_reduce" id="price-daily-reduce" />
                      <Label htmlFor="price-daily-reduce" className="flex items-center gap-2">
                        {priceStrategyNames.daily_reduce}
                        {priceStrategy === 'daily_reduce' && (
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="1.00"
                              value={priceValue}
                              onChange={(e) => setPriceValue(e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="ml-1">元</span>
                          </div>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suggest_discount" id="price-suggest-discount" />
                      <Label htmlFor="price-suggest-discount" className="flex items-center gap-2">
                        {priceStrategyNames.suggest_discount}
                        {priceStrategy === 'suggest_discount' && (
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="9.9"
                              placeholder="9.5"
                              value={priceValue}
                              onChange={(e) => setPriceValue(e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="ml-1">折</span>
                          </div>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suggest_reduce" id="price-suggest-reduce" />
                      <Label htmlFor="price-suggest-reduce" className="flex items-center gap-2">
                        {priceStrategyNames.suggest_reduce}
                        {priceStrategy === 'suggest_reduce' && (
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="1.00"
                              value={priceValue}
                              onChange={(e) => setPriceValue(e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="ml-1">元</span>
                          </div>
                        )}
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-orange-600 mt-3">
                    注意：活动价不能高于参考申报价，否则报名会失败
                  </p>
                </CardContent>
              </Card>

              {/* 库存策略 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">活动库存</h3>
                  <RadioGroup value={stockStrategy} onValueChange={(v) => setStockStrategy(v as StockStrategy)} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suggest" id="stock-suggest" />
                      <Label htmlFor="stock-suggest">{stockStrategyNames.suggest}（推荐）</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="stock-manual" />
                      <Label htmlFor="stock-manual" className="flex items-center gap-2">
                        {stockStrategyNames.manual}
                        {stockStrategy === 'manual' && (
                          <div className="flex items-center">
                            <Input
                              type="number"
                              min="1"
                              placeholder="100"
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              className="w-20 h-8"
                            />
                            <span className="ml-1">件</span>
                          </div>
                        )}
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* 配置预览 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">配置预览（随机抽取3个商品示例）</h3>
                  {loadingPreview ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </div>
                  ) : previewProducts.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">暂无预览数据</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品名称</TableHead>
                          <TableHead className="w-24 text-right">日常价</TableHead>
                          <TableHead className="w-24 text-right">参考价</TableHead>
                          <TableHead className="w-24 text-right">活动价</TableHead>
                          <TableHead className="w-20 text-right">库存</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewProducts.map((product) => {
                          const activityPrice = calculatePreviewPrice(product);
                          const activityStock = calculatePreviewStock(product);
                          const isOverPrice = activityPrice > (product.suggestActivityPrice || 0);

                          return (
                            <TableRow key={product.productId}>
                              <TableCell className="max-w-[200px] truncate">{product.productName}</TableCell>
                              <TableCell className="text-right">{formatPrice(product.dailyPrice)}</TableCell>
                              <TableCell className="text-right">{formatPrice(product.suggestActivityPrice)}</TableCell>
                              <TableCell className={`text-right ${isOverPrice ? 'text-red-600' : ''}`}>
                                {formatPrice(activityPrice)}
                                {isOverPrice && <span className="text-xs ml-1">!</span>}
                              </TableCell>
                              <TableCell className="text-right">{activityStock}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <p className="text-sm text-muted-foreground mt-3">
                    以上为示例预览，实际将应用到所有可报名商品
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: 执行报名 */}
        {currentStep === 3 && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* 进度卡片 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    {progress?.status === 'completed' ? (
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                    ) : progress?.status === 'failed' ? (
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                    ) : progress?.status === 'cancelled' ? (
                      <Square className="w-16 h-16 text-orange-500 mx-auto mb-2" />
                    ) : (
                      <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-2" />
                    )}
                    <h3 className="text-lg font-medium">
                      {progress?.status === 'completed'
                        ? '批量报名完成'
                        : progress?.status === 'failed'
                        ? '批量报名失败'
                        : progress?.status === 'cancelled'
                        ? '任务已取消'
                        : progress?.phase === 'fetching'
                        ? '正在获取商品...'
                        : progress?.phase === 'enrolling'
                        ? '正在提交报名...'
                        : '准备中...'}
                    </h3>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>进度</span>
                      <span>{progress?.progress || 0}%</span>
                    </div>
                    <Progress value={progress?.progress || 0} />
                  </div>

                  {/* 统计数据 */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{progress?.totalCount || 0}</div>
                      <div className="text-sm text-muted-foreground">总商品数</div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{progress?.successCount || 0}</div>
                      <div className="text-sm text-muted-foreground">成功</div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{progress?.failCount || 0}</div>
                      <div className="text-sm text-muted-foreground">失败</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 执行日志 */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">执行日志</h3>
                  <div className="h-[200px] border rounded-lg p-3 overflow-auto">
                    <div className="space-y-1 font-mono text-sm">
                      {progress?.logs && progress.logs.length > 0 ? (
                        progress.logs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`${
                              log.type === 'error'
                                ? 'text-red-600'
                                : log.type === 'success'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            [{log.time}] {log.message}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">等待执行...</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="border-t bg-background px-6 py-4">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <Button variant="outline" onClick={handleBack}>
            {currentStep === 3 && (progress?.status === 'completed' || progress?.status === 'failed' || progress?.status === 'cancelled')
              ? '关闭'
              : '上一步'}
          </Button>
          <div className="flex gap-3">
            {currentStep === 3 && progress?.status === 'running' && (
              <Button variant="destructive" onClick={handleCancel}>
                <Square className="w-4 h-4 mr-2" />
                停止
              </Button>
            )}
            {currentStep < 3 && (
              <Button onClick={handleNext}>
                {currentStep === 2 ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    开始执行
                  </>
                ) : (
                  <>
                    下一步
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
            {currentStep === 3 && (progress?.status === 'completed' || progress?.status === 'failed') && (
              <Button onClick={() => navigate('/workspace/temu-activities?tab=records')}>
                查看报名记录
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
