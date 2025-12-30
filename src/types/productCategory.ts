// 产品分类
export interface ProductCategory {
  id: string;
  name: string;
  nameEn?: string;             // 英文名称
  sortOrder: number;
  isActive: boolean;
  typeCode?: string;           // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;           // 尺寸代码(如: 15, 30, 21, 66)
  manufacturingLength?: number; // 生产长度(cm) - 父分类独有
  manufacturingWidth?: number;  // 生产宽度(cm) - 父分类独有
  manufacturingHeight?: number; // 生产高度(cm) - 父分类独有
  productSpec?: string;         // 商品规格描述（Temu上架用）- 已废弃，请使用标题模板
  productUsage?: string;        // 商品用途（Temu上架用）- 已废弃，请使用标题模板
  titleTemplateId?: string;     // 关联的标题模板ID
  temuTemplateIds?: string[];   // 关联的Temu模板ID列表 - 子分类独有
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
  manufacturingLength?: number; // 生产长度(cm) - 父分类独有
  manufacturingWidth?: number;  // 生产宽度(cm) - 父分类独有
  manufacturingHeight?: number; // 生产高度(cm) - 父分类独有
  productSpec?: string;         // 商品规格描述（Temu上架用）- 已废弃
  productUsage?: string;        // 商品用途（Temu上架用）- 已废弃
  titleTemplateId?: string;     // 关联的标题模板ID
  temuTemplateIds?: string[];   // 关联的Temu模板ID列表 - 子分类独有
}

// 更新分类请求
export interface UpdateProductCategoryRequest {
  name: string;
  nameEn?: string;             // 英文名称
  sortOrder: number;
  isActive: boolean;
  typeCode?: string;           // 类型代码(如: SZ, BZ, HR, SR, ST)
  sizeCode?: string;           // 尺寸代码(如: 15, 30, 21, 66)
  manufacturingLength?: number; // 生产长度(cm) - 父分类独有
  manufacturingWidth?: number;  // 生产宽度(cm) - 父分类独有
  manufacturingHeight?: number; // 生产高度(cm) - 父分类独有
  productSpec?: string;         // 商品规格描述（Temu上架用）- 已废弃
  productUsage?: string;        // 商品用途（Temu上架用）- 已废弃
  titleTemplateId?: string;     // 关联的标题模板ID
  temuTemplateIds?: string[];   // 关联的Temu模板ID列表 - 子分类独有
}

// ============ 父子分类相关类型（新增） ============

// 产品分类（支持父子层级）
export interface ProductCategoryWithChildren extends ProductCategory {
  parentId?: string | null;    // 父分类ID，null表示顶级分类
  children?: ProductCategoryWithChildren[];  // 子分类列表
  parent?: ProductCategorySimple;   // 父分类信息（仅查询子分类时返回）
}

// 简化的分类信息（用于父分类引用）
export interface ProductCategorySimple {
  id: string;
  name: string;
  nameEn?: string;
  manufacturingLength?: number;
  manufacturingWidth?: number;
  manufacturingHeight?: number;
}

// 创建分类请求（支持父子层级）
export interface CreateProductCategoryWithParentRequest extends CreateProductCategoryRequest {
  parentId?: string | null;    // 父分类ID，null表示顶级分类
}

// 更新分类请求（支持父子层级）
export interface UpdateProductCategoryWithParentRequest extends UpdateProductCategoryRequest {
  parentId?: string | null;    // 父分类ID，null表示顶级分类
}
