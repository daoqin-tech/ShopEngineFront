import { apiClient } from '@/lib/api';
import type {
  ProductCategorySpec,
  CreateProductCategorySpecRequest,
  UpdateProductCategorySpecRequest,
} from '@/types/productCategorySpec';

export const productCategorySpecService = {
  // 创建规格配置
  createSpec: async (
    data: CreateProductCategorySpecRequest
  ): Promise<ProductCategorySpec> => {
    const response = await apiClient.post('/category-specs', data);
    return response.data;
  },

  // 根据ID获取规格配置
  getSpecById: async (id: string): Promise<ProductCategorySpec> => {
    const response = await apiClient.get(`/category-specs/${id}`);
    return response.data;
  },

  // 根据分类ID获取所有规格配置
  getSpecsByCategoryId: async (
    categoryId: string,
    activeOnly = false
  ): Promise<ProductCategorySpec[]> => {
    const response = await apiClient.get(
      `/category-specs/category/${categoryId}`,
      {
        params: { activeOnly },
      }
    );
    return response.data;
  },

  // 更新规格配置
  updateSpec: async (
    id: string,
    data: UpdateProductCategorySpecRequest
  ): Promise<ProductCategorySpec> => {
    const response = await apiClient.put(`/category-specs/${id}`, data);
    return response.data;
  },

  // 删除规格配置
  deleteSpec: async (id: string): Promise<void> => {
    await apiClient.delete(`/category-specs/${id}`);
  },
};
