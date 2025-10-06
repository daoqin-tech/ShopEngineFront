import { apiClient } from '@/lib/api'

// 批量创建商品的请求参数
export interface BatchCreateProductRequest {
  // 店铺信息
  shopId: string
  shopAccount: string

  // 分类信息
  categoryId?: string
  categoryName?: string

  // 产地
  origin: string

  // 运费模板
  freightTemplateId?: string
  freightTemplateName?: string

  // 经营站点
  operatingSite?: string

  // 商品尺寸和重量
  length?: number
  width?: number
  height?: number
  weight?: number

  // 价格
  declaredPrice?: number
  suggestedRetailPrice?: number

  // 变种信息
  variantName?: string
  variantAttributeName1?: string
  variantAttributeValue1?: string

  // 库存和发货
  stock?: number
  shippingTime?: number

  // 货号前缀
  productCodePrefix?: string

  // 任务ID列表（每个任务对应一个商品，后端通过taskId查询图片信息）
  taskIds: string[]
}

// 批量创建商品的响应
export interface BatchCreateProductResponse {
  success: boolean
  message: string
  data?: {
    totalCount: number      // 总共创建的商品数量
    successCount: number    // 成功创建的商品数量
    failedCount: number     // 失败的商品数量
    products: {
      id: string
      productId?: string    // 平台返回的商品ID
      status: 'success' | 'failed'
      error?: string
    }[]
  }
}

// 商品列表项
export interface Product {
  id: string
  taskId: string
  shopId: string
  shopName: string
  productId?: string        // 平台商品ID
  nameZh?: string           // AI生成的中文标题
  nameEn?: string           // AI生成的英文标题
  categoryName?: string     // 分类名称
  previewImage?: string     // 预览图
  status: 'pending' | 'success' | 'failed'
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

// 获取商品列表的请求参数
export interface GetProductsRequest {
  page?: number
  limit?: number
  status?: 'pending' | 'success' | 'failed'
  shopId?: string
  keyword?: string
}

// 获取商品列表的响应
export interface GetProductsResponse {
  data: Product[]
  total: number
  page: number
  limit: number
}

export const productService = {
  // 批量创建商品
  batchCreate: async (request: BatchCreateProductRequest): Promise<BatchCreateProductResponse> => {
    const response = await apiClient.post('/products/batch-create', request)
    return response.data
  },

  // 获取商品列表
  getProducts: async (params?: GetProductsRequest): Promise<GetProductsResponse> => {
    const response = await apiClient.get('/products', { params })
    return response.data
  }
}