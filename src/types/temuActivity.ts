// Temu 活动类型定义

// 活动类型枚举
export const ActivityTypes = {
  FLASH_SALE: 1,           // 限时秒杀
  PROMOTION: 5,            // 官方大促
  ADVANCED_PROMOTION: 13,  // 大促进阶-限时活动
  CLEARANCE: 27,           // 清仓甩卖
  GROUP_BUY: 31,           // 团购活动
  ADVANCED_FLASH_SALE: 101, // 秒杀进阶
  ADVANCED_CLEARANCE: 127,  // 清仓进阶
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

// 活动类型名称映射（与 Temu API 返回的名称一致）
export const ActivityTypeNames: Record<number, string> = {
  [ActivityTypes.FLASH_SALE]: '限时秒杀',
  [ActivityTypes.PROMOTION]: '官方大促',
  [ActivityTypes.ADVANCED_PROMOTION]: '大促进阶-限时活动',
  [ActivityTypes.CLEARANCE]: '清仓甩卖',
  [ActivityTypes.GROUP_BUY]: '团购活动',
  [ActivityTypes.ADVANCED_FLASH_SALE]: '秒杀进阶',
  [ActivityTypes.ADVANCED_CLEARANCE]: '清仓进阶',
};

// 报名状态枚举
export const EnrollStatuses = {
  ENROLLING: 1,              // 报名中
  ENROLL_FAILED: 2,          // 报名失败
  SUCCESS_PENDING_SESSION: 3, // 报名成功待分配场次
  SUCCESS_ASSIGNED_SESSION: 4, // 报名成功已分配场次
  ACTIVITY_ENDED: 5,          // 报名活动已结束
  ACTIVITY_OFFLINE: 6,        // 报名活动已下线
} as const;

export type EnrollStatus = typeof EnrollStatuses[keyof typeof EnrollStatuses];

export const EnrollStatusNames: Record<EnrollStatus, string> = {
  [EnrollStatuses.ENROLLING]: '报名中',
  [EnrollStatuses.ENROLL_FAILED]: '报名失败',
  [EnrollStatuses.SUCCESS_PENDING_SESSION]: '报名成功待分配场次',
  [EnrollStatuses.SUCCESS_ASSIGNED_SESSION]: '报名成功已分配场次',
  [EnrollStatuses.ACTIVITY_ENDED]: '报名活动已结束',
  [EnrollStatuses.ACTIVITY_OFFLINE]: '报名活动已下线',
};

// 场次状态枚举
export const SessionStatuses = {
  NOT_STARTED: 1,    // 未开始
  IN_PROGRESS: 2,    // 进行中
  ENDED: 3,          // 已结束
} as const;

export type SessionStatus = typeof SessionStatuses[keyof typeof SessionStatuses];

export const SessionStatusNames: Record<SessionStatus, string> = {
  [SessionStatuses.NOT_STARTED]: '未开始',
  [SessionStatuses.IN_PROGRESS]: '进行中',
  [SessionStatuses.ENDED]: '已结束',
};

// 活动主题（场次）
export interface ActivityThematic {
  activityThematicId: number;
  activityThematicName: string;
  activityLabelTag?: number | null;
  startTime?: number;
  endTime?: number;
  enrollDeadLine?: number;
  enrollStartAt?: number;
  durationDays?: number;
  enrollSource?: number;
  benefitLabelName?: string[];
  salePromotionLabel?: string | null;
  sites?: { siteId: number; siteName: string }[];
}

// 活动基本信息
export interface Activity {
  activityType: number;
  activityName: string;
  activityContent: string;
  activityLabelTag?: number | null;
  sessionAssignType?: number;
  benefitLabelName?: string[];
  thematicList?: ActivityThematic[];
  canEnroll?: boolean;
  // 兼容旧字段
  activityThematicId?: number;
  activityThematicName?: string;
  startTime?: number;
  endTime?: number;
}

// 活动列表响应
export interface ActivityListResponse {
  activityList: Activity[];
}

// 活动要求
export interface ActivityRequirement {
  checkStatus: number; // 0-不符合 1-符合 2-报名时检测 3-自动过滤
  checkStatusDesc: string;
  requirementCode: number;
  requirementType: string;
  requirementDesc: string;
}

// 活动详情响应
export interface ActivityDetailResponse {
  requirements: ActivityRequirement[]; // 商品要求
  mallAptitude: ActivityRequirement[]; // 店铺资质
  thematicInfo?: ActivityThematic; // 主题信息
  activityInfo?: Activity; // 活动信息
}

// 活动商品站点价格
export interface ActivityProductSitePrice {
  siteId: number;
  siteName: string;
  dailyPrice: number;           // 日常申报价格（分）
  suggestActivityPrice: number; // 建议申报价格（分）
}

// 活动商品SKU信息
export interface ActivityProductSku {
  skuId: number;
  dailyPrice: number;           // 日常申报价格（分）
  suggestActivityPrice: number; // 建议申报价格（分）
  currency: string;
  sitePriceList: ActivityProductSitePrice[];
}

// 活动商品SKC信息
export interface ActivityProductSkc {
  skcId: number;
  dailyPrice: number;           // 日常申报价格（分）
  activityPrice: number;        // 活动申报价格（分）
  skuList: ActivityProductSku[];
}

// 活动商品（匹配后端 ActivityProductDTO）
export interface ActivityProduct {
  productId: number;
  productName: string;
  currency: string;
  isApparel: number;              // 是否服饰 1-是 0-否
  sites: string[];                // 商品经营站点名称列表
  siteIds: number[];              // 商品经营站点ID列表
  dailyPrice: number;             // 日常价（分）
  suggestActivityPrice: number;   // 参考价（分）
  targetActivityStock: number;    // 目标活动申报商品数（最低限制）
  suggestActivityStock: number;   // 参考库存
  enrollSessionIdList: number[];  // 已报名场次ID列表
  skcList: ActivityProductSkc[];
}

// 活动商品列表响应（匹配后端 GetActivityProductsResponse）
export interface ActivityProductsResponse {
  matchList: ActivityProduct[];   // 符合报名条件的商品
  searchScrollContext?: string;   // 滚动查询上下文
  hasMore: boolean;               // 是否有更多数据
}

// 活动场次（匹配后端 ActivitySessionDTO）
export interface ActivitySession {
  sessionId: number;
  sessionName: string;
  sessionStatus: number;   // 1:未开始 2:进行中 3:已结束 4:报名失败 5:已售罄 6:已下线
  durationDays: number;
  startDateStr: string;
  endDateStr: string;
  startTime: number;
  endTime: number;
  siteId: number;
  siteName: string;
}

// 活动场次列表响应（匹配后端 GetActivitySessionsResponse）
export interface ActivitySessionsResponse {
  siteIds: number[];                              // 站点列表
  list: ActivitySession[];                        // 活动报名场次列表
  productCanEnrollSessionMap: Record<string, ActivitySession[]>; // 货品可报名场次映射（场次对象数组）
}

// 报名站点价格信息
export interface EnrollSitePriceInfo {
  siteId: number;
  siteName: string;
  dailyPrice: number;       // 日常价（分）
  activityPrice: number;    // 活动价（分）
  activityDiscount?: string | null; // 活动折扣
}

// 报名SKU信息
export interface EnrollSkuInfo {
  skuId: number;
  dailyPrice: number;       // 日常价（分）
  activityPrice: number;    // 活动价（分）
  currency?: string;
  sitePriceList?: EnrollSitePriceInfo[]; // 各站点价格列表
}

// 报名SKC信息
export interface EnrollSkcInfo {
  skcId: number;
  dailyPrice: number;    // 日常价（分）
  activityPrice: number; // 活动价（分）
  currency?: string;
  skuList?: EnrollSkuInfo[]; // SKU列表
}

// 分配的场次信息
export interface AssignedSession {
  sessionId: number;
  sessionName?: string;
  sessionStatus: number;
  durationDays?: number;
  startDateStr?: string;
  endDateStr?: string;
  startTime: number;
  endTime: number;
  siteId?: number;
  siteName?: string;
}

// 报名记录（匹配后端 DTO）
export interface ActivityEnrollRecord {
  enrollId: number;
  productId: number;
  goodsId?: number;
  activityType: number;
  activityTypeName?: string;
  activityThematicId?: number;
  activityThematicName?: string;
  enrollStatus: number;  // 1-报名中 2-报名失败 3-待分配场次 4-已分配场次 5-已结束 6-已下线
  enrollTime: number;
  sessionStartTime?: number;
  sessionEndTime?: number;
  isApparel?: number;    // 是否服饰 1-是 0-否
  soldStatus?: number;   // 售罄状态
  activityStock?: number; // 活动申报商品数
  remainingActivityStock?: number; // 剩余活动库存
  currency?: string;
  skcList?: EnrollSkcInfo[];       // SKC列表
  assignSessionList?: AssignedSession[]; // 已分配活动场次
}

// 报名记录列表响应
export interface ActivityEnrollListResponse {
  list: ActivityEnrollRecord[];  // 后端返回的是 list
  total: number;
}

// 报名站点活动价
export interface EnrollSiteActivityPrice {
  siteId: number;
  activityPrice?: number;  // 活动价格（分）
}

// 报名SKU信息（提交用）
export interface EnrollSkuSubmit {
  skuId: number;
  activityPrice?: number;  // SKU活动价（非服饰类）
  siteActivityPriceList?: EnrollSiteActivityPrice[];  // 各站点活动价（半托管）
}

// 报名SKC信息（提交用）- skuList 嵌套在 skcList 内部
export interface EnrollSkcSubmit {
  skcId: number;
  activityPrice?: number;  // SKC活动价（服饰类）
  skuList?: EnrollSkuSubmit[];  // SKU列表（嵌套在SKC内部）
}

// 报名商品信息（提交用，匹配后端 EnrollProductDTO）
export interface EnrollProductSubmit {
  productId: number;
  activityStock?: number;    // 活动申报商品数
  sessionIds?: number[];     // 场次ID列表（在每个product内部）
  skcList: EnrollSkcSubmit[];
  // 注意：skuList 在 skcList 内部
}

// 报名失败信息
export interface EnrollFailInfo {
  productId: number;
  failMsg: string;
  failReason: number;
}

// 报名提交响应（匹配后端 SubmitActivityEnrollResponse）
export interface SubmitEnrollResponse {
  successCount: number;
  failCount: number;
  failList?: EnrollFailInfo[];
}

// API 请求类型
export interface GetActivityListRequest {
  shopId: string; // 店铺ID
}

export interface GetActivityDetailRequest {
  shopId: string;
  activityType: ActivityType;
  activityThematicId?: number;
}

export interface GetActivityProductsRequest {
  shopId: string;
  activityType: ActivityType;
  activityThematicId?: number;
  rowCount?: number;
  searchScrollContext?: string;
  productIds?: number[];
  siteIds?: number[];
}

export interface GetActivitySessionsRequest {
  shopId: string;
  activityType: ActivityType;
  productIds: number[];
  activityThematicId?: number;
  startTime?: number;
  endTime?: number;
}

export interface GetActivityEnrollListRequest {
  shopId: string;
  pageNo?: number;
  pageSize?: number;
  activityType?: ActivityType;
  activityThematicId?: number;
  sessionStatus?: SessionStatus;
  enrollTimeBegin?: number;
  enrollTimeEnd?: number;
  productIds?: number[];
  productSkcIds?: number[];
  productSkuIds?: number[];
  skcExtCodes?: string[];  // 货号查询
}

// 提交活动报名请求（匹配后端 SubmitActivityEnrollRequest）
export interface SubmitActivityEnrollRequest {
  shopId: string;
  activityType: ActivityType;
  activityThematicId?: number;
  productList: EnrollProductSubmit[];
  // 注意：sessionIds 在每个 product 内部，不在根级别
}
