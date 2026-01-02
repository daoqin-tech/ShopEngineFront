import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, TrendingUp, Package, ShoppingCart, Image as ImageIcon, X, Search, LayoutGrid, LayoutList, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type {
  OrderImportItem,
  OrderStatsResponse,
  SKUSalesItem,
  ShopSalesItem,
  DailySalesItem,
} from '@/types/order'
import * as orderService from '@/services/orderService'
import { temuShopService, TemuShop } from '@/services/temuShopService'

export default function OrderStats() {
  const navigate = useNavigate()

  // 统计数据状态
  const [stats, setStats] = useState<OrderStatsResponse | null>(null)
  const [topSKUs, setTopSKUs] = useState<SKUSalesItem[]>([])
  const [recentTopSKUs, setRecentTopSKUs] = useState<SKUSalesItem[]>([]) // 近7天热销
  const [shopStats, setShopStats] = useState<ShopSalesItem[]>([])
  const [dailySales, setDailySales] = useState<DailySalesItem[]>([])
  const [shops, setShops] = useState<TemuShop[]>([])
  const [loading, setLoading] = useState(true)
  const [rankingTab, setRankingTab] = useState<'all' | 'recent'>('recent') // 热销排行子Tab

  // 筛选条件
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedShopId, setSelectedShopId] = useState('')

  // 导入对话框状态
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<OrderImportItem[]>([])

  // 图片预览状态
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)

  // 视图模式
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  // 获取店铺列表
  const fetchShops = useCallback(async () => {
    try {
      const response = await temuShopService.getAllShops()
      setShops(response.shops || [])
    } catch (error) {
      console.error('获取店铺列表失败:', error)
    }
  }, [])

  // 计算近7天的日期范围
  const getRecent7DaysRange = () => {
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 6) // 包括今天共7天
    return {
      startDate: sevenDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }
  }

  // 获取统计数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        shopId: selectedShopId || undefined,
      }

      // 近7天参数
      const recent7Days = getRecent7DaysRange()
      const recentParams = {
        startDate: recent7Days.startDate,
        endDate: recent7Days.endDate,
        shopId: selectedShopId || undefined,
      }

      const [statsRes, topSKUsRes, recentTopSKUsRes, shopStatsRes, dailySalesRes] = await Promise.all([
        orderService.getStats(params),
        orderService.getTopSKUs({ ...params, limit: 20 }),
        orderService.getTopSKUs({ ...recentParams, limit: 20 }), // 近7天热销
        orderService.getShopStats(params),
        orderService.getDailySales(params),
      ])

      setStats(statsRes)
      setTopSKUs(topSKUsRes?.items || [])
      setRecentTopSKUs(recentTopSKUsRes?.items || [])
      setShopStats(shopStatsRes?.items || [])
      setDailySales(dailySalesRes?.items || [])
    } catch (error) {
      console.error('获取统计数据失败:', error)
      toast.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedShopId])

  useEffect(() => {
    fetchShops()
    fetchData()
  }, [fetchShops, fetchData])

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请选择 Excel 文件 (.xlsx 或 .xls)')
      return
    }

    setImportFile(file)

    // 解析 Excel 预览
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]

        // 查找列索引
        const headers = jsonData[0]
        const orderNoIndex = headers.findIndex(h => h?.includes('参考单号') || h?.includes('单号'))
        const skuIndex = headers.findIndex(h => h?.includes('SKU') || h?.includes('货号'))
        const quantityIndex = headers.findIndex(h => h?.includes('数量'))

        if (orderNoIndex === -1 || skuIndex === -1 || quantityIndex === -1) {
          toast.error('Excel 格式不正确，请确保包含"参考单号"、"SKU"和"数量"列')
          return
        }

        // 解析数据行
        const orders: OrderImportItem[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || !row[orderNoIndex]) continue

          orders.push({
            orderNo: String(row[orderNoIndex] || '').trim(),
            sku: String(row[skuIndex] || '').trim(),
            quantity: parseInt(String(row[quantityIndex] || '1'), 10) || 1,
          })
        }

        setPreviewData(orders)
      } catch (error) {
        console.error('解析 Excel 失败:', error)
        toast.error('解析 Excel 文件失败')
      }
    }
    reader.readAsBinaryString(file)
  }

  // 执行导入
  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('没有可导入的数据')
      return
    }

    setImporting(true)
    try {
      const response = await orderService.importOrders({
        orders: previewData,
        importDate: new Date().toISOString().split('T')[0],
      })

      toast.success(
        `导入完成: 成功 ${response?.successCount ?? 0} 条, 跳过 ${response?.skippedCount ?? 0} 条, 失败 ${response?.failedCount ?? 0} 条`
      )

      setImportDialogOpen(false)
      setImportFile(null)
      setPreviewData([])

      // 刷新数据
      fetchData()
    } catch (error) {
      console.error('导入订单失败:', error)
      toast.error('导入订单失败')
    } finally {
      setImporting(false)
    }
  }

  // 打开图片预览
  const handleOpenImagePreview = (images: string[]) => {
    if (images && images.length > 0) {
      setPreviewImages(images)
      setPreviewDialogOpen(true)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-zinc-50 min-h-screen">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">订单统计</h1>
        <p className="text-sm text-zinc-500 mt-0.5">查看销售数据，分析热销商品</p>
      </div>

      {/* 筛选栏 - 移至顶部 */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-36 h-8 text-sm bg-white border-zinc-200"
          placeholder="开始日期"
        />
        <span className="text-zinc-400">-</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-36 h-8 text-sm bg-white border-zinc-200"
          placeholder="结束日期"
        />
        <Select value={selectedShopId || 'all'} onValueChange={(v) => setSelectedShopId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 h-8 text-sm bg-white border-zinc-200">
            <SelectValue placeholder="全部店铺" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部店铺</SelectItem>
            {shops.filter(shop => shop.shopId).map((shop) => (
              <SelectItem key={shop.shopId} value={shop.shopId}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="h-8 border-zinc-200 hover:bg-zinc-100"
        >
          <Search className="w-3.5 h-3.5 mr-1.5" />
          查询
        </Button>
        <div className="flex-1" />
        <Button
          onClick={() => setImportDialogOpen(true)}
          size="sm"
          className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          导入订单
        </Button>
      </div>

      {/* 统计卡片 - 3个，黑白简洁风格 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">总销量</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">
                {(stats?.totalSales || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-zinc-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">订单数</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">
                {(stats?.orderCount || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-zinc-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">SKU 数</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-1">
                {(stats?.skuCount || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-zinc-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs 分区 */}
      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="bg-zinc-100 p-1">
          <TabsTrigger value="ranking" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900">
            热销排行
          </TabsTrigger>
          <TabsTrigger value="trend" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900">
            销售趋势
          </TabsTrigger>
          <TabsTrigger value="shops" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900">
            店铺统计
          </TabsTrigger>
        </TabsList>

        {/* 热销排行 Tab */}
        <TabsContent value="ranking" className="space-y-4">
          {/* 工具栏：子Tab切换 + 视图切换 */}
          <div className="flex items-center justify-between">
            {/* 近7天/总榜切换 */}
            <div className="flex items-center bg-zinc-100 rounded-lg p-1">
              <button
                onClick={() => setRankingTab('recent')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  rankingTab === 'recent' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                近7天
              </button>
              <button
                onClick={() => setRankingTab('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  rankingTab === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                总榜
              </button>
            </div>

            {/* 视图切换按钮 */}
            <div className="flex items-center bg-zinc-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                title="网格视图"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                title="列表视图"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 当前显示的SKU列表 */}
          {(() => {
            const currentSKUs = rankingTab === 'recent' ? recentTopSKUs : topSKUs
            return currentSKUs.length > 0 ? (
            viewMode === 'grid' ? (
              /* 网格视图 - 大图展示 */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {currentSKUs.map((item) => (
                  <div
                    key={item.sku}
                    className="bg-white rounded-lg border border-zinc-200 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* 商品图片 */}
                    <div
                      className="aspect-square bg-zinc-50 overflow-hidden cursor-pointer relative"
                      onClick={() => handleOpenImagePreview(item.productImages || [item.previewImage])}
                    >
                      {item.previewImage ? (
                        <>
                          <img
                            src={item.previewImage}
                            alt={item.productName || item.sku}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 rounded-full p-2">
                              <ImageIcon className="w-4 h-4 text-zinc-700" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-zinc-200" />
                        </div>
                      )}

                      {/* 排名标签 */}
                      <div className="absolute top-2 left-2 bg-zinc-900/80 text-white text-xs font-medium px-2 py-0.5 rounded">
                        #{item.rank}
                      </div>

                      {/* 销量标签 */}
                      <div className="absolute top-2 right-2 bg-white/90 text-zinc-900 text-xs font-medium px-2 py-0.5 rounded">
                        {item.totalSales} 件
                      </div>
                    </div>

                    {/* 商品信息 */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-mono text-zinc-400 truncate flex-1">{item.sku}</p>
                        {item.aiProjectId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/materials/project/${item.aiProjectId}/edit`)
                            }}
                            className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                            title={`查看生图项目: ${item.aiProjectName || item.aiProjectId}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-zinc-900 truncate" title={item.productName}>
                        {item.productName || '未知商品'}
                      </p>
                      {item.productNameEn && (
                        <p className="text-xs text-zinc-500 truncate" title={item.productNameEn}>
                          {item.productNameEn}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-zinc-400 truncate max-w-[70%]" title={item.shopName}>
                          {item.shopName}
                        </span>
                        <span className="text-xs text-zinc-500">{item.orderCount} 单</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 列表视图 - 紧凑信息 */
              <Card className="border-zinc-200">
                <CardContent className="p-0">
                  <div className="divide-y divide-zinc-100">
                    {currentSKUs.map((item) => (
                      <div
                        key={item.sku}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors group"
                      >
                        {/* 排名 */}
                        <span className="w-8 text-sm font-medium text-zinc-400">
                          #{item.rank}
                        </span>

                        {/* 图片 */}
                        <div
                          className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden cursor-pointer flex-shrink-0 relative"
                          onClick={() => handleOpenImagePreview(item.productImages || [item.previewImage])}
                        >
                          {item.previewImage ? (
                            <>
                              <img
                                src={item.previewImage}
                                alt={item.productName || item.sku}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-zinc-300" />
                            </div>
                          )}
                        </div>

                        {/* SKU和名称 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-mono text-zinc-400 truncate">{item.sku}</p>
                            {item.aiProjectId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/materials/project/${item.aiProjectId}/edit`)
                                }}
                                className="p-0.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors flex-shrink-0"
                                title={`查看生图项目: ${item.aiProjectName || item.aiProjectId}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-zinc-900 truncate" title={item.productName}>
                            {item.productName || '未知商品'}
                          </p>
                          {item.productNameEn && (
                            <p className="text-xs text-zinc-500 truncate" title={item.productNameEn}>
                              {item.productNameEn}
                            </p>
                          )}
                        </div>

                        {/* 店铺 */}
                        <span className="text-xs text-zinc-400 w-28 truncate text-right" title={item.shopName}>
                          {item.shopName}
                        </span>

                        {/* 销量和订单数 */}
                        <div className="text-right w-20">
                          <p className="text-sm font-semibold text-zinc-900">{item.totalSales}</p>
                          <p className="text-xs text-zinc-400">{item.orderCount} 单</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="border-zinc-200">
              <CardContent className="p-0">
                <div className="h-48 flex flex-col items-center justify-center text-zinc-400">
                  <Package className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">{rankingTab === 'recent' ? '近7天暂无销售数据' : '暂无数据'}</p>
                </div>
              </CardContent>
            </Card>
          )
          })()}
        </TabsContent>

        {/* 销售趋势 Tab */}
        <TabsContent value="trend">
          <Card className="border-zinc-200">
            <CardContent className="p-6">
              {dailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={dailySales} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => value.substring(5)}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#71717a' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#71717a' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e4e4e7',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        padding: '10px 14px',
                      }}
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        value,
                        name === 'totalSales' ? '销量' : '订单数',
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => value === 'totalSales' ? '销量' : '订单数'}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalSales"
                      stroke="#18181b"
                      strokeWidth={2}
                      dot={{ fill: '#18181b', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: '#18181b', stroke: 'white', strokeWidth: 2 }}
                      name="totalSales"
                    />
                    <Line
                      type="monotone"
                      dataKey="orderCount"
                      stroke="#71717a"
                      strokeWidth={2}
                      dot={{ fill: '#71717a', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: '#71717a', stroke: 'white', strokeWidth: 2 }}
                      name="orderCount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex flex-col items-center justify-center text-zinc-400">
                  <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 店铺统计 Tab */}
        <TabsContent value="shops">
          <Card className="border-zinc-200">
            <CardContent className="p-0">
              {shopStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-zinc-200">
                      <TableHead className="font-medium text-zinc-500 w-16">排名</TableHead>
                      <TableHead className="font-medium text-zinc-500">店铺名称</TableHead>
                      <TableHead className="text-right font-medium text-zinc-500">销量</TableHead>
                      <TableHead className="text-right font-medium text-zinc-500">订单数</TableHead>
                      <TableHead className="text-right font-medium text-zinc-500">SKU数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shopStats.map((shop, index) => (
                      <TableRow key={shop.shopId} className="hover:bg-zinc-50 border-zinc-100">
                        <TableCell className="text-sm text-zinc-400">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-900">
                          {shop.shopName}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-zinc-900">
                          {shop.totalSales}
                        </TableCell>
                        <TableCell className="text-right text-zinc-600">
                          {shop.orderCount}
                        </TableCell>
                        <TableCell className="text-right text-zinc-600">
                          {shop.skuCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-zinc-400">
                  <Package className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入订单</DialogTitle>
            <DialogDescription>
              请上传 Excel 文件，文件需包含"参考单号"、"SKU"和"数量"列
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 文件选择 */}
            <div className="space-y-2">
              <Label>选择文件</Label>
              <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 text-center hover:border-zinc-300 transition-colors">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">
                    {importFile ? (
                      <span className="text-zinc-900 font-medium">{importFile.name}</span>
                    ) : (
                      '点击选择或拖拽 Excel 文件到此处'
                    )}
                  </p>
                </label>
              </div>
            </div>

            {/* 预览数据 */}
            {previewData.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>预览数据</span>
                  <span className="text-sm font-normal text-zinc-500">共 {previewData.length} 条</span>
                </Label>
                <div className="border border-zinc-200 rounded-lg max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead>订单号</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{item.orderNo}</TableCell>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {previewData.length > 10 && (
                  <p className="text-xs text-zinc-400 text-center">
                    仅显示前 10 条，共 {previewData.length} 条数据
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || previewData.length === 0}
              className="bg-zinc-900 hover:bg-zinc-800"
            >
              {importing ? '导入中...' : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>商品图片</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {previewImages.map((img, index) => (
              <div key={index} className="aspect-square bg-zinc-100 rounded-lg overflow-hidden">
                <img
                  src={img}
                  alt={`商品图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
