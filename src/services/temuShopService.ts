import { apiClient } from '@/lib/api';

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
  type: '全托' | '半托';
  businessCode: string;
  account: string;
  siteId?: number;
  siteName?: string;
  warehouseId?: string;
  warehouseName?: string;
  freightTemplateId?: string;
  freightTemplateName?: string;
  isActive: boolean;
  hasApiCredentials: boolean;
  createdAt: string;
  updatedAt: string;
}

// 店铺列表响应
export interface TemuShopListResponse {
  shops: TemuShop[];
  total: number;
}

// 创建店铺请求
export interface CreateTemuShopRequest {
  name: string;
  shopId: string;
  type: '全托' | '半托';
  businessCode: string;
  account: string;
  siteId?: number;
  siteName?: string;
  warehouseId?: string;
  warehouseName?: string;
  freightTemplateId?: string;
  freightTemplateName?: string;
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
}

// 更新店铺请求
export interface UpdateTemuShopRequest {
  name: string;
  shopId: string;
  type: '全托' | '半托';
  businessCode: string;
  account: string;
  siteId?: number;
  siteName?: string;
  warehouseId?: string;
  warehouseName?: string;
  freightTemplateId?: string;
  freightTemplateName?: string;
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
  isActive: boolean;
}

export const temuShopService = {
  // 获取所有店铺
  getAllShops: async (activeOnly = false): Promise<TemuShopListResponse> => {
    const response = await apiClient.get('/temu/shops', {
      params: activeOnly ? { activeOnly: 'true' } : {},
    });
    return response.data;
  },

  // 根据账号获取店铺
  getShopsByAccount: async (account: string): Promise<TemuShopListResponse> => {
    const response = await apiClient.get('/temu/shops', {
      params: { account },
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
};
