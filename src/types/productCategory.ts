// 产品分类
export interface ProductCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  typeCode?: string;  // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;  // 尺寸代码(如: 15, 30, 21, 66)
  createdAt: string;
  updatedAt: string;
}

// 创建分类请求
export interface CreateProductCategoryRequest {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
  typeCode?: string;  // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;  // 尺寸代码(如: 15, 30, 21, 66)
}

// 更新分类请求
export interface UpdateProductCategoryRequest {
  name: string;
  sortOrder: number;
  isActive: boolean;
  typeCode?: string;  // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;  // 尺寸代码(如: 15, 30, 21, 66)
}
