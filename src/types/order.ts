// 订单导入相关类型

export interface OrderImportItem {
  orderNo: string;
  sku: string;
  quantity: number;
}

export interface OrderImportRequest {
  orders: OrderImportItem[];
  importDate?: string;
}

export interface OrderImportResponse {
  totalCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
}

// 统计相关类型

export interface OrderStatsRequest {
  startDate?: string;
  endDate?: string;
  shopId?: string;
  sku?: string;
}

export interface OrderStatsResponse {
  totalSales: number;
  orderCount: number;
  skuCount: number;
  shopCount: number;
}

export interface TopSKUsRequest {
  startDate?: string;
  endDate?: string;
  shopId?: string;
  limit?: number;
}

export interface SKUSalesItem {
  rank: number;
  sku: string;
  productName: string;
  productNameEn: string;
  previewImage: string;
  productImages: string[];
  totalSales: number;
  orderCount: number;
  shopId: string;
  shopName: string;
  aiProjectId: string;
  aiProjectName: string;
}

export interface TopSKUsResponse {
  items: SKUSalesItem[];
}

export interface ShopSalesItem {
  shopId: string;
  shopName: string;
  totalSales: number;
  orderCount: number;
  skuCount: number;
}

export interface ShopStatsResponse {
  items: ShopSalesItem[];
}

export interface DailySalesItem {
  date: string;
  totalSales: number;
  orderCount: number;
}

export interface DailySalesResponse {
  items: DailySalesItem[];
}
