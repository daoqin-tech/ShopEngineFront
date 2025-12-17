import { apiClient } from '@/lib/api'

// 批量创建商品的请求参数（简化版：大部分信息从数据库自动获取）
export interface BatchCreateProductRequest {
  // 店铺ID（必填）- 店铺账号、运费模板、站点等信息从数据库获取
  shopId: string

  // 任务ID列表（必填）- 每个任务对应一个商品
  taskIds: string[]

  // 是否上架到 Temu（启用后商品创建完成会自动加入上架队列）
  enableListing?: boolean

  // Temu 模板 ID（启用上架时必填，包含分类链、规格、属性、SKU配置等）
  temuTemplateId?: string
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
  },

  // 保存用户手动调整的图片排序
  saveImageSortOrder: async (taskId: string, imageUrls: string[]): Promise<void> => {
    await apiClient.post('/products/save-sort-order', { taskId, imageUrls })
  }
}