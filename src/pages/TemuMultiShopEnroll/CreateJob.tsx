import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Settings, AlertTriangle } from 'lucide-react';
import { temuShopService } from '@/services/temuShopService';
import {
  temuMultiShopEnrollService,
  type ShopActivity,
  type ShopSession,
  type ShopEnrollConfig,
  PRICE_STRATEGY,
  STOCK_STRATEGY,
  PRICE_STRATEGY_OPTIONS,
  STOCK_STRATEGY_OPTIONS,
} from '@/services/temuMultiShopEnrollService';
import { toast } from 'sonner';

// 店铺配置行
interface ShopConfigRow {
  id: string;
  shopId: string;
  shopName: string;
  selected: boolean;
  activityType?: number;
  activityName?: string;
  thematicId?: number;
  thematicName?: string;
  sessionIds: number[];
  sessionNames: string[];
  // 加载状态
  loadingActivities: boolean;
  loadingSessions: boolean;
  // 可选项
  activities: ShopActivity[];
  sessions: ShopSession[];
}

export function CreateJob() {
  const navigate = useNavigate();
  const [shopConfigs, setShopConfigs] = useState<ShopConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 策略配置
  const [priceStrategy, setPriceStrategy] = useState<string>(PRICE_STRATEGY.SUGGEST);
  const [priceValue, setPriceValue] = useState<string>('');
  const [stockStrategy, setStockStrategy] = useState<string>(STOCK_STRATEGY.SUGGEST);
  const [stockValue, setStockValue] = useState<string>('');

  // 场次选择弹窗
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [currentEditingShop, setCurrentEditingShop] = useState<ShopConfigRow | null>(null);
  const [tempSelectedSessions, setTempSelectedSessions] = useState<number[]>([]);
  const [sessionSiteFilter, setSessionSiteFilter] = useState<string>('all');

  // 批量配置弹窗
  const [batchConfigDialogOpen, setBatchConfigDialogOpen] = useState(false);
  const [batchConfigLoading, setBatchConfigLoading] = useState(false);
  const [batchActivityType, setBatchActivityType] = useState<number | undefined>();
  const [batchThematicId, setBatchThematicId] = useState<number | undefined>();
  const [batchSessionIds, setBatchSessionIds] = useState<number[]>([]);
  const [batchAvailableActivities, setBatchAvailableActivities] = useState<ShopActivity[]>([]);
  const [batchAvailableSessions, setBatchAvailableSessions] = useState<ShopSession[]>([]);
  const [batchLoadingSessions, setBatchLoadingSessions] = useState(false);
  const [batchSessionSiteFilter, setBatchSessionSiteFilter] = useState<string>('all');
  // 批量配置应用进度
  const [batchApplying, setBatchApplying] = useState(false);
  const [batchApplyProgress, setBatchApplyProgress] = useState({ success: 0, fail: 0, total: 0 });
  const [batchApplyFailures, setBatchApplyFailures] = useState<{ shopName: string; reason: string }[]>([]);
  const [batchApplyDone, setBatchApplyDone] = useState(false);
  const [batchSourceShopId, setBatchSourceShopId] = useState<string | null>(null); // 源店铺ID，复制配置时排除

  // 场次站点列表（从当前店铺的场次中提取）
  const sessionSiteList = useMemo(() => {
    if (!currentEditingShop) return [];
    const siteMap = new Map<number, string>();
    currentEditingShop.sessions.forEach(s => {
      if (s.siteId && s.siteName) {
        siteMap.set(s.siteId, s.siteName);
      }
    });
    return Array.from(siteMap.entries()).map(([id, name]) => ({ id, name }));
  }, [currentEditingShop]);

  // 根据站点筛选后的场次
  const filteredSessions = useMemo(() => {
    if (!currentEditingShop) return [];
    if (sessionSiteFilter === 'all') return currentEditingShop.sessions;
    return currentEditingShop.sessions.filter(s => String(s.siteId) === sessionSiteFilter);
  }, [currentEditingShop, sessionSiteFilter]);

  // 获取场次状态标签
  const getSessionStatusLabel = (startTime: number, endTime: number) => {
    const now = Date.now();
    if (now < startTime) return { text: '未开始', color: 'text-orange-500', dot: 'bg-orange-500' };
    if (now >= startTime && now <= endTime) return { text: '进行中', color: 'text-blue-500', dot: 'bg-blue-500' };
    return { text: '已结束', color: 'text-gray-500', dot: 'bg-gray-500' };
  };

  // 全选/取消全选场次
  const handleSelectAllSessions = (checked: boolean) => {
    if (checked) {
      setTempSelectedSessions(filteredSessions.map(s => s.sessionId));
    } else {
      setTempSelectedSessions([]);
    }
  };

  const isAllSessionsSelected = filteredSessions.length > 0 &&
    filteredSessions.every(s => tempSelectedSessions.includes(s.sessionId));

  // 批量配置 - 场次站点列表
  const batchSessionSiteList = useMemo(() => {
    const siteMap = new Map<number, string>();
    batchAvailableSessions.forEach(s => {
      if (s.siteId && s.siteName) {
        siteMap.set(s.siteId, s.siteName);
      }
    });
    return Array.from(siteMap.entries()).map(([id, name]) => ({ id, name }));
  }, [batchAvailableSessions]);

  // 批量配置 - 根据站点筛选后的场次
  const batchFilteredSessions = useMemo(() => {
    if (batchSessionSiteFilter === 'all') return batchAvailableSessions;
    return batchAvailableSessions.filter(s => String(s.siteId) === batchSessionSiteFilter);
  }, [batchAvailableSessions, batchSessionSiteFilter]);

  // 批量配置 - 全选状态
  const isBatchAllSessionsSelected = batchFilteredSessions.length > 0 &&
    batchFilteredSessions.every(s => batchSessionIds.includes(s.sessionId));

  // 批量配置 - 当前选中的活动
  const batchSelectedActivity = useMemo(() => {
    return batchAvailableActivities.find(a => a.activityType === batchActivityType);
  }, [batchAvailableActivities, batchActivityType]);

  // 加载店铺列表并初始化配置
  useEffect(() => {
    const loadShops = async () => {
      try {
        const response = await temuShopService.getAllShops(true);
        const shops = response.shops || [];
        // 直接将所有店铺初始化为配置行
        const configs: ShopConfigRow[] = shops.map(shop => ({
          id: shop.id,
          shopId: shop.id,
          shopName: shop.name,
          selected: false,
          sessionIds: [],
          sessionNames: [],
          loadingActivities: false,
          loadingSessions: false,
          activities: [],
          sessions: [],
        }));
        setShopConfigs(configs);
      } catch (error) {
        console.error('Failed to load shops:', error);
        toast.error('加载店铺列表失败');
      } finally {
        setLoading(false);
      }
    };
    loadShops();
  }, []);

  // 切换店铺选中状态
  const handleToggleShop = async (rowId: string, checked: boolean) => {
    setShopConfigs(prev => prev.map(c =>
      c.id === rowId ? { ...c, selected: checked } : c
    ));

    // 如果选中且还没加载活动，则加载
    if (checked) {
      const config = shopConfigs.find(c => c.id === rowId);
      if (config && config.activities.length === 0) {
        loadShopActivities(rowId);
      }
    }
  };

  // 全选/取消全选
  const handleToggleAll = (checked: boolean) => {
    setShopConfigs(prev => prev.map(c => ({ ...c, selected: checked })));

    // 如果全选，加载所有未加载活动的店铺
    if (checked) {
      shopConfigs.forEach(config => {
        if (config.activities.length === 0) {
          loadShopActivities(config.id);
        }
      });
    }
  };

  // 加载店铺活动
  const loadShopActivities = async (rowId: string) => {
    const config = shopConfigs.find(c => c.id === rowId);
    if (!config) return;

    setShopConfigs(prev => prev.map(c =>
      c.id === rowId ? { ...c, loadingActivities: true } : c
    ));

    try {
      const response = await temuMultiShopEnrollService.getShopActivities(config.shopId);
      setShopConfigs(prev => prev.map(c =>
        c.id === rowId ? {
          ...c,
          loadingActivities: false,
          activities: response.activities || [],
        } : c
      ));
    } catch (error) {
      console.error('Failed to load activities:', error);
      setShopConfigs(prev => prev.map(c =>
        c.id === rowId ? { ...c, loadingActivities: false } : c
      ));
    }
  };

  // 选择活动类型
  const handleSelectActivityType = async (rowId: string, activityType: number) => {
    const config = shopConfigs.find(c => c.id === rowId);
    if (!config) return;

    const activity = config.activities.find(a => a.activityType === activityType);
    const hasThematics = activity && activity.thematics.length > 0;

    setShopConfigs(prev => prev.map(c =>
      c.id === rowId ? {
        ...c,
        activityType,
        activityName: activity?.activityName,
        thematicId: undefined,
        thematicName: undefined,
        sessionIds: [],
        sessionNames: [],
        sessions: [],
        loadingSessions: !hasThematics, // 如果没有专场，开始加载场次
      } : c
    ));

    // 如果没有专场，直接加载场次
    if (!hasThematics) {
      try {
        const response = await temuMultiShopEnrollService.getShopSessions(
          config.shopId,
          activityType,
          undefined // 没有专场ID
        );
        setShopConfigs(prev => prev.map(c =>
          c.id === rowId ? {
            ...c,
            loadingSessions: false,
            sessions: response.sessions || [],
          } : c
        ));
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setShopConfigs(prev => prev.map(c =>
          c.id === rowId ? { ...c, loadingSessions: false } : c
        ));
      }
    }
  };

  // 选择专场
  const handleSelectThematic = async (rowId: string, thematicId: number) => {
    const config = shopConfigs.find(c => c.id === rowId);
    if (!config) return;

    const activity = config.activities.find(a => a.activityType === config.activityType);
    const thematic = activity?.thematics.find(t => t.thematicId === thematicId);

    setShopConfigs(prev => prev.map(c =>
      c.id === rowId ? {
        ...c,
        thematicId,
        thematicName: thematic?.thematicName,
        sessionIds: [],
        sessionNames: [],
        loadingSessions: true,
      } : c
    ));

    // 加载场次
    try {
      const response = await temuMultiShopEnrollService.getShopSessions(
        config.shopId,
        config.activityType!,
        thematicId
      );
      setShopConfigs(prev => prev.map(c =>
        c.id === rowId ? {
          ...c,
          loadingSessions: false,
          sessions: response.sessions || [],
        } : c
      ));
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setShopConfigs(prev => prev.map(c =>
        c.id === rowId ? { ...c, loadingSessions: false } : c
      ));
    }
  };

  // 打开场次选择弹窗
  const handleOpenSessionDialog = (config: ShopConfigRow) => {
    setCurrentEditingShop(config);
    setTempSelectedSessions([...config.sessionIds]);
    setSessionSiteFilter('all'); // 重置站点筛选
    setSessionDialogOpen(true);
  };

  // 确认场次选择
  const handleConfirmSessions = () => {
    if (!currentEditingShop) return;

    const selectedSessionNames = currentEditingShop.sessions
      .filter(s => tempSelectedSessions.includes(s.sessionId))
      .map(s => s.sessionName);

    setShopConfigs(prev => prev.map(c =>
      c.id === currentEditingShop.id ? {
        ...c,
        sessionIds: tempSelectedSessions,
        sessionNames: selectedSessionNames,
      } : c
    ));

    setSessionDialogOpen(false);
    setCurrentEditingShop(null);
  };

  // 复制配置到其他选中的店铺
  const handleCopyConfigToOthers = async (sourceConfig: ShopConfigRow) => {
    const otherSelectedShops = shopConfigs.filter(c => c.selected && c.id !== sourceConfig.id);
    if (otherSelectedShops.length === 0) {
      toast.error('没有其他选中的店铺');
      return;
    }

    // 记录源店铺ID
    setBatchSourceShopId(sourceConfig.id);

    // 直接使用源店铺的配置打开弹窗
    setBatchConfigDialogOpen(true);
    setBatchConfigLoading(false);
    setBatchActivityType(sourceConfig.activityType);
    setBatchThematicId(sourceConfig.thematicId);
    setBatchSessionIds([...sourceConfig.sessionIds]);
    setBatchAvailableSessions([...sourceConfig.sessions]);
    setBatchSessionSiteFilter('all');

    // 设置可用活动为源店铺的活动
    setBatchAvailableActivities([...sourceConfig.activities]);
  };

  // 批量配置 - 选择活动类型
  const handleBatchSelectActivityType = async (activityType: number) => {
    setBatchActivityType(activityType);
    setBatchThematicId(undefined);
    setBatchSessionIds([]);
    setBatchAvailableSessions([]);
    setBatchSessionSiteFilter('all');

    const activity = batchAvailableActivities.find(a => a.activityType === activityType);
    const hasThematics = activity && activity.thematics.length > 0;

    // 如果没有专场，直接加载场次（使用第一个选中店铺）
    if (!hasThematics) {
      setBatchLoadingSessions(true);
      try {
        const firstSelectedShop = shopConfigs.find(c => c.selected);
        if (firstSelectedShop) {
          const response = await temuMultiShopEnrollService.getShopSessions(
            firstSelectedShop.shopId,
            activityType,
            undefined
          );
          setBatchAvailableSessions(response.sessions || []);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setBatchLoadingSessions(false);
      }
    }
  };

  // 批量配置 - 选择专场
  const handleBatchSelectThematic = async (thematicId: number) => {
    setBatchThematicId(thematicId);
    setBatchSessionIds([]);
    setBatchAvailableSessions([]);
    setBatchSessionSiteFilter('all');
    setBatchLoadingSessions(true);

    try {
      const firstSelectedShop = shopConfigs.find(c => c.selected);
      if (firstSelectedShop && batchActivityType) {
        const response = await temuMultiShopEnrollService.getShopSessions(
          firstSelectedShop.shopId,
          batchActivityType,
          thematicId
        );
        setBatchAvailableSessions(response.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setBatchLoadingSessions(false);
    }
  };

  // 批量配置 - 全选/取消全选场次
  const handleBatchSelectAllSessions = (checked: boolean) => {
    if (checked) {
      setBatchSessionIds(batchFilteredSessions.map(s => s.sessionId));
    } else {
      setBatchSessionIds([]);
    }
  };

  // 批量配置 - 确认应用
  const handleConfirmBatchConfig = async () => {
    if (!batchActivityType || batchSessionIds.length === 0) {
      toast.error('请选择活动类型和场次');
      return;
    }

    // 排除源店铺，只应用到其他选中的店铺
    const selectedShops = shopConfigs.filter(c => c.selected && c.id !== batchSourceShopId);
    const failedShopIds: string[] = [];
    const failures: { shopName: string; reason: string }[] = [];

    // 初始化进度
    setBatchApplying(true);
    setBatchApplyDone(false);
    setBatchApplyFailures([]);
    setBatchApplyProgress({ success: 0, fail: 0, total: selectedShops.length });

    // 为每个选中的店铺应用配置
    for (const shop of selectedShops) {
      try {
        // 检查店铺是否支持该活动类型
        let activities = shop.activities;
        if (activities.length === 0) {
          const response = await temuMultiShopEnrollService.getShopActivities(shop.shopId);
          activities = response.activities || [];
        }

        const activity = activities.find(a => a.activityType === batchActivityType);
        if (!activity) {
          failedShopIds.push(shop.id);
          failures.push({ shopName: shop.shopName, reason: '不支持该活动类型' });
          setBatchApplyProgress(prev => ({ ...prev, fail: prev.fail + 1 }));
          continue;
        }

        // 检查专场
        const hasThematics = activity.thematics.length > 0;
        if (hasThematics && batchThematicId) {
          const thematic = activity.thematics.find(t => t.thematicId === batchThematicId);
          if (!thematic) {
            failedShopIds.push(shop.id);
            failures.push({ shopName: shop.shopName, reason: '不支持该专场' });
            setBatchApplyProgress(prev => ({ ...prev, fail: prev.fail + 1 }));
            continue;
          }
        }

        // 获取店铺的场次列表
        const sessionsResponse = await temuMultiShopEnrollService.getShopSessions(
          shop.shopId,
          batchActivityType,
          batchThematicId
        );
        const shopSessions = sessionsResponse.sessions || [];

        // 匹配场次（按站点ID匹配）
        const matchedSessionIds: number[] = [];
        const matchedSessionNames: string[] = [];

        for (const batchSessionId of batchSessionIds) {
          const batchSession = batchAvailableSessions.find(s => s.sessionId === batchSessionId);
          if (!batchSession) continue;

          // 找到相同站点的场次
          const matchedSession = shopSessions.find(s => s.siteId === batchSession.siteId);
          if (matchedSession) {
            matchedSessionIds.push(matchedSession.sessionId);
            matchedSessionNames.push(matchedSession.sessionName);
          }
        }

        if (matchedSessionIds.length === 0) {
          failedShopIds.push(shop.id);
          failures.push({ shopName: shop.shopName, reason: '没有匹配的场次' });
          setBatchApplyProgress(prev => ({ ...prev, fail: prev.fail + 1 }));
          continue;
        }

        // 更新店铺配置
        const thematic = activity.thematics.find(t => t.thematicId === batchThematicId);
        setShopConfigs(prev => prev.map(c =>
          c.id === shop.id ? {
            ...c,
            activities,
            activityType: batchActivityType,
            activityName: activity.activityName,
            thematicId: batchThematicId,
            thematicName: thematic?.thematicName,
            sessions: shopSessions,
            sessionIds: matchedSessionIds,
            sessionNames: matchedSessionNames,
          } : c
        ));

        setBatchApplyProgress(prev => ({ ...prev, success: prev.success + 1 }));
      } catch (error) {
        console.error(`Failed to apply config to shop ${shop.shopId}:`, error);
        failedShopIds.push(shop.id);
        failures.push({ shopName: shop.shopName, reason: '网络错误' });
        setBatchApplyProgress(prev => ({ ...prev, fail: prev.fail + 1 }));
      }
    }

    // 取消失败店铺的选中状态
    if (failedShopIds.length > 0) {
      setShopConfigs(prev => prev.map(c =>
        failedShopIds.includes(c.id) ? { ...c, selected: false } : c
      ));
    }

    setBatchApplying(false);
    setBatchApplyDone(true);
    setBatchApplyFailures(failures);
    // 不自动关闭对话框，让用户查看结果
  };

  // 提交任务
  const handleSubmit = async () => {
    // 验证：只提交选中且配置完整的店铺
    const validConfigs = shopConfigs.filter(c =>
      c.selected && c.activityType && c.sessionIds.length > 0
    );

    if (validConfigs.length === 0) {
      toast.error('请至少选中一个店铺并配置活动和场次');
      return;
    }

    // 构建请求
    const shopConfigsReq: ShopEnrollConfig[] = validConfigs.map(c => ({
      shopId: c.shopId,
      activityType: c.activityType!,
      activityName: c.activityName,
      thematicId: c.thematicId,
      thematicName: c.thematicName,
      sessionIds: c.sessionIds,
      sessionNames: c.sessionNames,
    }));

    const request = {
      shopConfigs: shopConfigsReq,
      priceStrategy,
      priceValue: priceValue ? parseFloat(priceValue) : undefined,
      stockStrategy,
      stockValue: stockValue ? parseInt(stockValue) : undefined,
    };

    try {
      setSubmitting(true);
      const response = await temuMultiShopEnrollService.createJob(request);
      toast.success(`任务创建成功: ${response.name}`);
      navigate(`/workspace/temu-multi-shop-enroll/${response.jobId}`);
    } catch (error) {
      console.error('Failed to create job:', error);
      toast.error('创建任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 计算选中数量
  const selectedCount = shopConfigs.filter(c => c.selected).length;
  const allSelected = shopConfigs.length > 0 && shopConfigs.every(c => c.selected);

  // 找到第一个已配置完成的选中店铺（用于"应用到其他"功能）
  const configuredSelectedShop = shopConfigs.find(
    c => c.selected && c.activityType && c.sessionIds.length > 0
  );
  // 计算其他选中但【尚未配置完成】的店铺数量（配置完成后提示自动消失）
  const otherSelectedCount = shopConfigs.filter(
    c => c.selected && c.id !== configuredSelectedShop?.id && (!c.activityType || c.sessionIds.length === 0)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-xl font-semibold">新建批量报名任务</h1>
      </div>

      {/* 第一步：店铺配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            第一步：选择店铺并配置
            {selectedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (已选 {selectedCount} 个店铺)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => handleToggleAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">店铺名称</TableHead>
                  <TableHead className="w-[150px]">活动类型</TableHead>
                  <TableHead className="w-[200px]">活动专场</TableHead>
                  <TableHead className="w-[200px]">场次</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shopConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">暂无店铺</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  shopConfigs.map((config) => {
                    // 判断是否是第一个已配置完成的选中店铺
                    const isConfiguredShop = configuredSelectedShop?.id === config.id;
                    const showApplyHint = isConfiguredShop && otherSelectedCount > 0;

                    return (
                      <React.Fragment key={config.id}>
                        <TableRow className={config.selected ? 'bg-blue-50/50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={config.selected}
                              onCheckedChange={(checked) => handleToggleShop(config.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{config.shopName}</TableCell>
                          <TableCell>
                            {!config.selected ? (
                              <span className="text-muted-foreground">-</span>
                            ) : config.loadingActivities ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Select
                                value={config.activityType?.toString() || ''}
                                onValueChange={(v) => handleSelectActivityType(config.id, parseInt(v))}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="选择活动" />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.activities.map((activity) => (
                                    <SelectItem
                                      key={activity.activityType}
                                      value={activity.activityType.toString()}
                                    >
                                      {activity.activityName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (!config.selected) return <span className="text-muted-foreground">-</span>;
                              if (!config.activityType) return <span className="text-muted-foreground">-</span>;
                              const activity = config.activities.find(a => a.activityType === config.activityType);
                              if (!activity || activity.thematics.length === 0) {
                                return <span className="text-muted-foreground">无专场</span>;
                              }
                              return (
                                <Select
                                  value={config.thematicId?.toString() || ''}
                                  onValueChange={(v) => handleSelectThematic(config.id, parseInt(v))}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="选择专场" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {activity.thematics.map((thematic) => (
                                      <SelectItem
                                        key={thematic.thematicId}
                                        value={thematic.thematicId.toString()}
                                      >
                                        {thematic.thematicName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (!config.selected) return <span className="text-muted-foreground">-</span>;
                              if (config.loadingSessions) return <Loader2 className="h-4 w-4 animate-spin" />;
                              if (!config.activityType) return <span className="text-muted-foreground">-</span>;

                              const activity = config.activities.find(a => a.activityType === config.activityType);
                              const hasThematics = activity && activity.thematics.length > 0;

                              // 有专场但未选择专场时，不显示场次按钮
                              if (hasThematics && !config.thematicId) {
                                return <span className="text-muted-foreground">-</span>;
                              }

                              // 无专场或已选专场，显示场次选择按钮
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenSessionDialog(config)}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  {config.sessionIds.length > 0
                                    ? `已选 ${config.sessionIds.length} 个`
                                    : '选择场次'}
                                </Button>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                        {/* 在已配置的店铺行后显示提示条 */}
                        {showApplyHint && (
                          <TableRow className="bg-blue-50 hover:bg-blue-50">
                            <TableCell colSpan={5} className="py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-medium">
                                    {otherSelectedCount}
                                  </span>
                                  <span>个其他店铺已选中，可以应用相同的活动和场次配置</span>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleCopyConfigToOthers(config)}
                                >
                                  应用到其他店铺
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 第二步：策略配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">第二步：统一策略配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* 价格策略 */}
            <div>
              <Label className="mb-3 block">价格策略</Label>
              <RadioGroup value={priceStrategy} onValueChange={setPriceStrategy}>
                {PRICE_STRATEGY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={option.value} id={`price-${option.value}`} />
                    <Label htmlFor={`price-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                    {(option.value === PRICE_STRATEGY.DAILY_DISCOUNT ||
                      option.value === PRICE_STRATEGY.SUGGEST_DISCOUNT) &&
                      priceStrategy === option.value && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">打</span>
                          <Input
                            type="text"
                            className="w-16 h-8"
                            placeholder="9.5"
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">折</span>
                        </div>
                      )}
                    {(option.value === PRICE_STRATEGY.DAILY_REDUCE ||
                      option.value === PRICE_STRATEGY.SUGGEST_REDUCE) &&
                      priceStrategy === option.value && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">降</span>
                          <Input
                            type="text"
                            className="w-16 h-8"
                            placeholder="5"
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">元</span>
                        </div>
                      )}
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* 库存策略 */}
            <div>
              <Label className="mb-3 block">库存策略</Label>
              <RadioGroup value={stockStrategy} onValueChange={setStockStrategy}>
                {STOCK_STRATEGY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={option.value} id={`stock-${option.value}`} />
                    <Label htmlFor={`stock-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                    {option.value === STOCK_STRATEGY.MANUAL && stockStrategy === option.value && (
                      <Input
                        type="text"
                        className="w-20 h-8"
                        placeholder="30"
                        value={stockValue}
                        onChange={(e) => setStockValue(e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || selectedCount === 0}
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          开始批量报名
        </Button>
      </div>

      {/* 场次选择弹窗 */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              选择场次 - {currentEditingShop?.shopName}
            </DialogTitle>
          </DialogHeader>

          {/* 提示信息 */}
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>每个商品仅可报名其已加站站点下的场次</span>
          </div>

          {/* 站点Tab筛选 */}
          {sessionSiteList.length > 0 && (
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
            {filteredSessions.length === 0 ? (
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
                    <div key={site.id} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1 h-4 bg-primary rounded" />
                        <span className="font-medium text-sm">{site.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {siteSessions.map(session => {
                          const statusLabel = getSessionStatusLabel(session.startTime, session.endTime);
                          const isChecked = tempSelectedSessions.includes(session.sessionId);
                          // 格式化日期
                          const startDate = new Date(session.startTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
                          const endDate = new Date(session.endTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

                          return (
                            <label
                              key={session.sessionId}
                              className={`relative p-3 border rounded-lg cursor-pointer transition-colors ${
                                isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                            >
                              {/* 状态标签 */}
                              <div className="absolute top-2 right-2 flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusLabel.dot}`} />
                                <span className={`text-xs ${statusLabel.color}`}>{statusLabel.text}</span>
                              </div>

                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setTempSelectedSessions([...tempSelectedSessions, session.sessionId]);
                                    } else {
                                      setTempSelectedSessions(
                                        tempSelectedSessions.filter(id => id !== session.sessionId)
                                      );
                                    }
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0 pr-14">
                                  <div className="text-sm font-medium truncate">
                                    {session.sessionName}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {startDate} ~ {endDate}
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
                确认 ({tempSelectedSessions.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量配置弹窗 */}
      <Dialog open={batchConfigDialogOpen} onOpenChange={(open) => {
        setBatchConfigDialogOpen(open);
        if (!open) setBatchSourceShopId(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              复制配置到其他店铺（{shopConfigs.filter(c => c.selected && c.id !== batchSourceShopId).length} 个）
            </DialogTitle>
          </DialogHeader>

          {/* 提示信息 */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>将为所有选中的店铺应用相同配置，不支持的店铺将被跳过</span>
          </div>

          {batchConfigLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">加载活动...</span>
            </div>
          ) : batchApplying ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">正在应用配置...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  总计 {batchApplyProgress.total} 个店铺
                </p>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <span className="text-sm text-green-600">成功: {batchApplyProgress.success}</span>
                  <span className="text-sm text-red-600">失败: {batchApplyProgress.fail}</span>
                </div>
              </div>
            </div>
          ) : batchApplyDone ? (
            <div className="py-6 space-y-4">
              {/* 应用结果 */}
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">应用完成</p>
                <div className="flex items-center justify-center gap-6">
                  <span className="text-green-600">成功: {batchApplyProgress.success}</span>
                  <span className="text-red-600">失败: {batchApplyProgress.fail}</span>
                </div>
              </div>

              {/* 失败详情 */}
              {batchApplyFailures.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-2">失败详情：</p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {batchApplyFailures.map((failure, index) => (
                      <div key={index} className="text-sm text-red-600 flex items-center gap-2">
                        <span className="font-medium">{failure.shopName}:</span>
                        <span>{failure.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 关闭按钮 */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => {
                    setBatchConfigDialogOpen(false);
                    setBatchApplyDone(false);
                    setBatchSourceShopId(null);
                  }}
                >
                  关闭
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto space-y-4 py-4">
              {/* 活动类型选择 */}
              <div className="space-y-2">
                <Label>活动类型</Label>
                {batchAvailableActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">没有所有店铺都支持的活动</p>
                ) : (
                  <Select
                    value={batchActivityType?.toString() || ''}
                    onValueChange={(v) => handleBatchSelectActivityType(parseInt(v))}
                  >
                    <SelectTrigger className="w-full shadow-none">
                      <SelectValue placeholder="选择活动类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {batchAvailableActivities.map((activity) => (
                        <SelectItem
                          key={activity.activityType}
                          value={activity.activityType.toString()}
                        >
                          {activity.activityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* 专场选择（如果有） */}
              {batchSelectedActivity && batchSelectedActivity.thematics.length > 0 && (
                <div className="space-y-2">
                  <Label>活动专场</Label>
                  <Select
                    value={batchThematicId?.toString() || ''}
                    onValueChange={(v) => handleBatchSelectThematic(parseInt(v))}
                  >
                    <SelectTrigger className="w-full shadow-none">
                      <SelectValue placeholder="选择专场" />
                    </SelectTrigger>
                    <SelectContent>
                      {batchSelectedActivity.thematics.map((thematic) => (
                        <SelectItem
                          key={thematic.thematicId}
                          value={thematic.thematicId.toString()}
                        >
                          {thematic.thematicName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 场次选择 */}
              {batchActivityType && (
                batchSelectedActivity?.thematics.length === 0 || batchThematicId
              ) && (
                <div className="space-y-2">
                  <Label>选择场次</Label>

                  {batchLoadingSessions ? (
                    <div className="flex items-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">加载场次...</span>
                    </div>
                  ) : batchAvailableSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">暂无可选场次</p>
                  ) : (
                    <>
                      {/* 站点Tab筛选 */}
                      {batchSessionSiteList.length > 0 && (
                        <div className="flex items-center gap-4 border-b">
                          <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              batchSessionSiteFilter === 'all'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setBatchSessionSiteFilter('all')}
                          >
                            全部
                          </button>
                          {batchSessionSiteList.map(site => (
                            <button
                              key={site.id}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                batchSessionSiteFilter === String(site.id)
                                  ? 'border-primary text-primary'
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => setBatchSessionSiteFilter(String(site.id))}
                            >
                              {site.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 场次列表 */}
                      <div className="max-h-[200px] overflow-auto">
                        {batchSessionSiteList.map(site => {
                          const siteSessions = batchFilteredSessions.filter(s => s.siteId === site.id);
                          if (siteSessions.length === 0) return null;

                          return (
                            <div key={site.id} className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-1 h-4 bg-primary rounded" />
                                <span className="font-medium text-sm">{site.name}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {siteSessions.map(session => {
                                  const statusLabel = getSessionStatusLabel(session.startTime, session.endTime);
                                  const isChecked = batchSessionIds.includes(session.sessionId);
                                  const startDate = new Date(session.startTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
                                  const endDate = new Date(session.endTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

                                  return (
                                    <label
                                      key={session.sessionId}
                                      className={`relative p-3 border rounded-lg cursor-pointer transition-colors ${
                                        isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusLabel.dot}`} />
                                        <span className={`text-xs ${statusLabel.color}`}>{statusLabel.text}</span>
                                      </div>

                                      <div className="flex items-start gap-2">
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setBatchSessionIds([...batchSessionIds, session.sessionId]);
                                            } else {
                                              setBatchSessionIds(
                                                batchSessionIds.filter(id => id !== session.sessionId)
                                              );
                                            }
                                          }}
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0 pr-14">
                                          <div className="text-sm font-medium truncate">
                                            {session.sessionName}
                                          </div>
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            {startDate} ~ {endDate}
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
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 底部操作区 - 只在表单状态显示 */}
          {!batchApplying && !batchApplyDone && !batchConfigLoading && (
            <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
              {batchAvailableSessions.length > 0 ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isBatchAllSessionsSelected}
                    onCheckedChange={handleBatchSelectAllSessions}
                  />
                  <span className="text-sm">全选场次</span>
                </label>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => {
                  setBatchConfigDialogOpen(false);
                  setBatchSourceShopId(null);
                }}>
                  取消
                </Button>
                <Button
                  onClick={handleConfirmBatchConfig}
                  disabled={!batchActivityType || batchSessionIds.length === 0}
                >
                  确认复制
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateJob;
