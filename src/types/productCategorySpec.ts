// 产品分类规格
export interface ProductCategorySpec {
  id: string;
  categoryId: string;
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
  count: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建规格请求
export interface CreateProductCategorySpecRequest {
  categoryId: string;
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
  count: number;
  sortOrder?: number;
  isActive?: boolean;
}

// 更新规格请求
export interface UpdateProductCategorySpecRequest {
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
  count: number;
  sortOrder: number;
  isActive: boolean;
}
