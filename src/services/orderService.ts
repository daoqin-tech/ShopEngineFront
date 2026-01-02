import { apiClient } from '@/lib/api'
import type {
  OrderImportRequest,
  OrderImportResponse,
  OrderStatsRequest,
  OrderStatsResponse,
  TopSKUsRequest,
  TopSKUsResponse,
  ShopStatsResponse,
  DailySalesResponse,
} from '@/types/order'

// API 响应包装类型（apiClient 拦截器已解包一层，返回的是 response.data）
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 导入订单
export async function importOrders(request: OrderImportRequest): Promise<OrderImportResponse> {
  const response = await apiClient.post<ApiResponse<OrderImportResponse>>(
    '/orders/import',
    request
  ) as unknown as ApiResponse<OrderImportResponse>
  return response.data
}

// 获取统计总览
export async function getStats(params?: OrderStatsRequest): Promise<OrderStatsResponse> {
  const response = await apiClient.get<ApiResponse<OrderStatsResponse>>('/orders/stats', {
    params,
  }) as unknown as ApiResponse<OrderStatsResponse>
  return response.data
}

// 获取热销SKU排行
export async function getTopSKUs(params?: TopSKUsRequest): Promise<TopSKUsResponse> {
  const response = await apiClient.get<ApiResponse<TopSKUsResponse>>('/orders/top-skus', {
    params,
  }) as unknown as ApiResponse<TopSKUsResponse>
  return response.data
}

// 获取店铺统计
export async function getShopStats(params?: OrderStatsRequest): Promise<ShopStatsResponse> {
  const response = await apiClient.get<ApiResponse<ShopStatsResponse>>('/orders/shop-stats', {
    params,
  }) as unknown as ApiResponse<ShopStatsResponse>
  return response.data
}

// 获取每日销售趋势
export async function getDailySales(params?: OrderStatsRequest): Promise<DailySalesResponse> {
  const response = await apiClient.get<ApiResponse<DailySalesResponse>>('/orders/daily-sales', {
    params,
  }) as unknown as ApiResponse<DailySalesResponse>
  return response.data
}
