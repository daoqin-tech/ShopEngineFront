// 产品分类
export interface ProductCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建分类请求
export interface CreateProductCategoryRequest {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 更新分类请求
export interface UpdateProductCategoryRequest {
  name: string;
  sortOrder: number;
  isActive: boolean;
}
