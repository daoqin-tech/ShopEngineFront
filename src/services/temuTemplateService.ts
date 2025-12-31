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

// 子规格值（用于创建SKU时的规格值）
export interface TemuSpecValue {
  specId?: number;   // 规格ID（创建后由Temu返回）
  specName: string;  // 规格名称（如：红色、S、M、L）
}

// 规格配置（父规格+子规格值列表）
export interface TemuSpecification {
  parentSpecId: number;      // 父规格ID（来自 bg.goods.parentspec.get）
  parentSpecName: string;    // 父规格名称（如：颜色、型号、尺码）
  specValues: TemuSpecValue[]; // 子规格值列表
}

// SKU 体积配置
export interface TemuSkuVolumeConfig {
  longestSide: number;   // 最长边（mm）
  middleSide: number;    // 次长边（mm）
  shortestSide: number;  // 最短边（mm）
}

// SKU 重量配置
export interface TemuSkuWeightConfig {
  weight: number;    // 重量（毫克 mg）
}

// SKU 敏感属性配置
export interface TemuSkuSensitiveConfig {
  isSensitive: boolean;     // 是否敏感货品
  sensitiveList: number[];  // 敏感类型列表
}

// SKU 分类类型
// single: 单品 - 仅1件商品（如1个碗、1对耳环）
// sameMultiPack: 同款多件装 - 多件同规格同种类单品（如2个相同的杯子）
// mixedSet: 混合套装 - 多件不同品类/规格单品（如1个杯子+1个勺子）
export type SkuClassType = 'single' | 'sameMultiPack' | 'mixedSet';

// 按规格组合的 SKU 配置（包含价格、库存、体积重量等）
export interface TemuSpecVolumeWeightConfig {
  specValues: string[];           // 规格值组合（如 ["复古", "纸"]）
  // SKU 信息
  supplierPrice?: number;         // 申报价格/供货价（元）
  thumbUrl?: string;              // 预览图/缩略图 URL
  skuClassType?: SkuClassType;    // SKU 分类（单品/多件装/混合套装）
  multiPackQuantity?: number;     // 单品数量（单品默认为1，多件装/套装时必填）
  pieceUnitCode?: number;         // 单件单位：1=件, 2=双, 3=包
  individuallyPacked?: number;    // 是否独立包装：0=否, 1=是（同款多件装或混合套装时必填）
  numberOfPiecesNew?: number;     // 共计内含数量
  suggestedPrice?: number;        // 建议零售价（美元）
  extCode?: string;               // SKU 货号
  stockQuantity?: number;         // 库存
  // 敏感属性与体积重量
  isSensitive: boolean;           // 是否敏感
  sensitiveList: number[];        // 敏感类型列表
  longestSide: number;            // 最长边（mm）
  middleSide: number;             // 次长边（mm）
  shortestSide: number;           // 最短边（mm）
  weight: number;                 // 重量（mg）
}

// SKU 默认配置（模板级别）
export interface TemuSkuDefaultConfig {
  volume?: TemuSkuVolumeConfig;        // 体积配置（全局默认）
  weight?: TemuSkuWeightConfig;        // 重量配置（全局默认）
  sensitive?: TemuSkuSensitiveConfig;  // 敏感属性配置（全局默认）
  defaultSupplierPrice?: number;       // 默认供货价（分）
  defaultStockQuantity?: number;       // 默认库存
  suggestedPrice?: number;             // 建议零售价（分）
  volumeWeightConfigs?: TemuSpecVolumeWeightConfig[];  // 按规格组合的配置
}

// Temu 模板
export interface TemuTemplate {
  id: string;
  name?: string;  // 模板名称
  productCategoryId?: string;  // 产品分类ID（关联 product_categories 表）
  productCategoryName?: string;  // 产品分类名称（从后端填充）
  catId: number;
  catName: string;
  catLevel: number;
  parentCatId?: number;
  isLeaf: boolean;
  catType?: number;
  fullPath?: string;
  // 分类链（用于商品上架时的分类ID）
  cat1Id?: number;
  cat2Id?: number;
  cat3Id?: number;
  cat4Id?: number;
  cat5Id?: number;
  cat6Id?: number;
  cat7Id?: number;
  cat8Id?: number;
  cat9Id?: number;
  cat10Id?: number;
  productAttributes?: TemuProductAttribute[];
  inputMaxSpecNum?: number;      // 最大自定义规格数量（0表示不支持自定义规格）
  singleSpecValueNum?: number;   // 单个规格最大值数量
  specifications?: TemuSpecification[]; // 规格配置列表
  skuDefaultConfig?: TemuSkuDefaultConfig; // SKU 默认配置
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 模板列表响应
export interface TemuTemplateListResponse {
  templates: TemuTemplate[];
  total: number;
}

// 创建模板请求
export interface CreateTemuTemplateRequest {
  name?: string;  // 模板名称
  productCategoryId?: string;  // 产品分类ID
  catId: number;
  catName: string;
  catLevel?: number;
  parentCatId?: number;
  isLeaf?: boolean;
  catType?: number;
  fullPath?: string;
  // 分类链（用于商品上架时的分类ID）
  cat1Id?: number;
  cat2Id?: number;
  cat3Id?: number;
  cat4Id?: number;
  cat5Id?: number;
  cat6Id?: number;
  cat7Id?: number;
  cat8Id?: number;
  cat9Id?: number;
  cat10Id?: number;
  productAttributes?: TemuProductAttribute[];
  inputMaxSpecNum?: number;      // 最大自定义规格数量
  singleSpecValueNum?: number;   // 单个规格最大值数量
  specifications?: TemuSpecification[]; // 规格配置列表
  skuDefaultConfig?: TemuSkuDefaultConfig; // SKU 默认配置
}

// 更新模板请求
export interface UpdateTemuTemplateRequest {
  name?: string;  // 模板名称
  productCategoryId?: string;  // 产品分类ID
  catId?: number;  // Temu 分类 ID（修改分类时使用）
  catName?: string;
  catLevel?: number;
  parentCatId?: number;
  isLeaf?: boolean;
  catType?: number;
  fullPath?: string;
  // 分类链（用于商品上架时的分类ID）
  cat1Id?: number;
  cat2Id?: number;
  cat3Id?: number;
  cat4Id?: number;
  cat5Id?: number;
  cat6Id?: number;
  cat7Id?: number;
  cat8Id?: number;
  cat9Id?: number;
  cat10Id?: number;
  productAttributes?: TemuProductAttribute[];
  inputMaxSpecNum?: number;      // 最大自定义规格数量
  singleSpecValueNum?: number;   // 单个规格最大值数量
  specifications?: TemuSpecification[]; // 规格配置列表
  skuDefaultConfig?: TemuSkuDefaultConfig; // SKU 默认配置
  isActive?: boolean;
}

export const temuTemplateService = {
  // 获取所有模板
  getAllTemplates: async (activeOnly = false, leafOnly = false): Promise<TemuTemplateListResponse> => {
    const params: Record<string, string> = {};
    if (activeOnly) params.activeOnly = 'true';
    if (leafOnly) params.leafOnly = 'true';
    const response = await apiClient.get<ApiResponse<TemuTemplateListResponse>>('/temu/templates', { params });
    return (response as unknown as ApiResponse<TemuTemplateListResponse>).data;
  },

  // 根据 ID 获取模板
  getTemplateById: async (id: string): Promise<TemuTemplate> => {
    const response = await apiClient.get<ApiResponse<TemuTemplate>>(`/temu/templates/${id}`);
    return (response as unknown as ApiResponse<TemuTemplate>).data;
  },

  // 根据 Temu 分类 ID 获取模板
  getTemplateByCatId: async (catId: number): Promise<TemuTemplate> => {
    const response = await apiClient.get<ApiResponse<TemuTemplate>>(`/temu/templates/by-cat-id/${catId}`);
    return (response as unknown as ApiResponse<TemuTemplate>).data;
  },

  // 创建模板
  createTemplate: async (data: CreateTemuTemplateRequest): Promise<TemuTemplate> => {
    const response = await apiClient.post<ApiResponse<TemuTemplate>>('/temu/templates', data);
    return (response as unknown as ApiResponse<TemuTemplate>).data;
  },

  // 更新或创建模板
  upsertTemplate: async (data: CreateTemuTemplateRequest): Promise<TemuTemplate> => {
    const response = await apiClient.post<ApiResponse<TemuTemplate>>('/temu/templates/upsert', data);
    return (response as unknown as ApiResponse<TemuTemplate>).data;
  },

  // 更新模板
  updateTemplate: async (id: string, data: UpdateTemuTemplateRequest): Promise<TemuTemplate> => {
    const response = await apiClient.put<ApiResponse<TemuTemplate>>(`/temu/templates/${id}`, data);
    return (response as unknown as ApiResponse<TemuTemplate>).data;
  },

  // 删除模板
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/temu/templates/${id}`);
  },
};
