import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Store, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  temuShopService,
  type TemuShop,
  type CreateTemuShopRequest,
  type UpdateTemuShopRequest,
  type TemuSite,
  type TemuWarehouse,
  type TemuFreightTemplate,
  type OriginCountry,
  type OriginRegion,
  type VerifyCredentialsResponse,
  SHIPMENT_LIMIT_OPTIONS
} from '@/services/temuShopService';
import { toast } from 'sonner';

export function TemuShops() {
  const [shops, setShops] = useState<TemuShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingShop, setEditingShop] = useState<TemuShop | null>(null);
  const [deletingShop, setDeletingShop] = useState<TemuShop | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingShopId, setRefreshingShopId] = useState<string | null>(null);

  // 验证凭证相关状态
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyCredentialsResponse | null>(null);

  // 两步保存相关状态：step 1 = 基本信息+凭证, step 2 = 配送设置
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [savedShopId, setSavedShopId] = useState<string | null>(null);

  // 站点、仓库、运费模板相关状态
  const [sites, setSites] = useState<TemuSite[]>([]);
  const [warehouses, setWarehouses] = useState<TemuWarehouse[]>([]);
  const [freightTemplates, setFreightTemplates] = useState<TemuFreightTemplate[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingFreightTemplates, setLoadingFreightTemplates] = useState(false);

  // 产地相关状态
  const [originCountries, setOriginCountries] = useState<OriginCountry[]>([]);
  const [originRegions, setOriginRegions] = useState<OriginRegion[]>([]);

  const [formData, setFormData] = useState<CreateTemuShopRequest>({
    name: '',
    shopId: '',
    businessCode: '',
    siteId: undefined,
    siteName: '',
    warehouseId: '',
    warehouseName: '',
    freightTemplateId: '',
    freightTemplateName: '',
    originCountry: 'CN',
    originRegion2Id: undefined,
    originRegionName: '',
    shipmentLimitSecond: 172800,
    appKey: '',
    appSecret: '',
    accessToken: '',
  });

  // 加载店铺列表
  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await temuShopService.getAllShops();
      setShops(response.shops);
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      toast.error('获取店铺列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
    fetchSites();
    fetchOriginData();
  }, []);

  // 加载产地枚举数据
  const fetchOriginData = async () => {
    try {
      const [countries, regions] = await Promise.all([
        temuShopService.getOriginCountries(),
        temuShopService.getOriginRegions(),
      ]);
      setOriginCountries(countries);
      setOriginRegions(regions);
    } catch (error) {
      console.error('获取产地枚举失败:', error);
    }
  };

  // 加载站点列表
  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      const response = await temuShopService.getSites();
      setSites(response.sites);
    } catch (error) {
      console.error('获取站点列表失败:', error);
      // 静默失败，不显示 toast
    } finally {
      setLoadingSites(false);
    }
  };

  // 加载仓库列表（需要店铺 ID）
  const fetchWarehouses = async (shopId: string, siteId?: number) => {
    try {
      setLoadingWarehouses(true);
      const response = await temuShopService.getWarehouses(shopId, siteId);
      setWarehouses(response.warehouses || []);
    } catch (error) {
      console.error('获取仓库列表失败:', error);
      toast.error('获取仓库列表失败，请确保已配置 API 凭证');
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  // 加载运费模板列表（需要店铺 ID）
  const fetchFreightTemplates = async (shopId: string, siteId?: number) => {
    try {
      setLoadingFreightTemplates(true);
      const response = await temuShopService.getFreightTemplates(shopId, siteId);
      setFreightTemplates(response.templates || []);
    } catch (error) {
      console.error('获取运费模板列表失败:', error);
      toast.error('获取运费模板列表失败，请确保已配置 API 凭证');
      setFreightTemplates([]);
    } finally {
      setLoadingFreightTemplates(false);
    }
  };

  // 打开新建对话框
  const handleCreate = () => {
    setEditingShop(null);
    setFormData({
      name: '',
      shopId: '',
      businessCode: '',
      siteId: undefined,
      siteName: '',
      warehouseId: '',
      warehouseName: '',
      freightTemplateId: '',
      freightTemplateName: '',
      originCountry: 'CN',
      originRegion2Id: undefined,
      originRegionName: '',
      shipmentLimitSecond: 172800,
      appKey: '',
      appSecret: '',
      accessToken: '',
    });
    setWarehouses([]);
    setFreightTemplates([]);
    setVerifyResult(null);
    setCurrentStep(1);
    setSavedShopId(null);
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (shop: TemuShop) => {
    setEditingShop(shop);
    setFormData({
      name: shop.name,
      shopId: shop.shopId,
      businessCode: shop.businessCode,
      siteId: shop.siteId,
      siteName: shop.siteName || '',
      warehouseId: shop.warehouseId || '',
      warehouseName: shop.warehouseName || '',
      freightTemplateId: shop.freightTemplateId || '',
      freightTemplateName: shop.freightTemplateName || '',
      originCountry: shop.originCountry || 'CN',
      originRegion2Id: shop.originRegion2Id,
      originRegionName: shop.originRegionName || '',
      shipmentLimitSecond: shop.shipmentLimitSecond || 172800,
      appKey: '',
      appSecret: '',
      accessToken: '',
    });
    // 如果已有 API 凭证，直接进入第二步（配送设置）
    if (shop.hasApiCredentials) {
      setCurrentStep(2);
      setSavedShopId(shop.id);
      if (shop.siteId) {
        fetchWarehouses(shop.id, shop.siteId);
        fetchFreightTemplates(shop.id, shop.siteId);
      }
    } else {
      setCurrentStep(1);
      setSavedShopId(null);
      setWarehouses([]);
      setFreightTemplates([]);
    }
    setVerifyResult(null);
    setShowDialog(true);
  };

  // 第一步：保存基本信息 + API 凭证
  const handleSaveStep1 = async () => {
    if (!formData.name || !formData.businessCode) {
      toast.error('请填写店铺名称和货号前缀');
      return;
    }

    // 新建店铺时必须先验证凭证（以获取 shopId/mallId）
    if (!editingShop && !verifyResult?.valid) {
      toast.error('请先验证 API 凭证');
      return;
    }

    try {
      setSubmitting(true);
      if (editingShop) {
        // 编辑模式：更新基本信息和凭证
        const updateData: UpdateTemuShopRequest = {
          ...formData,
          isActive: editingShop.isActive,
        };
        await temuShopService.updateShop(editingShop.id, updateData);
        toast.success('基本信息保存成功');
        // 进入第二步
        setCurrentStep(2);
        setSavedShopId(editingShop.id);
        // 刷新店铺信息
        const response = await temuShopService.getAllShops();
        const updatedShop = response.shops.find(s => s.id === editingShop.id);
        if (updatedShop) {
          setEditingShop(updatedShop);
        }
      } else {
        // 新建模式：创建店铺
        const newShop = await temuShopService.createShop(formData);
        toast.success('店铺创建成功，请继续配置配送设置');
        // 进入第二步
        setCurrentStep(2);
        setSavedShopId(newShop.id);
        setEditingShop(newShop);
      }
      // 刷新列表
      fetchShops();
    } catch (error: any) {
      console.error('保存店铺失败:', error);
      toast.error(error.response?.data?.message || '保存店铺失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 第二步：保存配送设置
  const handleSaveStep2 = async () => {
    const shopId = savedShopId || editingShop?.id;
    if (!shopId) {
      toast.error('店铺信息丢失，请重新操作');
      return;
    }

    try {
      setSubmitting(true);
      const updateData: UpdateTemuShopRequest = {
        ...formData,
        isActive: editingShop?.isActive ?? true,
      };
      await temuShopService.updateShop(shopId, updateData);
      toast.success('配送设置保存成功');
      setShowDialog(false);
      fetchShops();
    } catch (error: any) {
      console.error('保存配送设置失败:', error);
      toast.error(error.response?.data?.message || '保存配送设置失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除店铺
  const handleDelete = async () => {
    if (!deletingShop) return;

    try {
      await temuShopService.deleteShop(deletingShop.id);
      toast.success('店铺删除成功');
      setShowDeleteDialog(false);
      setDeletingShop(null);
      fetchShops();
    } catch (error: any) {
      console.error('删除店铺失败:', error);
      toast.error(error.response?.data?.message || '删除店铺失败');
    }
  };

  // 刷新店铺信息（类型和 Token 过期时间）
  const handleRefreshShopInfo = async (shop: TemuShop) => {
    if (!shop.hasApiCredentials) {
      toast.error('请先配置 API 凭证');
      return;
    }

    try {
      setRefreshingShopId(shop.id);
      await temuShopService.refreshShopType(shop.id);
      toast.success('店铺信息已更新');
      fetchShops();
    } catch (error: any) {
      console.error('刷新店铺信息失败:', error);
      toast.error(error.response?.data?.message || '刷新店铺信息失败');
    } finally {
      setRefreshingShopId(null);
    }
  };

  // 验证 API 凭证
  const handleVerifyCredentials = async () => {
    if (!formData.appKey || !formData.appSecret || !formData.accessToken) {
      toast.error('请填写完整的 API 凭证');
      return;
    }

    try {
      setVerifying(true);
      setVerifyResult(null);
      const result = await temuShopService.verifyCredentials({
        appKey: formData.appKey,
        appSecret: formData.appSecret,
        accessToken: formData.accessToken,
      });
      setVerifyResult(result);
      if (result.valid) {
        // 自动将 mallId 设置为 shopId
        setFormData(prev => ({
          ...prev,
          shopId: result.mallId.toString(),
        }));
        toast.success('API 凭证验证成功');
      } else {
        toast.error(result.errorMessage || 'API 凭证验证失败');
      }
    } catch (error: any) {
      console.error('验证凭证失败:', error);
      toast.error(error.response?.data?.message || '验证凭证失败');
      setVerifyResult(null);
    } finally {
      setVerifying(false);
    }
  };

  // 格式化 Token 过期时间
  const formatTokenExpiry = (expireAt?: string) => {
    if (!expireAt) return null;
    const expireDate = new Date(expireAt);
    const now = new Date();
    const daysLeft = Math.floor((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { text: '已过期', variant: 'destructive' as const };
    } else if (daysLeft <= 7) {
      return { text: `${daysLeft}天后过期`, variant: 'destructive' as const };
    } else if (daysLeft <= 30) {
      return { text: `${daysLeft}天后过期`, variant: 'secondary' as const };
    } else {
      return { text: `${daysLeft}天后过期`, variant: 'outline' as const };
    }
  };

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temu 店铺管理</h1>
          <p className="text-gray-600">管理 Temu 平台店铺信息和 API 配置</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchShops}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            新建店铺
          </Button>
        </div>
      </div>

      {/* 店铺列表 */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Store className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无店铺</h3>
            <p className="text-gray-500 mb-4">点击上方按钮添加第一个店铺</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">店铺名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">卖家ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">货号前缀</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API凭证</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shops.map((shop) => {
                  const tokenExpiry = formatTokenExpiry(shop.tokenExpireAt);
                  return (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{shop.name}</div>
                      {shop.siteName && (
                        <div className="text-xs text-gray-500">{shop.siteName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{shop.mallId || shop.shopId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={shop.isSemiManaged ? 'secondary' : 'default'}>
                          {shop.isSemiManaged ? '半托' : '全托'}
                        </Badge>
                        {shop.hasApiCredentials && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleRefreshShopInfo(shop)}
                            disabled={refreshingShopId === shop.id}
                            title="刷新店铺信息"
                          >
                            <RefreshCw className={`w-3 h-3 ${refreshingShopId === shop.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{shop.businessCode}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={shop.hasApiCredentials ? 'default' : 'outline'}>
                          {shop.hasApiCredentials ? '已配置' : '未配置'}
                        </Badge>
                        {shop.hasApiCredentials && tokenExpiry && (
                          <Badge variant={tokenExpiry.variant} className="text-xs">
                            {tokenExpiry.text}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={shop.isActive ? 'default' : 'secondary'}>
                        {shop.isActive ? '启用' : '禁用'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(shop)}
                          title="编辑店铺"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingShop(shop);
                            setShowDeleteDialog(true);
                          }}
                          title="删除店铺"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingShop ? '编辑店铺' : '新建店铺'}</DialogTitle>
            <DialogDescription>
              {editingShop ? '修改店铺信息和 API 配置' : '添加新的 Temu 店铺'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 px-1">
            {/* 基本信息 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Store className="w-4 h-4" />
                基本信息
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">店铺名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：道勤旗舰店"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessCode">货号前缀 *</Label>
                  <Input
                    id="businessCode"
                    value={formData.businessCode}
                    onChange={(e) => setFormData({ ...formData, businessCode: e.target.value })}
                    placeholder="例如：5270"
                  />
                </div>
              </div>
            </div>

            {/* API 凭证 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">API 凭证</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appKey">App Key {!editingShop && '*'}</Label>
                  <Input
                    id="appKey"
                    value={formData.appKey}
                    onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                    placeholder="Temu Open API App Key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appSecret">App Secret {!editingShop && '*'}</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    value={formData.appSecret}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    placeholder="Temu Open API App Secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token {!editingShop && '*'}</Label>
                  <Input
                    id="accessToken"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    placeholder="Temu Open API Access Token"
                  />
                </div>
              </div>

              {/* 验证按钮 */}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyCredentials}
                  disabled={verifying || !formData.appKey || !formData.appSecret || !formData.accessToken}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      验证凭证
                    </>
                  )}
                </Button>
                {editingShop && (
                  <span className="text-xs text-muted-foreground ml-3">
                    留空表示不修改现有凭证
                  </span>
                )}
              </div>

              {/* 验证结果显示 */}
              {verifyResult && (
                <div className={`mt-4 p-4 rounded-lg border ${verifyResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {verifyResult.valid ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">凭证验证成功</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white rounded-md p-3 border border-green-100">
                          <div className="text-xs text-gray-500 mb-1">店铺类型</div>
                          <Badge variant={verifyResult.isSemiManaged ? 'secondary' : 'default'}>
                            {verifyResult.isSemiManaged ? '半托管' : '全托管'}
                          </Badge>
                        </div>
                        <div className="bg-white rounded-md p-3 border border-green-100">
                          <div className="text-xs text-gray-500 mb-1">卖家ID</div>
                          <div className="font-medium text-gray-900">{verifyResult.mallId}</div>
                        </div>
                        <div className="bg-white rounded-md p-3 border border-green-100">
                          <div className="text-xs text-gray-500 mb-1">Token 有效期</div>
                          {(() => {
                            const expiry = formatTokenExpiry(verifyResult.tokenExpireAt);
                            return expiry ? (
                              <Badge variant={expiry.variant}>{expiry.text}</Badge>
                            ) : null;
                          })()}
                        </div>
                        <div className="bg-white rounded-md p-3 border border-green-100">
                          <div className="text-xs text-gray-500 mb-1">已授权接口</div>
                          <div className="font-medium text-gray-900">{verifyResult.apiScopeList?.length || 0} 个</div>
                        </div>
                      </div>
                      {verifyResult.apiScopeList && verifyResult.apiScopeList.length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            查看已授权接口列表
                          </summary>
                          <div className="mt-2 p-3 bg-white rounded-md border max-h-32 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                              {verifyResult.apiScopeList.map((scope, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-800">{verifyResult.errorMessage || '验证失败，请检查凭证是否正确'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 编辑时显示已保存的API信息 */}
              {editingShop && editingShop.hasApiCredentials && !verifyResult && (
                <div className="mt-4 p-4 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">已保存的 API 信息</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-md p-3 border">
                      <div className="text-xs text-gray-500 mb-1">店铺类型</div>
                      <Badge variant={editingShop.isSemiManaged ? 'secondary' : 'default'}>
                        {editingShop.isSemiManaged ? '半托管' : '全托管'}
                      </Badge>
                    </div>
                    {editingShop.mallId && (
                      <div className="bg-white rounded-md p-3 border">
                        <div className="text-xs text-gray-500 mb-1">卖家ID</div>
                        <div className="font-medium text-gray-900">{editingShop.mallId}</div>
                      </div>
                    )}
                    {editingShop.tokenExpireAt && (
                      <div className="bg-white rounded-md p-3 border">
                        <div className="text-xs text-gray-500 mb-1">Token 有效期</div>
                        {(() => {
                          const expiry = formatTokenExpiry(editingShop.tokenExpireAt);
                          return expiry ? (
                            <Badge variant={expiry.variant}>{expiry.text}</Badge>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {editingShop.apiScopeList && editingShop.apiScopeList.length > 0 && (
                      <div className="bg-white rounded-md p-3 border">
                        <div className="text-xs text-gray-500 mb-1">已授权接口</div>
                        <div className="font-medium text-gray-900">{editingShop.apiScopeList.length} 个</div>
                      </div>
                    )}
                  </div>
                  {editingShop.apiScopeList && editingShop.apiScopeList.length > 0 && (
                    <details className="text-xs mt-3">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        查看已授权接口列表
                      </summary>
                      <div className="mt-2 p-3 bg-white rounded-md border max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-1">
                          {editingShop.apiScopeList.map((scope, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* 配送设置 - 仅在第二步显示 */}
            {currentStep === 2 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">配送设置</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site">运营站点</Label>
                  <Select
                    value={formData.siteId?.toString() || ''}
                    onValueChange={(value) => {
                      const site = sites.find(s => s.siteId.toString() === value);
                      setFormData({
                        ...formData,
                        siteId: site?.siteId,
                        siteName: site?.siteName || '',
                        warehouseId: '',
                        warehouseName: '',
                        freightTemplateId: '',
                        freightTemplateName: '',
                      });
                      const shopId = savedShopId || editingShop?.id;
                      if (shopId && site) {
                        fetchWarehouses(shopId, site.siteId);
                        fetchFreightTemplates(shopId, site.siteId);
                      }
                    }}
                  >
                    <SelectTrigger className={loadingSites ? 'opacity-50' : ''}>
                      <SelectValue placeholder={loadingSites ? '加载中...' : '选择站点'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.siteId} value={site.siteId.toString()}>
                          {site.siteName}
                          {site.region && <span className="text-gray-500 ml-2">({site.region})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse">发货仓库</Label>
                  <Select
                    value={formData.warehouseId || ''}
                    onValueChange={(value) => {
                      const warehouse = warehouses.find(w => w.warehouseId === value);
                      setFormData({
                        ...formData,
                        warehouseId: warehouse?.warehouseId || '',
                        warehouseName: warehouse?.warehouseName || '',
                      });
                    }}
                    disabled={warehouses.length === 0}
                  >
                    <SelectTrigger className={loadingWarehouses ? 'opacity-50' : ''}>
                      <SelectValue
                        placeholder={
                          loadingWarehouses
                            ? '加载中...'
                            : warehouses.length === 0
                            ? '请先选择站点'
                            : '选择仓库'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses
                        .filter((warehouse) => warehouse.warehouseId)
                        .map((warehouse) => (
                          <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                            {warehouse.warehouseName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freightTemplate">运费模板</Label>
                  <Select
                    value={formData.freightTemplateId || ''}
                    onValueChange={(value) => {
                      const template = freightTemplates.find(t => t.freightTemplateId === value);
                      setFormData({
                        ...formData,
                        freightTemplateId: template?.freightTemplateId || '',
                        freightTemplateName: template?.templateName || '',
                      });
                    }}
                    disabled={freightTemplates.length === 0}
                  >
                    <SelectTrigger className={loadingFreightTemplates ? 'opacity-50' : ''}>
                      <SelectValue
                        placeholder={
                          loadingFreightTemplates
                            ? '加载中...'
                            : freightTemplates.length === 0
                            ? '请先选择站点'
                            : '选择运费模板'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {freightTemplates
                        .filter((template) => template.freightTemplateId)
                        .map((template) => (
                          <SelectItem key={template.freightTemplateId} value={template.freightTemplateId}>
                            {template.templateName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            )}

            {/* 产地和发货设置 - 仅在第二步显示 */}
            {currentStep === 2 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">产地和发货设置</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originCountry">产地国家</Label>
                  <Select
                    value={formData.originCountry || 'CN'}
                    onValueChange={(value) => {
                      const country = originCountries.find(c => c.code === value);
                      setFormData({
                        ...formData,
                        originCountry: value,
                        originRegion2Id: undefined,
                        originRegionName: '',
                      });
                      // 如果选择的国家不需要省份，清空省份
                      if (country && !country.requireRegion) {
                        setFormData(prev => ({
                          ...prev,
                          originRegion2Id: undefined,
                          originRegionName: '',
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择国家" />
                    </SelectTrigger>
                    <SelectContent>
                      {originCountries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 当选择中国时显示省份选择 */}
                {formData.originCountry === 'CN' && (
                  <div className="space-y-2">
                    <Label htmlFor="originRegion">产地省份</Label>
                    <Select
                      value={formData.originRegion2Id?.toString() || ''}
                      onValueChange={(value) => {
                        const region = originRegions.find(r => r.region2Id.toString() === value);
                        setFormData({
                          ...formData,
                          originRegion2Id: region?.region2Id,
                          originRegionName: region?.name || '',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择省份" />
                      </SelectTrigger>
                      <SelectContent>
                        {originRegions.map((region) => (
                          <SelectItem key={region.region2Id} value={region.region2Id.toString()}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="shipmentLimit">发货时效</Label>
                  <Select
                    value={formData.shipmentLimitSecond?.toString() || '172800'}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        shipmentLimitSecond: parseInt(value),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择发货时效" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPMENT_LIMIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            )}

            {/* 第一步提示信息 */}
            {currentStep === 1 && !editingShop && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>第 1 步：</strong>请先填写店铺名称、货号前缀和 API 凭证，验证凭证成功后点击"保存并继续"进入配送设置。
                </p>
              </div>
            )}

            {/* 第二步提示信息 */}
            {currentStep === 2 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>第 2 步：</strong>请选择运营站点、发货仓库和运费模板，完成后点击"保存"。
                </p>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            {currentStep === 1 ? (
              <Button
                onClick={handleSaveStep1}
                disabled={submitting || (!editingShop && !verifyResult?.valid)}
              >
                {submitting ? '保存中...' : '保存并继续'}
              </Button>
            ) : (
              <>
                {/* 编辑时可以返回第一步修改凭证 */}
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  修改凭证
                </Button>
                <Button onClick={handleSaveStep2} disabled={submitting}>
                  {submitting ? '保存中...' : '保存'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除店铺 "{deletingShop?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
