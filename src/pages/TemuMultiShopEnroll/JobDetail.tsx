import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, RefreshCw, Loader2, Square, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  temuMultiShopEnrollService,
  type GetMultiShopEnrollJobDetailResponse,
  type MultiShopEnrollJobShop,
  JOB_STATUS,
  SHOP_STATUS,
  getJobStatusDisplay,
} from '@/services/temuMultiShopEnrollService';
import { toast } from 'sonner';

// 格式化时间
const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 价格策略显示
const getPriceStrategyDisplay = (strategy: string, value?: number): string => {
  switch (strategy) {
    case 'suggest':
      return '使用参考申报价';
    case 'daily_discount':
      return `日常价打${value || 0}折`;
    case 'daily_reduce':
      return `日常价减${value || 0}元`;
    case 'suggest_discount':
      return `参考价打${value || 0}折`;
    case 'suggest_reduce':
      return `参考价减${value || 0}元`;
    default:
      return strategy;
  }
};

// 库存策略显示
const getStockStrategyDisplay = (strategy: string, value?: number): string => {
  switch (strategy) {
    case 'suggest':
      return '使用参考活动库存';
    case 'manual':
      return `手动设置: ${value || 0}`;
    default:
      return strategy;
  }
};

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<GetMultiShopEnrollJobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<MultiShopEnrollJobShop | null>(null);

  // 加载任务详情
  const loadJobDetail = useCallback(async () => {
    if (!id) return;
    try {
      const response = await temuMultiShopEnrollService.getJobDetail(parseInt(id));
      setJob(response);
    } catch (error) {
      console.error('Failed to load job detail:', error);
      toast.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJobDetail();
  }, [loadJobDetail]);

  // 自动刷新运行中的任务
  useEffect(() => {
    if (job?.status === JOB_STATUS.RUNNING) {
      const interval = setInterval(loadJobDetail, 2000);
      return () => clearInterval(interval);
    }
  }, [job?.status, loadJobDetail]);

  // 取消任务
  const handleCancelJob = async () => {
    if (!id) return;
    try {
      await temuMultiShopEnrollService.cancelJob(parseInt(id));
      toast.success('任务已取消');
      loadJobDetail();
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast.error('取消任务失败');
    }
  };

  // 计算进度
  const getProgress = (): number => {
    if (!job || job.totalShops === 0) return 0;
    return ((job.completedShops + job.failedShops) / job.totalShops) * 100;
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case SHOP_STATUS.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case SHOP_STATUS.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case SHOP_STATUS.RUNNING:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case SHOP_STATUS.PENDING:
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const display = getJobStatusDisplay(status);
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      gray: 'secondary',
      blue: 'default',
      green: 'outline',
      red: 'destructive',
      orange: 'secondary',
    };
    return (
      <Badge variant={variantMap[display.color] || 'secondary'}>
        {display.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">任务不存在</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-xl font-semibold">{job.name}</h1>
          {getStatusBadge(job.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadJobDetail}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          {(job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.RUNNING) && (
            <Button variant="outline" size="sm" onClick={handleCancelJob}>
              <Square className="h-4 w-4 mr-2" />
              停止任务
            </Button>
          )}
        </div>
      </div>

      {/* 执行进度 & 策略配置 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-8">
            {/* 店铺进度 */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">店铺进度</span>
              <Progress value={getProgress()} className="w-32" />
              <div className="flex gap-3 text-sm">
                <span className="text-green-600">{job.completedShops} 成功</span>
                <span className="text-red-600">{job.failedShops} 失败</span>
                <span className="text-gray-500">
                  {job.totalShops - job.completedShops - job.failedShops} 等待
                </span>
              </div>
            </div>

            <div className="h-4 border-l" />

            {/* 策略配置 */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">价格: </span>
                <span>{getPriceStrategyDisplay(job.priceStrategy, job.priceValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">库存: </span>
                <span>{getStockStrategyDisplay(job.stockStrategy, job.stockValue)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 店铺执行详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">店铺执行详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[120px]">店铺名称</TableHead>
                  <TableHead className="w-[150px]">活动</TableHead>
                  <TableHead className="w-[150px]">专场</TableHead>
                  <TableHead className="w-[150px]">场次</TableHead>
                  <TableHead className="w-[120px]">执行结果</TableHead>
                  <TableHead className="w-[150px]">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell>{getStatusIcon(shop.status)}</TableCell>
                    <TableCell className="font-medium">{shop.shopName}</TableCell>
                    <TableCell>{shop.activityName || '-'}</TableCell>
                    <TableCell>{shop.thematicName || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {shop.sessionNames || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {shop.status === SHOP_STATUS.COMPLETED || shop.status === SHOP_STATUS.FAILED ? (
                        <div className="text-sm space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs w-8">成功</span>
                            <span className="text-green-600 font-medium">{shop.successProducts}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs w-8">失败</span>
                            {shop.failedProducts > 0 && shop.failDetails && shop.failDetails.length > 0 ? (
                              <button
                                className="text-red-600 font-medium underline cursor-pointer hover:text-red-700"
                                onClick={() => setSelectedShop(shop)}
                              >
                                {shop.failedProducts}
                              </button>
                            ) : (
                              <span className="text-red-600 font-medium">{shop.failedProducts}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs w-8">总数</span>
                            <span className="text-muted-foreground">{shop.totalProducts}</span>
                          </div>
                        </div>
                      ) : shop.status === SHOP_STATUS.RUNNING ? (
                        <div className="space-y-1">
                          <Progress
                            value={shop.totalProducts > 0
                              ? ((shop.successProducts + shop.failedProducts) / shop.totalProducts) * 100
                              : 0}
                            className="w-20 h-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {shop.successProducts + shop.failedProducts}/{shop.totalProducts}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shop.startedAt ? (
                        <div>
                          <div>开始: {formatDateTime(shop.startedAt)}</div>
                          {shop.completedAt && <div>结束: {formatDateTime(shop.completedAt)}</div>}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

        </CardContent>
      </Card>

      {/* 失败详情弹窗 */}
      <Dialog open={!!selectedShop} onOpenChange={(open) => !open && setSelectedShop(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedShop?.shopName} - 失败详情
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedShop?.failDetails && selectedShop.failDetails.length > 0 ? (
              <div className="space-y-2">
                {selectedShop.failDetails.map((detail, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm">
                      <span className="text-muted-foreground">商品ID: </span>
                      <span className="font-mono">{detail.productId}</span>
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {detail.failMsg}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">无详细失败信息</p>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setSelectedShop(null)}>关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JobDetail;
