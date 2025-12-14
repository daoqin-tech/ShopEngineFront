import { apiClient } from '@/lib/api';

// 通用响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// Temu API 返回的分类
export interface TemuAPICategory {
  catId: number;
  catName: string;
  catType: number;
  catLevel: number;
  parentCatId: number;
  isLeaf: boolean;
  isHidden: boolean;
  hiddenType: number;
}

// 分类路径（搜索结果包含完整层级）
export interface TemuCategoryPath {
  cat1?: TemuAPICategory;
  cat2?: TemuAPICategory;
  cat3?: TemuAPICategory;
  cat4?: TemuAPICategory;
  cat5?: TemuAPICategory;
  cat6?: TemuAPICategory;
  cat7?: TemuAPICategory;
  cat8?: TemuAPICategory;
  cat9?: TemuAPICategory;
  cat10?: TemuAPICategory;
}

// 搜索分类响应
export interface SearchCategoriesResponse {
  categoryPaths: TemuCategoryPath[];
  total: number;
}

// 获取子分类响应
export interface GetCategoriesResponse {
  categories: TemuAPICategory[];
  total: number;
}

// ===================== 产品属性模板相关类型 =====================

// 属性值
export interface ProductAttributeValue {
  vid: number;           // 属性值ID
  value: string;         // 属性值（Temu API 返回的字段名是 value）
  specId?: number;       // 规格ID
  lang2Value?: string;   // 多语言属性值
}

// 属性分组
export interface ProductAttributeGroup {
  name: string;
  id: number;
}

// 产品属性项
export interface ProductAttributeProperty {
  pid: number;                    // 基础属性ID
  templatePid: number;            // 模板属性ID
  name: string;                   // 属性名称
  required: boolean;              // 是否必填
  isSale?: boolean;               // 是否销售属性
  mainSale?: boolean;             // 是否为主销售属性
  referenceType?: number;         // 属性引用类型
  propertyValueType?: number;     // 属性值类型
  inputMaxNum?: number;           // 最大可输入数量
  chooseMaxNum?: number;          // 最大可选数目
  valueUnit?: string[];           // 属性值单位列表
  minValue?: string;              // 输入最小值
  mainValue?: string;             // 输入最大值
  valuePrecision?: number;        // 小数点允许输入最大精度
  refPid?: number;                // 关联属性ID
  parentTemplatePid?: number;     // 模板父属性ID
  parentRefPid?: number;          // 父属性ID
  group?: ProductAttributeGroup;  // 属性分组
  values?: ProductAttributeValue[];  // 属性值列表
  numberInputTitle?: string;      // 数字输入标题
  extendInfo?: string;            // 扩展信息
  feature?: number;               // 特殊特性
  showType?: number;              // 展示字段类型
}

// 产品属性模板响应
export interface ProductAttributesResponse {
  properties: ProductAttributeProperty[];   // 属性列表
  inputMaxSpecNum?: number;                 // SKU属性输入数量
  chooseAllQualifySpec?: boolean;           // 限定是否接受全选
  singleSpecValueNum?: number;              // 单个自定义规格最大上限
  total: number;                            // 属性总数
}

export const temuCategoryAPIService = {
  // 从 Temu API 搜索分类（根据关键词）
  searchCategories: async (searchText: string, siteId?: number): Promise<SearchCategoriesResponse> => {
    const params: Record<string, string | number> = { searchText };
    if (siteId !== undefined) {
      params.siteId = siteId;
    }
    const response = await apiClient.get<ApiResponse<SearchCategoriesResponse>>('/temu/api/categories/search', { params });
    return (response as unknown as ApiResponse<SearchCategoriesResponse>).data;
  },

  // 从 Temu API 浏览分类（按父分类获取子分类）
  getCategories: async (parentCatId?: number, showHidden?: boolean, siteId?: number): Promise<GetCategoriesResponse> => {
    const params: Record<string, string | number | boolean> = {};
    if (parentCatId !== undefined) {
      params.parentCatId = parentCatId;
    }
    if (showHidden !== undefined) {
      params.showHidden = showHidden;
    }
    if (siteId !== undefined) {
      params.siteId = siteId;
    }
    const response = await apiClient.get<ApiResponse<GetCategoriesResponse>>('/temu/api/categories/browse', { params });
    return (response as unknown as ApiResponse<GetCategoriesResponse>).data;
  },

  // 从 Temu API 获取产品属性模板
  getProductAttributes: async (catId: number): Promise<ProductAttributesResponse> => {
    const params = { catId };
    const response = await apiClient.get<ApiResponse<ProductAttributesResponse>>('/temu/api/categories/attributes', { params });
    return (response as unknown as ApiResponse<ProductAttributesResponse>).data;
  },
};

// 导出别名以兼容旧代码
export const temuShopCategoryService = temuCategoryAPIService;
