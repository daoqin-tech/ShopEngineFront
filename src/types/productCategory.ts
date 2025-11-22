// 产品分类
export interface ProductCategory {
  id: string;
  name: string;
  nameEn?: string;             // 英文名称
  sortOrder: number;
  isActive: boolean;
  typeCode?: string;           // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;           // 尺寸代码(如: 15, 30, 21, 66)
  manufacturingLength?: number; // 生产长度(cm)
  manufacturingWidth?: number;  // 生产宽度(cm)
  manufacturingHeight?: number; // 生产高度(cm)
  createdAt: string;
  updatedAt: string;
}

// 创建分类请求
export interface CreateProductCategoryRequest {
  name: string;
  nameEn?: string;             // 英文名称
  sortOrder?: number;
  isActive?: boolean;
  typeCode?: string;           // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;           // 尺寸代码(如: 15, 30, 21, 66)
  manufacturingLength?: number; // 生产长度(cm)
  manufacturingWidth?: number;  // 生产宽度(cm)
  manufacturingHeight?: number; // 生产高度(cm)
}

// 更新分类请求
export interface UpdateProductCategoryRequest {
  name: string;
  nameEn?: string;             // 英文名称
  sortOrder: number;
  isActive: boolean;
  typeCode?: string;           // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;           // 尺寸代码(如: 15, 30, 21, 66)
  manufacturingLength?: number; // 生产长度(cm)
  manufacturingWidth?: number;  // 生产宽度(cm)
  manufacturingHeight?: number; // 生产高度(cm)
}
