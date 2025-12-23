import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { RefreshCw, Store, Calendar, Package, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { temuShopService, type TemuShop } from '@/services/temuShopService';
import { temuActivityService } from '@/services/temuActivityService';
import type {
  Activity,
  ActivityProduct,
  ActivitySession,
  ActivityEnrollRecord,
  ActivityType,
  EnrollProductInfo,
} from '@/types/temuActivity';
import { ActivityTypeNames, EnrollStatusNames, SessionStatusNames } from '@/types/temuActivity';
import { toast } from 'sonner';

export function TemuActivities() {
  // 店铺相关状态
  const [shops, setShops] = useState<TemuShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [loadingShops, setLoadingShops] = useState(true);

  // 活动列表状态
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // 可报名商品状态
  const [products, setProducts] = useState<ActivityProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // 场次相关状态
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // 报名提交状态
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ActivitySession | null>(null);

  // 报名记录状态
  const [enrollRecords, setEnrollRecords] = useState<ActivityEnrollRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

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
    if (!selectedShopId) return;
    try {
      setLoadingActivities(true);
      const response = await temuActivityService.getActivityList({ shopId: selectedShopId });
      setActivities(response.activities || []);
    } catch (error) {
      console.error('获取活动列表失败:', error);
      toast.error('获取活动列表失败');
    } finally {
      setLoadingActivities(false);
    }
  };

  // 加载可报名商品
  const fetchProducts = async (activity: Activity) => {
    if (!selectedShopId) return;
    try {
      setLoadingProducts(true);
      setSelectedActivity(activity);
      setProducts([]);
      const response = await temuActivityService.getActivityProducts({
        shopId: selectedShopId,
        activityType: activity.activityType,
        activityThematicId: activity.activityThematicId,
        rowCount: 50,
      });
      setProducts(response.products || []);
    } catch (error) {
      console.error('获取可报名商品失败:', error);
      toast.error('获取可报名商品失败');
    } finally {
      setLoadingProducts(false);
    }
  };

  // 加载活动场次
  const fetchSessions = async () => {
    if (!selectedShopId || !selectedActivity || selectedProducts.size === 0) return;
    try {
      setLoadingSessions(true);
      const response = await temuActivityService.getActivitySessions({
        shopId: selectedShopId,
        activityType: selectedActivity.activityType,
        productIds: Array.from(selectedProducts),
        activityThematicId: selectedActivity.activityThematicId,
      });
      setSessions(response.sessions || []);
      setShowSessionDialog(true);
    } catch (error) {
      console.error('获取活动场次失败:', error);
      toast.error('获取活动场次失败');
    } finally {
      setLoadingSessions(false);
    }
  };

  // 加载报名记录
  const fetchEnrollRecords = async () => {
    if (!selectedShopId) return;
    try {
      setLoadingRecords(true);
      const response = await temuActivityService.getActivityEnrollList({
        shopId: selectedShopId,
        pageNo: 1,
        pageSize: 50,
      });
      setEnrollRecords(response.records || []);
    } catch (error) {
      console.error('获取报名记录失败:', error);
      toast.error('获取报名记录失败');
    } finally {
      setLoadingRecords(false);
    }
  };

  // 提交报名
  const handleSubmitEnroll = async () => {
    if (!selectedShopId || !selectedActivity || !selectedSession || selectedProducts.size === 0) {
      toast.error('请选择商品和场次');
      return;
    }

    try {
      setSubmitting(true);
      const productList: EnrollProductInfo[] = Array.from(selectedProducts).map(productId => ({
        productId,
        sessionId: selectedSession.sessionId,
        enrollPrice: 0, // 使用商品当前价格
        siteId: selectedSession.siteId,
      }));

      const response = await temuActivityService.submitActivityEnroll({
        shopId: selectedShopId,
        activityType: selectedActivity.activityType,
        activityThematicId: selectedActivity.activityThematicId,
        productList,
      });

      if (response.successCount > 0) {
        toast.success(`报名成功 ${response.successCount} 个商品`);
      }
      if (response.failCount > 0) {
        toast.error(`报名失败 ${response.failCount} 个商品`);
      }

      setShowSessionDialog(false);
      setSelectedProducts(new Set());
      setSelectedSession(null);
      fetchEnrollRecords();
    } catch (error: any) {
      console.error('提交报名失败:', error);
      toast.error(error.response?.data?.message || '提交报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换商品选择
  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      fetchActivities();
      fetchEnrollRecords();
      setSelectedActivity(null);
      setProducts([]);
      setSelectedProducts(new Set());
    }
  }, [selectedShopId]);

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">活动报名</h1>
          <p className="text-gray-600">报名 Temu 平台促销活动</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 店铺选择 */}
          <Select
            value={selectedShopId}
            onValueChange={setSelectedShopId}
            disabled={loadingShops}
          >
            <SelectTrigger className="w-[200px]">
              <Store className="w-4 h-4 mr-2" />
              <SelectValue placeholder={loadingShops ? '加载中...' : '选择店铺'} />
            </SelectTrigger>
            <SelectContent>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchActivities();
              fetchEnrollRecords();
            }}
            disabled={!selectedShopId || loadingActivities}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingActivities ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">可报名活动</TabsTrigger>
          <TabsTrigger value="records">报名记录</TabsTrigger>
        </TabsList>

        {/* 可报名活动 */}
        <TabsContent value="activities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 活动列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  活动列表
                </CardTitle>
                <CardDescription>选择一个活动查看可报名商品</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {selectedShopId ? '暂无可报名活动' : '请先选择店铺'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity, index) => (
                      <div
                        key={`${activity.activityType}-${activity.activityThematicId || index}`}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedActivity?.activityType === activity.activityType &&
                          selectedActivity?.activityThematicId === activity.activityThematicId
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => fetchProducts(activity)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {activity.activityName || ActivityTypeNames[activity.activityType as ActivityType] || `活动 ${activity.activityType}`}
                            </div>
                            {activity.activityThematicName && (
                              <div className="text-sm text-gray-500 mt-1">
                                {activity.activityThematicName}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {ActivityTypeNames[activity.activityType as ActivityType] || `类型 ${activity.activityType}`}
                          </Badge>
                        </div>
                        {(activity.startTime || activity.endTime) && (
                          <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(activity.startTime)} ~ {formatTimestamp(activity.endTime)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 可报名商品 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  可报名商品
                  {selectedProducts.size > 0 && (
                    <Badge variant="default">{selectedProducts.size} 已选</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedActivity
                    ? `${selectedActivity.activityName || ActivityTypeNames[selectedActivity.activityType as ActivityType]} - 选择商品后点击"选择场次"按钮`
                    : '请先选择一个活动'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : !selectedActivity ? (
                  <div className="text-center py-8 text-gray-500">
                    请从左侧选择一个活动
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无可报名商品
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {products.map((product) => (
                        <div
                          key={product.productId}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedProducts.has(product.productId)
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:border-gray-300'
                          }`}
                          onClick={() => toggleProductSelection(product.productId)}
                        >
                          <div className="flex items-center gap-3">
                            {product.thumbUrl && (
                              <img
                                src={product.thumbUrl}
                                alt={product.productName}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {product.productName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {product.productId}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-orange-600">
                                ¥{(product.currentPrice / 100).toFixed(2)}
                              </div>
                              {product.enrollStatusDesc && (
                                <Badge variant="outline" className="text-xs">
                                  {product.enrollStatusDesc}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedProducts.size > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          className="w-full"
                          onClick={fetchSessions}
                          disabled={loadingSessions}
                        >
                          {loadingSessions ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              加载场次...
                            </>
                          ) : (
                            `选择场次 (${selectedProducts.size} 个商品)`
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 报名记录 */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">报名记录</CardTitle>
              <CardDescription>查看已报名的活动记录</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecords ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : enrollRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无报名记录
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">活动</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">场次</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">报名价格</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">报名时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {enrollRecords.map((record) => (
                        <tr key={record.enrollId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {record.thumbUrl && (
                                <img
                                  src={record.thumbUrl}
                                  alt={record.productName}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium text-gray-900 truncate max-w-[200px]">
                                  {record.productName || `商品 ${record.productId}`}
                                </div>
                                <div className="text-xs text-gray-500">ID: {record.productId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {record.activityTypeName || ActivityTypeNames[record.activityType as ActivityType]}
                            </div>
                            {record.activityThematicName && (
                              <div className="text-xs text-gray-500">{record.activityThematicName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{record.sessionName || '-'}</div>
                            {record.sessionStartTime && (
                              <div className="text-xs text-gray-500">
                                {formatTimestamp(record.sessionStartTime)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-orange-600 font-medium">
                            ¥{(record.enrollPrice / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                record.enrollStatus === 2 ? 'default' :
                                record.enrollStatus === 3 ? 'destructive' :
                                'secondary'
                              }
                            >
                              {record.enrollStatusDesc || EnrollStatusNames[record.enrollStatus] || `状态 ${record.enrollStatus}`}
                            </Badge>
                            {record.rejectReason && (
                              <div className="text-xs text-red-500 mt-1">{record.rejectReason}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatTimestamp(record.enrollTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 场次选择对话框 */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>选择活动场次</DialogTitle>
            <DialogDescription>
              为 {selectedProducts.size} 个商品选择报名场次
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无可用场次
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSession?.sessionId === session.sessionId
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.sessionName || `场次 ${session.sessionId}`}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(session.startTime)} ~ {formatTimestamp(session.endTime)}
                        </div>
                        {session.siteName && (
                          <div className="text-xs text-gray-400 mt-1">
                            站点: {session.siteName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {session.discountRate && (
                          <Badge variant="secondary">
                            {session.discountRate}% 折扣
                          </Badge>
                        )}
                        <Badge
                          variant={
                            session.status === 1 ? 'outline' :
                            session.status === 2 ? 'default' :
                            'secondary'
                          }
                        >
                          {session.statusDesc || SessionStatusNames[session.status] || `状态 ${session.status}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmitEnroll}
              disabled={!selectedSession || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  确认报名
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
