import { apiClient } from '@/lib/api'

// 批量创建商品的请求参数
export interface BatchCreateProductRequest {
  // 店铺信息
  shopId: string
  shopAccount: string

  // 分类信息(生成新货号必填)
  categoryId: string           // TEMU平台分类ID
  categoryName?: string
  // productCategoryId 已删除,由后端从AI项目自动获取

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

  // 商品规格
  productSpec?: string

  // 用途
  productUsage?: string

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
  userId: string
  status: 'pending' | 'success' | 'failed'
  shopId: string
  shopName?: string
  shopAccount: string
  categoryId: string          // Temu平台分类ID
  categoryName: string        // Temu平台分类名称
  productCategoryId?: string  // 平台分类ID
  productCategoryName?: string   // 平台分类中文名称
  productCategoryNameEn?: string // 平台分类英文名称
  origin: string
  nameEn: string
  nameZh: string
  carouselImages: string[]   // 商品图(用于商品展示)
  productImages: string[]    // 产品图片(从关联的AI项目获取)
  materialImage: string
  previewImage: string
  freightTemplateId: string
  freightTemplateName: string
  operatingSite: string
  length: number
  width: number
  height: number
  weight: number
  declaredPrice: number
  suggestedRetailPrice: number
  variantName: string
  variantAttributeName1: string
  variantAttributeValue1: string
  stock: number
  shippingTime: number
  productCode: string
  newProductCode?: string   // 新货号
  productId?: string        // 平台商品ID
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

// 获取商品列表的请求参数
export interface GetProductsRequest {
  page?: number
  limit?: number
  productCodes?: string       // 货号，包含逗号时为精确查询（逗号分隔），否则为模糊查询
  title?: string              // 标题模糊查询（搜索中文标题）
  shopId?: string             // 店铺ID
  productCategoryId?: string  // 产品分类ID（关联product_categories表）
  startTime?: number          // 开始时间（秒级时间戳）
  endTime?: number            // 结束时间（秒级时间戳）
}

// 获取商品列表的响应
export interface GetProductsResponse {
  data: Product[]
  total: number
  page: number
  limit: number
}

// 批量获取任务图片的响应
export interface BatchGetTaskImagesResponse {
  [taskId: string]: string[]
}

// 重新生成商品标题的请求参数
export interface RegenerateProductTitlesRequest {
  productIds: string[]
  productSpec?: string
  productUsage?: string
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
  },

  // 批量获取任务图片
  batchGetTaskImages: async (taskIds: string[]): Promise<BatchGetTaskImagesResponse> => {
    const response = await apiClient.post('/products/batch-get-task-images', { taskIds })
    return response.data
  },

  // 重新生成商品标题
  regenerateTitles: async (request: RegenerateProductTitlesRequest): Promise<void> => {
    const response = await apiClient.post('/products/regenerate-titles', request)
    return response.data
  }
}