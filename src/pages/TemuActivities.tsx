import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  Store,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { temuShopService, type TemuShop } from '@/services/temuShopService';
import { temuActivityService } from '@/services/temuActivityService';
import type { Activity, ActivityThematic, ActivityDetailResponse } from '@/types/temuActivity';
import { toast } from 'sonner';
import { TemuEnrollRecords } from './TemuEnrollRecords';



// 扁平化的活动项（用于表格展示）
interface FlattenedActivity {
  id: string;
  activityType: number;
  activityName: string;
  activityContent: string;
  thematicId?: number;
  thematicName?: string;
  benefitLabels: string[];
  activityLabelTag?: number | null;
  startTime?: number;
  endTime?: number;
  enrollDeadLine?: number;
  enrollStartAt?: number;
  durationDays?: number;
  sites?: { siteId: number; siteName: string }[];
  isLongTerm: boolean;
  canEnroll?: boolean;
}

// 格式化时间戳为日期字符串
const formatDate = (timestamp?: number): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
};

// 计算剩余天数
const getDaysRemaining = (deadline?: number): number | null => {
  if (!deadline) return null;
  const now = Date.now();
  const diff = deadline - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// 获取活动标签类型
const getActivityLabelType = (tag?: number | null): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
  switch (tag) {
    case 1:
      return { text: 'New', variant: 'default' };
    case 6:
      return { text: '限时', variant: 'destructive' };
    default:
      return null;
  }
};

export function TemuActivities() {
  const navigate = useNavigate();

  // 店铺相关状态
  const [shops, setShops] = useState<TemuShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [loadingShops, setLoadingShops] = useState(true);

  // 活动列表状态
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // 筛选状态
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [thematicTypeFilter, setThematicTypeFilter] = useState<string>('all');

  // 从活动数据动态生成活动类型筛选器
  const activityTypeFilters = useMemo(() => {
    const types = new Map<number, string>();
    activities.forEach((activity) => {
      if (!types.has(activity.activityType)) {
        types.set(activity.activityType, activity.activityName);
      }
    });
    const filters = [{ value: 'all', label: '全部' }];
    types.forEach((name, type) => {
      filters.push({ value: String(type), label: name });
    });
    return filters;
  }, [activities]);

  // 从活动数据动态生成主题类型筛选器
  const thematicTypeFilters = useMemo(() => {
    const thematics = new Set<string>();
    activities.forEach((activity) => {
      if (activity.thematicList && activity.thematicList.length > 0) {
        activity.thematicList.forEach((thematic: ActivityThematic) => {
          const name = thematic.activityThematicName;
          // 提取【xxx】格式的分类
          const match = name.match(/【([^】]+)】/);
          if (match) {
            thematics.add(match[1]); // 提取括号内的分类名
          } else if (name.includes('周中快闪')) {
            thematics.add('周中快闪');
          }
        });
      }
    });
    const filters = [{ value: 'all', label: '全部' }];
    // 添加长期活动选项
    const hasLongTerm = activities.some(a => !a.thematicList || a.thematicList.length === 0);
    if (hasLongTerm) {
      filters.push({ value: 'longterm', label: '长期活动' });
    }
    thematics.forEach((name) => {
      filters.push({ value: name, label: name });
    });
    return filters;
  }, [activities]);

  // 站点详情弹窗
  const [showSitesDialog, setShowSitesDialog] = useState(false);
  const [selectedSites, setSelectedSites] = useState<{ siteId: number; siteName: string }[]>([]);

  // 活动详情抽屉
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<FlattenedActivity | null>(null);
  const [activityDetail, setActivityDetail] = useState<ActivityDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 加载店铺列表
  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      const response = await temuShopService.getAllShops(true);
      setShops(response.shops);
      if (response.shops.length > 0 && !selectedShopId) {
        setSelectedShopId(response.shops[0].id);
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      toast.error('获取店铺列表失败');
    } finally {
      setLoadingShops(false);
    }
  };

  // 加载活动列表
  const fetchActivities = async () => {
    if (!selectedShopId) {
      return;
    }
    try {
      setLoadingActivities(true);
      const response = await temuActivityService.getActivityList({ shopId: selectedShopId });
      setActivities(response.activityList || []);
    } catch (error) {
      console.error('获取活动列表失败:', error);
      toast.error('获取活动列表失败');
    } finally {
      setLoadingActivities(false);
    }
  };

  // 扁平化活动列表（将嵌套的 thematicList 展开）
  const flattenedActivities = useMemo((): FlattenedActivity[] => {
    const result: FlattenedActivity[] = [];

    activities.forEach((activity) => {
      if (activity.thematicList && activity.thematicList.length > 0) {
        // 有主题列表，为每个主题创建一行
        activity.thematicList.forEach((thematic: ActivityThematic) => {
          result.push({
            id: `${activity.activityType}-${thematic.activityThematicId}`,
            activityType: activity.activityType,
            activityName: activity.activityName,
            activityContent: activity.activityContent,
            thematicId: thematic.activityThematicId,
            thematicName: thematic.activityThematicName,
            benefitLabels: thematic.benefitLabelName || activity.benefitLabelName || [],
            activityLabelTag: thematic.activityLabelTag,
            startTime: thematic.startTime,
            endTime: thematic.endTime,
            enrollDeadLine: thematic.enrollDeadLine,
            enrollStartAt: thematic.enrollStartAt,
            durationDays: thematic.durationDays,
            sites: thematic.sites,
            isLongTerm: false,
            canEnroll: activity.canEnroll,
          });
        });
      } else {
        // 没有主题列表，作为长期活动
        result.push({
          id: `${activity.activityType}-longterm`,
          activityType: activity.activityType,
          activityName: activity.activityName,
          activityContent: activity.activityContent,
          benefitLabels: activity.benefitLabelName || [],
          activityLabelTag: activity.activityLabelTag,
          isLongTerm: true,
          canEnroll: activity.canEnroll,
        });
      }
    });

    return result;
  }, [activities]);

  // 根据筛选条件过滤活动
  const filteredActivities = useMemo(() => {
    return flattenedActivities.filter((activity) => {
      // 活动类型筛选
      if (activityTypeFilter !== 'all') {
        if (String(activity.activityType) !== activityTypeFilter) {
          return false;
        }
      }

      // 主题类型筛选
      if (thematicTypeFilter !== 'all') {
        if (thematicTypeFilter === 'longterm') {
          if (!activity.isLongTerm) return false;
        } else {
          // 按【分类名】格式筛选，或按关键词筛选
          const name = activity.thematicName || '';
          const hasCategory = name.includes(`【${thematicTypeFilter}】`);
          const hasKeyword = name.includes(thematicTypeFilter);
          if (!hasCategory && !hasKeyword) {
            return false;
          }
        }
      }

      return true;
    });
  }, [flattenedActivities, activityTypeFilter, thematicTypeFilter]);

  // 从活动主题名称中提取分类
  const getCategoryFromThematic = (thematicName?: string): string => {
    if (!thematicName) return '长期活动';
    const match = thematicName.match(/【([^】]+)】/);
    if (match) return match[1];
    if (thematicName.includes('周中快闪')) return '周中快闪';
    return '其他活动';
  };

  // 按类别分组活动
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, FlattenedActivity[]>();

    filteredActivities.forEach((activity) => {
      const category = activity.isLongTerm
        ? '长期活动'
        : getCategoryFromThematic(activity.thematicName);

      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(activity);
    });

    // 转换为数组并排序（长期活动放第一个）
    const result = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === '长期活动') return -1;
      if (b[0] === '长期活动') return 1;
      return a[0].localeCompare(b[0]);
    });

    return result;
  }, [filteredActivities]);

  // 查看站点详情
  const handleViewSites = (sites?: { siteId: number; siteName: string }[]) => {
    if (sites && sites.length > 0) {
      setSelectedSites(sites);
      setShowSitesDialog(true);
    }
  };

  // 报名按钮点击 - 获取活动详情并打开抽屉
  const handleEnroll = async (activity: FlattenedActivity) => {
    setSelectedActivity(activity);
    setShowDetailSheet(true);
    setLoadingDetail(true);
    setActivityDetail(null);

    try {
      const response = await temuActivityService.getActivityDetail({
        shopId: selectedShopId,
        activityType: activity.activityType as 1 | 5 | 13 | 27 | 101,
        activityThematicId: activity.thematicId,
      });
      setActivityDetail(response);
    } catch (error) {
      console.error('获取活动详情失败:', error);
      toast.error('获取活动详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // 当店铺变化时重新获取活动列表
  useEffect(() => {
    if (selectedShopId) {
      fetchActivities();
    }
  }, [selectedShopId]);

  return (
    <div className="flex-1 p-6 bg-background">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">营销活动</h1>
          <p className="text-muted-foreground">Temu 平台营销活动管理</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          disabled={loadingActivities}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingActivities ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 店铺平铺选择 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-sm text-muted-foreground mr-2">店铺:</span>
        {loadingShops ? (
          <span className="text-sm text-muted-foreground">加载中...</span>
        ) : (
          shops.map((shop) => (
            <Button
              key={shop.id}
              variant={selectedShopId === shop.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedShopId(shop.id)}
              className="h-8"
            >
              {shop.name}
            </Button>
          ))
        )}
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">营销活动首页</TabsTrigger>
          <TabsTrigger value="records">报名记录</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-6">
          {/* 活动列表区域 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full"></span>
              活动列表
            </h2>

            {/* 筛选条件 */}
            <div className="space-y-3 py-2">
              {/* 活动类型筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[70px]">活动类型：</span>
                <RadioGroup
                  value={activityTypeFilter}
                  onValueChange={setActivityTypeFilter}
                  className="flex flex-wrap gap-1"
                >
                  {activityTypeFilters.map((filter) => (
                    <Label
                      key={filter.value}
                      htmlFor={`activity-${filter.value}`}
                      className={`cursor-pointer px-3 py-1 rounded-full text-sm transition-colors ${
                        activityTypeFilter === filter.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <RadioGroupItem
                        value={filter.value}
                        id={`activity-${filter.value}`}
                        className="sr-only"
                      />
                      {filter.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* 主题类型筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground min-w-[70px]">主题类型：</span>
                <RadioGroup
                  value={thematicTypeFilter}
                  onValueChange={setThematicTypeFilter}
                  className="flex flex-wrap gap-1"
                >
                  {thematicTypeFilters.map((filter) => (
                    <Label
                      key={filter.value}
                      htmlFor={`thematic-${filter.value}`}
                      className={`cursor-pointer px-3 py-1 rounded-full text-sm transition-colors ${
                        thematicTypeFilter === filter.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <RadioGroupItem
                        value={filter.value}
                        id={`thematic-${filter.value}`}
                        className="sr-only"
                      />
                      {filter.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* 活动数量统计 */}
            <div className="text-sm text-muted-foreground text-right">
              符合条件的活动数量：<span className="font-medium text-foreground">{filteredActivities.length}</span>
            </div>

            {/* 活动表格 */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[300px]">活动主题</TableHead>
                    <TableHead className="w-[200px]">活动时间 UTC+8（北京）</TableHead>
                    <TableHead className="w-[150px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingActivities ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          加载中...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <AlertCircle className="w-8 h-8" />
                          暂无符合条件的活动
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedActivities.map(([category, groupActivities]) => (
                      <React.Fragment key={`group-${category}`}>
                        {/* 分组标题行 */}
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell colSpan={3} className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {groupActivities.length} 个活动
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* 分组内的活动 */}
                        {groupActivities.map((activity) => {
                          const daysRemaining = getDaysRemaining(activity.enrollDeadLine);
                          const labelType = getActivityLabelType(activity.activityLabelTag);

                          return (
                            <TableRow key={activity.id} className="hover:bg-muted/20">
                              <TableCell className="pl-6">
                                <div className="space-y-1">
                                  {/* 活动名称行 */}
                                  {!activity.thematicName && (
                                    <div className="font-medium">{activity.activityName}</div>
                                  )}
                                  {/* 主题名称行 */}
                                  {activity.thematicName && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{activity.thematicName}</span>
                                      {labelType && (
                                        <Badge variant={labelType.variant} className="text-xs">
                                          {labelType.text}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {/* 权益标签 */}
                                  {activity.benefitLabels.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {activity.benefitLabels.slice(0, 2).map((label, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                                          {label}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {activity.isLongTerm ? (
                                  <span className="text-muted-foreground">长期有效</span>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="text-sm">
                                      {formatDate(activity.startTime)}~{formatDate(activity.endTime)}
                                      {activity.durationDays && (
                                        <span className="text-muted-foreground ml-1">
                                          ({activity.durationDays}天)
                                        </span>
                                      )}
                                    </div>
                                    {activity.sites && activity.sites.length > 0 && (
                                      <Button
                                        variant="link"
                                        className="p-0 h-auto text-xs text-primary"
                                        onClick={() => handleViewSites(activity.sites)}
                                      >
                                        查看站点时间
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => handleEnroll(activity)}
                                  >
                                    报名
                                  </Button>
                                  {daysRemaining !== null && daysRemaining <= 40 && (
                                    <span className={`text-xs ${daysRemaining <= 7 ? 'text-destructive' : 'text-orange-500'}`}>
                                      {daysRemaining}天后截止
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <TemuEnrollRecords shopId={selectedShopId} />
        </TabsContent>
      </Tabs>

      {/* 站点详情弹窗 */}
      <Dialog open={showSitesDialog} onOpenChange={setShowSitesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>站点时间</DialogTitle>
            <DialogDescription>
              该活动覆盖 {selectedSites.length} 个站点
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {selectedSites.map((site) => (
                <div
                  key={site.siteId}
                  className="px-3 py-2 bg-muted rounded-md text-sm"
                >
                  {site.siteName}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 活动详情抽屉 */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-[720px] sm:max-w-[720px] p-0 flex flex-col">
          {/* 顶部标题区域 */}
          <div className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <SheetTitle className="text-xl mb-2">
              {selectedActivity?.activityName || '活动详情'}
            </SheetTitle>
            {selectedActivity?.thematicName && (
              <SheetDescription className="text-base text-foreground/80">
                {selectedActivity.thematicName}
              </SheetDescription>
            )}
            {/* 权益标签 */}
            {selectedActivity?.benefitLabels && selectedActivity.benefitLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedActivity.benefitLabels.map((label, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 滚动内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">加载活动详情...</span>
              </div>
            ) : activityDetail ? (
              <div className="space-y-6">
                {/* 活动基本信息卡片 */}
                {selectedActivity && (
                  <Card className="border-none shadow-sm bg-muted/30">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="text-muted-foreground">活动类型</div>
                          <div className="font-medium">{selectedActivity.activityName}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">活动时间</div>
                          <div className="font-medium">
                            {selectedActivity.isLongTerm
                              ? '长期有效'
                              : `${formatDate(selectedActivity.startTime)} ~ ${formatDate(selectedActivity.endTime)}`
                            }
                          </div>
                        </div>
                        {selectedActivity.enrollDeadLine && !selectedActivity.isLongTerm && (
                          <div className="space-y-1">
                            <div className="text-muted-foreground">报名截止</div>
                            <div className="font-medium text-orange-600">{formatDate(selectedActivity.enrollDeadLine)}</div>
                          </div>
                        )}
                        {selectedActivity.durationDays && (
                          <div className="space-y-1">
                            <div className="text-muted-foreground">活动时长</div>
                            <div className="font-medium">{selectedActivity.durationDays} 天</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 店铺资格要求 */}
                {activityDetail.mallAptitude && activityDetail.mallAptitude.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary" />
                      店铺资格要求
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[180px]">要求类型</TableHead>
                            <TableHead>要求说明</TableHead>
                            <TableHead className="w-[100px] text-center">是否符合</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityDetail.mallAptitude.map((req, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{req.requirementType}</TableCell>
                              <TableCell
                                className="text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
                                dangerouslySetInnerHTML={{ __html: req.requirementDesc }}
                              />
                              <TableCell className="text-center">
                                {req.checkStatus === 1 ? (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    符合
                                  </span>
                                ) : req.checkStatus === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-red-600">
                                    <XCircle className="w-4 h-4" />
                                    不符合
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">{req.checkStatusDesc}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* 商品资格要求 */}
                {activityDetail.requirements && activityDetail.requirements.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      商品资格要求
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[180px]">要求类型</TableHead>
                            <TableHead>要求说明</TableHead>
                            <TableHead className="w-[140px] text-center">是否符合</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityDetail.requirements.map((req, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{req.requirementType}</TableCell>
                              <TableCell
                                className="text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
                                dangerouslySetInnerHTML={{ __html: req.requirementDesc }}
                              />
                              <TableCell className="text-center">
                                {req.checkStatus === 1 ? (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    符合
                                  </span>
                                ) : req.checkStatus === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-red-600">
                                    <XCircle className="w-4 h-4" />
                                    不符合
                                  </span>
                                ) : req.checkStatus === 2 ? (
                                  <span className="text-blue-600 text-sm">报名时检测</span>
                                ) : req.checkStatus === 3 ? (
                                  <span className="text-orange-600 text-sm">自动过滤</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">{req.checkStatusDesc}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-3" />
                <span>暂无活动详情</span>
              </div>
            )}
          </div>

          {/* 底部固定按钮 */}
          {activityDetail && selectedActivity && (
            <div className="p-4 border-t bg-background">
              <Button
                className="w-full h-11 text-base"
                onClick={() => {
                  const params = new URLSearchParams({
                    shopId: selectedShopId,
                    activityType: String(selectedActivity.activityType),
                    activityName: selectedActivity.activityName || selectedActivity.thematicName || '',
                  });
                  if (selectedActivity.thematicId) {
                    params.set('activityThematicId', String(selectedActivity.thematicId));
                  }
                  navigate(`/workspace/temu-activities/enroll?${params.toString()}`);
                }}
              >
                报名
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
