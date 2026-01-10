import { useState, useEffect, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  Store,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { temuShopService, type TemuShop } from '@/services/temuShopService';
import { temuActivityService } from '@/services/temuActivityService';
import type { ActivityEnrollRecord, ActivityType } from '@/types/temuActivity';
import {
  ActivityTypes,
  ActivityTypeNames,
  EnrollStatuses,
} from '@/types/temuActivity';
import { toast } from 'sonner';

// 格式化价格（分转元）
const formatPrice = (priceInCents?: number): string => {
  if (priceInCents === undefined || priceInCents === null || priceInCents === 0) return '-';
  return (priceInCents / 100).toFixed(2);
};

// 格式化时间戳为日期时间
const formatDateTime = (timestamp?: number): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/\//g, '-');
};

// 获取报名状态样式和文本
const getEnrollStatusInfo = (status: number): { text: string; className: string } => {
  switch (status) {
    case EnrollStatuses.ENROLLING:
      return { text: '报名中', className: 'text-blue-600' };
    case EnrollStatuses.ENROLL_FAILED:
      return { text: '报名失败', className: 'text-red-600' };
    case EnrollStatuses.SUCCESS_PENDING_SESSION:
      return { text: '待分配场次', className: 'text-orange-600' };
    case EnrollStatuses.SUCCESS_ASSIGNED_SESSION:
      return { text: '已分配场次', className: 'text-green-600' };
    case EnrollStatuses.ACTIVITY_ENDED:
      return { text: '活动已结束', className: 'text-gray-500' };
    case EnrollStatuses.ACTIVITY_OFFLINE:
      return { text: '活动已下线', className: 'text-gray-500' };
    default:
      return { text: '未知', className: 'text-gray-500' };
  }
};

interface TemuEnrollRecordsProps {
  shopId?: string;
}

export function TemuEnrollRecords({ shopId: propShopId }: TemuEnrollRecordsProps) {
  // 店铺相关状态
  const [shops, setShops] = useState<TemuShop[]>([]);
  const [internalShopId, setInternalShopId] = useState<string>('');
  const [loadingShops, setLoadingShops] = useState(!propShopId);

  const selectedShopId = propShopId || internalShopId;
  const isEmbedded = !!propShopId;

  // 报名记录状态
  const [enrollRecords, setEnrollRecords] = useState<ActivityEnrollRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 筛选状态
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [temuIdType, setTemuIdType] = useState<'spu' | 'skc' | 'sku' | 'skcExtCode'>('spu');
  const [temuIdValue, setTemuIdValue] = useState('');

  // 活动类型选项（使用正确的名称）
  const activityTypeOptions = useMemo(() => [
    { value: 'all', label: '全部' },
    { value: String(ActivityTypes.FLASH_SALE), label: ActivityTypeNames[ActivityTypes.FLASH_SALE] },
    { value: String(ActivityTypes.PROMOTION), label: ActivityTypeNames[ActivityTypes.PROMOTION] },
    { value: String(ActivityTypes.ADVANCED_PROMOTION), label: ActivityTypeNames[ActivityTypes.ADVANCED_PROMOTION] },
    { value: String(ActivityTypes.CLEARANCE), label: ActivityTypeNames[ActivityTypes.CLEARANCE] },
    { value: String(ActivityTypes.GROUP_BUY), label: ActivityTypeNames[ActivityTypes.GROUP_BUY] },
    { value: String(ActivityTypes.ADVANCED_FLASH_SALE), label: ActivityTypeNames[ActivityTypes.ADVANCED_FLASH_SALE] },
    { value: String(ActivityTypes.ADVANCED_CLEARANCE), label: ActivityTypeNames[ActivityTypes.ADVANCED_CLEARANCE] },
  ], []);

  // 加载店铺列表
  const fetchShops = async () => {
    if (isEmbedded) return;
    try {
      setLoadingShops(true);
      const response = await temuShopService.getAllShops(true);
      setShops(response.shops);
      if (response.shops.length > 0 && !internalShopId) {
        setInternalShopId(response.shops[0].id);
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      toast.error('获取店铺列表失败');
    } finally {
      setLoadingShops(false);
    }
  };

  // 加载报名记录
  const fetchEnrollRecords = async (page: number = 1) => {
    if (!selectedShopId) return;

    try {
      setLoadingRecords(true);
      const params: {
        shopId: string;
        pageNo: number;
        pageSize: number;
        activityType?: ActivityType;
        productIds?: number[];
        productSkcIds?: number[];
        productSkuIds?: number[];
        skcExtCodes?: string[];
      } = {
        shopId: selectedShopId,
        pageNo: page,
        pageSize: pageSize,
      };

      if (activityTypeFilter !== 'all') {
        params.activityType = Number(activityTypeFilter) as ActivityType;
      }

      // 根据 Temu ID 类型设置不同的查询参数
      if (temuIdValue.trim()) {
        const values = temuIdValue.split(/[,，\s]+/).filter(Boolean);
        if (values.length > 0) {
          switch (temuIdType) {
            case 'spu':
              params.productIds = values.map(Number).filter(n => !isNaN(n));
              break;
            case 'skc':
              params.productSkcIds = values.map(Number).filter(n => !isNaN(n));
              break;
            case 'sku':
              params.productSkuIds = values.map(Number).filter(n => !isNaN(n));
              break;
            case 'skcExtCode':
              params.skcExtCodes = values;
              break;
          }
        }
      }

      const response = await temuActivityService.getActivityEnrollList(params);
      setEnrollRecords(response.list || []);
      setTotalRecords(response.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('获取报名记录失败:', error);
      toast.error('获取报名记录失败');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSearch = () => {
    fetchEnrollRecords(1);
  };

  // 分页
  const totalPages = Math.ceil(totalRecords / pageSize);

  const handleFirstPage = () => currentPage > 1 && fetchEnrollRecords(1);
  const handlePrevPage = () => currentPage > 1 && fetchEnrollRecords(currentPage - 1);
  const handleNextPage = () => currentPage < totalPages && fetchEnrollRecords(currentPage + 1);
  const handleLastPage = () => currentPage < totalPages && fetchEnrollRecords(totalPages);
  const handlePageJump = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchEnrollRecords(page);
    }
  };

  useEffect(() => {
    if (!isEmbedded) {
      fetchShops();
    }
  }, [isEmbedded]);

  useEffect(() => {
    if (selectedShopId) {
      fetchEnrollRecords(1);
    }
  }, [selectedShopId, propShopId]);

  // 分页按钮
  const renderPaginationButtons = () => {
    const buttons: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else {
      if (currentPage <= 3) {
        buttons.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        buttons.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        buttons.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return buttons;
  };

  return (
    <div className={isEmbedded ? '' : 'flex-1 p-6 bg-background'}>
      {/* 页面标题（仅独立使用时显示） */}
      {!isEmbedded && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">报名记录</h1>
            <p className="text-muted-foreground">Temu 平台活动报名记录查询</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedShopId} onValueChange={setInternalShopId} disabled={loadingShops}>
              <SelectTrigger className="w-[200px]">
                <Store className="w-4 h-4 mr-2" />
                <SelectValue placeholder={loadingShops ? '加载中...' : '选择店铺'} />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchEnrollRecords(currentPage)} disabled={loadingRecords}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingRecords ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      )}

      {/* 筛选区域 */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground min-w-[70px]">活动类型：</span>
          <RadioGroup value={activityTypeFilter} onValueChange={setActivityTypeFilter} className="flex flex-wrap gap-1">
            {activityTypeOptions.map((option) => (
              <Label
                key={option.value}
                htmlFor={`enroll-activity-${option.value}`}
                className={`cursor-pointer px-3 py-1 rounded-full text-sm transition-colors ${
                  activityTypeFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <RadioGroupItem value={option.value} id={`enroll-activity-${option.value}`} className="sr-only" />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center gap-4">
          {/* Temu ID搜索（组合组件：下拉+输入框融合） */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground min-w-[70px]">Temu ID：</span>
            <div className="flex h-10 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
              <select
                className="h-full px-3 text-sm bg-transparent border-r border-input rounded-l-md focus:outline-none w-24"
                value={temuIdType}
                onChange={(e) => setTemuIdType(e.target.value as 'spu' | 'skc' | 'sku' | 'skcExtCode')}
              >
                <option value="spu">SPU</option>
                <option value="skc">SKC</option>
                <option value="sku">SKU</option>
                <option value="skcExtCode">货号</option>
              </select>
              <input
                type="text"
                placeholder="输入ID，多个用逗号分隔"
                value={temuIdValue}
                onChange={(e) => setTemuIdValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="h-full px-3 text-sm bg-transparent border-0 focus:outline-none w-56 rounded-r-md"
              />
            </div>
          </div>
          <Button onClick={handleSearch} disabled={loadingRecords}>
            <Search className="w-4 h-4 mr-2" />
            查询
          </Button>
          {isEmbedded && (
            <Button variant="outline" size="sm" onClick={() => fetchEnrollRecords(currentPage)} disabled={loadingRecords}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingRecords ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          )}
        </div>
      </div>

      {/* 统计 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          共 <span className="font-medium text-foreground">{totalRecords.toLocaleString()}</span> 条记录
          {totalPages > 0 && <span className="ml-2">（第 {currentPage}/{totalPages} 页）</span>}
        </div>
      </div>

      {/* 表格（按截图结构） */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[200px]">商品信息</TableHead>
              <TableHead className="w-[100px]">报名站点</TableHead>
              <TableHead className="w-[100px]">日常申报价</TableHead>
              <TableHead className="w-[120px]">活动申报价/折扣率</TableHead>
              <TableHead className="w-[160px]">提交时间</TableHead>
              <TableHead className="w-[100px]">活动类型</TableHead>
              <TableHead className="min-w-[200px]">报名结果</TableHead>
              <TableHead className="w-[120px]">场次共用活动库存</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingRecords ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    加载中...
                  </div>
                </TableCell>
              </TableRow>
            ) : enrollRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-8 h-8" />
                    暂无报名记录
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enrollRecords.map((record, index) => {
                const firstSkc = record.skcList?.[0];
                const firstSession = record.assignSessionList?.[0];
                const siteName = firstSession?.siteName || '-';
                const enrollStatusInfo = getEnrollStatusInfo(record.enrollStatus);

                return (
                  <TableRow key={`${record.enrollId || record.productId}-${index}`}>
                    {/* 商品信息 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">SPU ID: {record.productId}</div>
                        <div className="text-xs text-muted-foreground">经营站点: {siteName}</div>
                      </div>
                    </TableCell>

                    {/* 报名站点 */}
                    <TableCell className="text-sm">{siteName}</TableCell>

                    {/* 日常申报价 */}
                    <TableCell className="text-sm">
                      {firstSkc?.dailyPrice ? `¥${formatPrice(firstSkc.dailyPrice)}` : '-'}
                    </TableCell>

                    {/* 活动申报价/折扣率 */}
                    <TableCell className="text-sm">
                      {firstSkc?.activityPrice ? `¥${formatPrice(firstSkc.activityPrice)}` : '-'}
                    </TableCell>

                    {/* 提交时间 */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(record.enrollTime)}
                    </TableCell>

                    {/* 活动类型 */}
                    <TableCell className="text-sm">
                      {record.activityTypeName || ActivityTypeNames[record.activityType] || '-'}
                    </TableCell>

                    {/* 报名结果 */}
                    <TableCell>
                      <div className="space-y-1">
                        {firstSession && (
                          <div className="text-sm">{firstSession.sessionName}</div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-medium ${enrollStatusInfo.className}`}>
                            • {enrollStatusInfo.text}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* 场次共用活动库存 */}
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>提报: {record.activityStock ?? '-'}</div>
                        <div>剩余: {record.remainingActivityStock ?? '-'}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} 条
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleFirstPage} disabled={currentPage <= 1 || loadingRecords} title="第一页">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1 || loadingRecords} title="上一页">
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {renderPaginationButtons().map((page, index) => (
              typeof page === 'number' ? (
                <Button
                  key={index}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageJump(page)}
                  disabled={loadingRecords}
                  className="min-w-[36px]"
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2 text-muted-foreground">...</span>
              )
            ))}

            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages || loadingRecords} title="下一页">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLastPage} disabled={currentPage >= totalPages || loadingRecords} title="最后一页">
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
