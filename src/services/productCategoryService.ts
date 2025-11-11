import { apiClient } from '@/lib/api';
import type {
  ProductCategory,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
} from '@/types/productCategory';

export const productCategoryService = {
  // 获取所有分类
  getAllCategories: async (activeOnly = false): Promise<ProductCategory[]> => {
    const response = await apiClient.get('/categories', {
      params: { activeOnly },
    });
    return response.data;
  },

  // 根据ID获取分类
  getCategoryById: async (id: string): Promise<ProductCategory> => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  // 创建分类
  createCategory: async (
    data: CreateProductCategoryRequest
  ): Promise<ProductCategory> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  // 更新分类
  updateCategory: async (
    id: string,
    data: UpdateProductCategoryRequest
  ): Promise<ProductCategory> => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  // 删除分类
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
