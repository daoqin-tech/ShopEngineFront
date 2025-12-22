import { apiClient } from '@/lib/api';

// 通用响应格式
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ===================== 敏感属性类型 =====================
export const SENSITIVE_TYPES = [
  { id: 110001, name: '纯电' },
  { id: 120001, name: '内电' },
  { id: 130001, name: '磁性' },
  { id: 140001, name: '液体' },
  { id: 150001, name: '粉末' },
  { id: 160001, name: '膏体' },
  { id: 170001, name: '刀具' },
] as const;

// ===================== SKU 体积配置 =====================
export interface SkuVolumeConfig {
  len: number;      // 长度（mm）
  width: number;    // 宽度（mm）
  height: number;   // 高度（mm）
}

// ===================== SKU 重量配置 =====================
export interface SkuWeightConfig {
  value: number;    // 重量（mg 毫克）
}

// ===================== SKU 敏感属性配置 =====================
export interface SkuSensitiveConfig {
  isSensitive: boolean;     // 是否敏感货品
  sensitiveList: number[];  // 敏感类型列表
}

// ===================== SKU 仓配扩展属性 =====================
export interface SkuWhExtAttrConfig {
  volume?: SkuVolumeConfig;
  weight?: SkuWeightConfig;
  sensitive?: SkuSensitiveConfig;
}

// ===================== SKU 供货价 =====================
export interface SiteSupplierPrice {
  siteId: number;        // 站点ID
  supplierPrice: number; // 供货价（分）
}

// ===================== SKU 库存配置 =====================
export interface WarehouseStockQuantity {
  targetStockAvailable: number;  // 目标可用库存
  warehouseId?: string;          // 仓库ID
}

export interface SkuStockQuantityConfig {
  warehouseStockQuantityReqs: WarehouseStockQuantity[];
}

// ===================== SKU 建议零售价 =====================
export interface SkuSuggestedPriceConfig {
  specialSuggestedPrice: number; // 特殊建议零售价（分）
}

// ===================== SKU 规格 =====================
export interface SkuSpecConfig {
  parentSpecId: number;
  parentSpecName: string;
  specId: number;
  specName: string;
}

// ===================== SKU 配置 =====================
export interface SkuConfig {
  productSkuSpecReqs?: SkuSpecConfig[];       // SKU 规格列表
  thumbUrl?: string;                          // 缩略图URL
  extCode?: string;                           // 外部编码
  currencyType?: number;                      // 货币类型
  siteSupplierPrices?: SiteSupplierPrice[];   // 站点供货价列表
  productSkuStockQuantityReq?: SkuStockQuantityConfig; // 库存配置
  productSkuWhExtAttrReq?: SkuWhExtAttrConfig; // 仓配扩展属性
  productSkuSuggestedPriceReq?: SkuSuggestedPriceConfig; // 建议零售价
}

// ===================== 主销售规格 =====================
export interface MainSkuSpecConfig {
  parentSpecId: number;
  parentSpecName: string;
  specId: number;
  specName: string;
}

// ===================== SKC 配置 =====================
export interface SkcConfig {
  previewImgUrls?: string[];                       // 预览图URL列表
  extCode?: string;                                // 外部编码
  colorImageUrl?: string;                          // 色卡图URL
  mainProductSkuSpecReqs?: MainSkuSpecConfig[];    // 主销售规格
  productSkuReqs: SkuConfig[];                     // SKU 列表
}

// ===================== 商品属性 =====================
export interface ProductPropertyConfig {
  pid: number;
  templatePid: number;
  refPid?: number;
  propName?: string;
  vid?: number;
  propValue?: string;
  valueUnit?: string;
  numberInputValue?: string;
}

// ===================== 规格属性 =====================
export interface ProductSpecPropertyConfig {
  parentSpecId: number;
  parentSpecName: string;
  specId: number;
  specName: string;
  refPid?: number;
  pid?: number;
  templatePid?: number;
  propName?: string;
  vid?: number;
  propValue?: string;
  valueUnit?: string;
  valueGroupId?: number;
  valueGroupName?: string;
}

// ===================== 发货配置 =====================
export interface ProductShipmentConfig {
  freightTemplateId?: number;
  shipmentLimitSecond?: number;
}

// ===================== 仓库路由 =====================
export interface TargetRoute {
  siteIdList: number[];
  warehouseId?: string;
}

export interface ProductWarehouseRouteConfig {
  targetRouteList: TargetRoute[];
}

// ===================== 半托管配置 =====================
export interface ProductSemiManagedConfig {
  bindSiteIds?: number[];
}

// ===================== 产地信息 =====================
export interface ProductOriginConfig {
  countryShortName: string;
}

// ===================== 商品级仓配扩展属性 =====================
export interface ProductWhExtAttrConfig {
  outerGoodsUrl?: string;
  productOrigin?: ProductOriginConfig;
}

// ===================== 多语言标题 =====================
export interface ProductI18nConfig {
  language: string;
  productName: string;
}

// ===================== 商品发布请求 =====================
export interface GoodsAddRequest {
  // 分类ID（必填，至少前3级）
  cat1Id: number;
  cat2Id: number;
  cat3Id: number;
  cat4Id?: number;
  cat5Id?: number;
  cat6Id?: number;
  cat7Id?: number;
  cat8Id?: number;
  cat9Id?: number;
  cat10Id?: number;

  // 商品名称（必填）
  productName: string;

  // 轮播图URL列表（必填，1-15张）
  carouselImageUrls: string[];

  // 素材图URL
  materialImgUrl?: string;

  // 商品属性列表
  productPropertyReqs?: ProductPropertyConfig[];

  // 规格属性列表
  productSpecPropertyReqs?: ProductSpecPropertyConfig[];

  // SKC 列表（必填）
  productSkcReqs: SkcConfig[];

  // 多语言标题
  productI18nReqs?: ProductI18nConfig[];

  // 发货配置
  productShipmentReq?: ProductShipmentConfig;

  // 仓库路由配置
  productWarehouseRouteReq?: ProductWarehouseRouteConfig;

  // 半托管配置
  productSemiManagedReq?: ProductSemiManagedConfig;

  // 商品级仓配扩展属性
  productWhExtAttrReq?: ProductWhExtAttrConfig;
}

// ===================== SKC 结果 =====================
export interface GoodsAddSkcResult {
  productSkcId: number;
}

// ===================== SKU 规格结果 =====================
export interface GoodsAddSkuSpecResult {
  specId: number;
  parentSpecName: string;
  specName: string;
  parentSpecId: number;
}

// ===================== SKU 结果 =====================
export interface GoodsAddSkuResult {
  productSkuId: number;
  extCode?: string;
  productSkcId: number;
  skuSpecList?: GoodsAddSkuSpecResult[];
}

// ===================== 商品发布响应 =====================
export interface GoodsAddResponse {
  productId: number;
  productSkcList?: GoodsAddSkcResult[];
  productSkuList?: GoodsAddSkuResult[];
}

// ===================== SKU 默认配置（用于模板） =====================
export interface SkuDefaultConfig {
  // 体积配置（所有 SKU 共用）
  volume?: SkuVolumeConfig;
  // 重量配置（所有 SKU 共用）
  weight?: SkuWeightConfig;
  // 敏感属性配置（所有 SKU 共用）
  sensitive?: SkuSensitiveConfig;
  // 默认供货价（分，可被各 SKU 覆盖）
  defaultSupplierPrice?: number;
  // 默认库存
  defaultStockQuantity?: number;
  // 建议零售价（分）
  suggestedPrice?: number;
}

// ===================== 商品发布服务 =====================
export const temuGoodsService = {
  // 发布商品
  addGoods: async (request: GoodsAddRequest): Promise<GoodsAddResponse> => {
    const response = await apiClient.post<ApiResponse<GoodsAddResponse>>('/temu/api/goods', request);
    return (response as unknown as ApiResponse<GoodsAddResponse>).data;
  },

  // 辅助函数：将重量从克转换为毫克
  gramsToMilligrams: (grams: number): number => {
    return Math.round(grams * 1000);
  },

  // 辅助函数：将重量从毫克转换为克
  milligramsToGrams: (milligrams: number): number => {
    return milligrams / 1000;
  },

  // 辅助函数：将价格从元转换为分
  yuanToFen: (yuan: number): number => {
    return Math.round(yuan * 100);
  },

  // 辅助函数：将价格从分转换为元
  fenToYuan: (fen: number): number => {
    return fen / 100;
  },

  // 辅助函数：将长度从厘米转换为毫米
  cmToMm: (cm: number): number => {
    return Math.round(cm * 10);
  },

  // 辅助函数：将长度从毫米转换为厘米
  mmToCm: (mm: number): number => {
    return mm / 10;
  },
};
