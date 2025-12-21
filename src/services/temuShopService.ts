import { apiClient } from '@/lib/api';

// 产地国家枚举
export interface OriginCountry {
  code: string;          // 国家简称（如 CN）
  name: string;          // 中文名称
  nameEn: string;        // 英文名称
  requireRegion: boolean; // 是否需要填写省份
}

// 产地省份枚举（中国）
export interface OriginRegion {
  region2Id: number;     // 省份ID
  name: string;          // 省份名称
}

// 发货时效选项
export const SHIPMENT_LIMIT_OPTIONS = [
  { value: 86400, label: '24小时' },
  { value: 172800, label: '48小时' },
  { value: 259200, label: '72小时' },
  { value: 345600, label: '96小时' },
  { value: 432000, label: '5天' },
  { value: 518400, label: '6天' },
  { value: 604800, label: '7天' },
  { value: 691200, label: '8天' },
  { value: 777600, label: '9天' },
];

// Temu 站点类型
export interface TemuSite {
  siteId: number;
  siteName: string;
  isOpen: boolean;
  region: string | null;
}

// 站点列表响应
export interface TemuSiteListResponse {
  sites: TemuSite[];
  total: number;
}

// Temu 仓库类型
export interface TemuWarehouse {
  warehouseId: string;
  warehouseName: string;
  managementType: string;
  warehouseDisable: boolean;
  siteId: number;
  siteName: string;
}

// 仓库列表响应
export interface TemuWarehouseListResponse {
  warehouses: TemuWarehouse[];
  total: number;
}

// Temu 运费模板类型
export interface TemuFreightTemplate {
  freightTemplateId: string;
  templateName: string;
}

// 运费模板列表响应
export interface TemuFreightTemplateListResponse {
  templates: TemuFreightTemplate[];
  total: number;
}

// Temu 店铺类型
export interface TemuShop {
  id: string;
  name: string;
  shopId: string;
  isSemiManaged: boolean;          // 是否是半托管店铺（true=半托，false=全托）
  businessCode: string;
  siteId?: number;
  siteName?: string;
  warehouseId?: string;
  warehouseName?: string;
  freightTemplateId?: string;
  freightTemplateName?: string;
  // 产地信息
  originCountry: string;           // 国家简称（默认 CN）
  originRegion2Id?: number;        // 省份ID（如 43000000000006 = 广东省）
  originRegionName?: string;       // 省份名称（如：广东省）
  // 发货时效
  shipmentLimitSecond?: number;    // 发货时效（秒），默认 172800 = 48小时
  isActive: boolean;
  hasApiCredentials: boolean;
  tokenExpireAt?: string;          // Token 过期时间
  mallId?: number;                 // Temu 平台的 mallId
  apiScopeList?: string[];         // 已授权的接口列表
  createdAt: string;
  updatedAt: string;
}

// 店铺列表响应
export interface TemuShopListResponse {
  shops: TemuShop[];
  total: number;
}

// 创建店铺请求（店铺类型由后端通过 API 自动获取）
export interface CreateTemuShopRequest {
  name: string;
  shopId: string;
  businessCode: string;
  siteId?: number;
  siteName?: string;
  warehouseId?: string;
  warehouseName?: string;
  freightTemplateId?: string;
  freightTemplateName?: string;
  // 产地信息
  originCountry?: string;          // 国家简称（默认 CN）
  originRegion2Id?: number;        // 省份ID
  originRegionName?: string;       // 省份名称
  // 发货时效
  shipmentLimitSecond?: number;    // 发货时效（秒）
  // API 凭证
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
}

// 更新店铺请求（店铺类型由后端通过 API 自动获取）
export interface UpdateTemuShopRequest {
  name: string;
  shopId: string;
  businessCode: string;
  siteId?: number;
  siteName?: string;
  warehouseId?: string;
  warehouseName?: string;
  freightTemplateId?: string;
  freightTemplateName?: string;
  // 产地信息
  originCountry?: string;          // 国家简称（默认 CN）
  originRegion2Id?: number;        // 省份ID
  originRegionName?: string;       // 省份名称
  // 发货时效
  shipmentLimitSecond?: number;    // 发货时效（秒）
  // API 凭证
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
  isActive: boolean;
}

// 验证 API 凭证请求
export interface VerifyCredentialsRequest {
  appKey: string;
  appSecret: string;
  accessToken: string;
}

// 验证 API 凭证响应
export interface VerifyCredentialsResponse {
  valid: boolean;              // 凭证是否有效
  isSemiManaged: boolean;      // 是否是半托管店铺
  isThriftStore: boolean;      // 是否是二手店
  mallId: number;              // Temu 平台的 mallId
  tokenExpireAt: string;       // Token 过期时间
  apiScopeList: string[];      // 已授权的接口列表
  errorMessage?: string;       // 错误信息（如果验证失败）
}

export const temuShopService = {
  // 获取所有店铺
  getAllShops: async (activeOnly = false): Promise<TemuShopListResponse> => {
    const response = await apiClient.get('/temu/shops', {
      params: activeOnly ? { activeOnly: 'true' } : {},
    });
    return response.data;
  },

  // 根据 ID 获取店铺
  getShopById: async (id: string): Promise<TemuShop> => {
    const response = await apiClient.get(`/temu/shops/${id}`);
    return response.data;
  },

  // 创建店铺
  createShop: async (data: CreateTemuShopRequest): Promise<TemuShop> => {
    const response = await apiClient.post('/temu/shops', data);
    return response.data;
  },

  // 更新店铺
  updateShop: async (id: string, data: UpdateTemuShopRequest): Promise<TemuShop> => {
    const response = await apiClient.put(`/temu/shops/${id}`, data);
    return response.data;
  },

  // 删除店铺
  deleteShop: async (id: string): Promise<void> => {
    await apiClient.delete(`/temu/shops/${id}`);
  },

  // 获取站点列表
  getSites: async (): Promise<TemuSiteListResponse> => {
    const response = await apiClient.get('/temu/sites');
    return response.data;
  },

  // 获取仓库列表（需要店铺 ID 来获取 API 凭证）
  getWarehouses: async (shopId: string, siteId?: number): Promise<TemuWarehouseListResponse> => {
    const params: Record<string, string> = {};
    if (siteId !== undefined) {
      params.siteId = String(siteId);
    }
    const response = await apiClient.get(`/temu/shops/${shopId}/warehouses`, { params });
    return response.data;
  },

  // 获取运费模板列表（需要店铺 ID 来获取 API 凭证）
  getFreightTemplates: async (shopId: string, siteId?: number): Promise<TemuFreightTemplateListResponse> => {
    const params: Record<string, string> = {};
    if (siteId !== undefined) {
      params.siteId = String(siteId);
    }
    const response = await apiClient.get(`/temu/shops/${shopId}/freight-templates`, { params });
    return response.data;
  },

  // 获取产地国家枚举
  getOriginCountries: async (): Promise<OriginCountry[]> => {
    const response = await apiClient.get('/system-configs/key/temu_origin_countries');
    try {
      return JSON.parse(response.data.configValue);
    } catch {
      return [];
    }
  },

  // 获取产地省份枚举（中国）
  getOriginRegions: async (): Promise<OriginRegion[]> => {
    const response = await apiClient.get('/system-configs/key/temu_origin_regions_cn');
    try {
      return JSON.parse(response.data.configValue);
    } catch {
      return [];
    }
  },

  // 刷新店铺类型（从 Temu API 获取最新类型）
  refreshShopType: async (shopId: string): Promise<TemuShop> => {
    const response = await apiClient.post(`/temu/shops/${shopId}/refresh-type`);
    return response.data;
  },

  // 验证 API 凭证（不保存，仅验证并返回店铺信息）
  verifyCredentials: async (data: VerifyCredentialsRequest): Promise<VerifyCredentialsResponse> => {
    const response = await apiClient.post('/temu/verify-credentials', data);
    return response.data;
  },
};
