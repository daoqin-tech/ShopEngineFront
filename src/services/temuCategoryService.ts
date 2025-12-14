import { apiClient } from '@/lib/api';

// 通用响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// Temu 产品属性
export interface TemuProductAttribute {
  vid: number;              // 基础属性值 ID
  valueUnit: string;        // 属性值单位
  language?: string;        // 语种
  pid: number;              // 属性 ID
  templatePid: number;      // 模板属性 ID
  numberInputValue: string; // 数值录入
  propValue: string;        // 基础属性值
  valueExtendInfo?: string; // 属性值扩展信息
  propName: string;         // 引用属性名
  refPid: number;           // 引用属性 ID
}

// Temu 分类
export interface TemuCategory {
  id: string;
  catId: number;
  catName: string;
  catLevel: number;
  parentCatId?: number;
  isLeaf: boolean;
  catType?: number;
  fullPath?: string;
  label?: string;  // 标签，用于分组筛选
  productAttributes?: TemuProductAttribute[];
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 分类列表响应
export interface TemuCategoryListResponse {
  categories: TemuCategory[];
  total: number;
}

// 创建分类请求
export interface CreateTemuCategoryRequest {
  catId: number;
  catName: string;
  catLevel?: number;
  parentCatId?: number;
  isLeaf?: boolean;
  catType?: number;
  fullPath?: string;
  label?: string;  // 标签，用于分组筛选
  productAttributes?: TemuProductAttribute[];
}

// 更新分类请求
export interface UpdateTemuCategoryRequest {
  catName: string;
  catLevel?: number;
  parentCatId?: number;
  isLeaf?: boolean;
  catType?: number;
  fullPath?: string;
  label?: string;  // 标签，用于分组筛选
  productAttributes?: TemuProductAttribute[];
  isActive?: boolean;
}

export const temuCategoryService = {
  // 获取所有分类
  getAllCategories: async (activeOnly = false, leafOnly = false): Promise<TemuCategoryListResponse> => {
    const params: Record<string, string> = {};
    if (activeOnly) params.activeOnly = 'true';
    if (leafOnly) params.leafOnly = 'true';
    const response = await apiClient.get<ApiResponse<TemuCategoryListResponse>>('/temu/categories', { params });
    return (response as unknown as ApiResponse<TemuCategoryListResponse>).data;
  },

  // 根据 ID 获取分类
  getCategoryById: async (id: string): Promise<TemuCategory> => {
    const response = await apiClient.get<ApiResponse<TemuCategory>>(`/temu/categories/${id}`);
    return (response as unknown as ApiResponse<TemuCategory>).data;
  },

  // 根据 Temu 分类 ID 获取分类
  getCategoryByCatId: async (catId: number): Promise<TemuCategory> => {
    const response = await apiClient.get<ApiResponse<TemuCategory>>(`/temu/categories/by-cat-id/${catId}`);
    return (response as unknown as ApiResponse<TemuCategory>).data;
  },

  // 创建分类
  createCategory: async (data: CreateTemuCategoryRequest): Promise<TemuCategory> => {
    const response = await apiClient.post<ApiResponse<TemuCategory>>('/temu/categories', data);
    return (response as unknown as ApiResponse<TemuCategory>).data;
  },

  // 更新或创建分类
  upsertCategory: async (data: CreateTemuCategoryRequest): Promise<TemuCategory> => {
    const response = await apiClient.post<ApiResponse<TemuCategory>>('/temu/categories/upsert', data);
    return (response as unknown as ApiResponse<TemuCategory>).data;
  },

  // 更新分类
  updateCategory: async (id: string, data: UpdateTemuCategoryRequest): Promise<TemuCategory> => {
    const response = await apiClient.put<ApiResponse<TemuCategory>>(`/temu/categories/${id}`, data);
    return (response as unknown as ApiResponse<TemuCategory>).data;
  },

  // 删除分类
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/temu/categories/${id}`);
  },
};
