// Temu 活动类型定义

// 活动类型枚举
export const ActivityTypes = {
  FLASH_SALE: 1,      // 限时秒杀
  PROMOTION: 5,       // 大促活动
  ADVANCED_PROMOTION: 13,  // 大促进阶
  CLEARANCE: 27,      // 清仓甩卖
  ADVANCED_FLASH_SALE: 101, // 秒杀进阶
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

// 活动类型名称映射
export const ActivityTypeNames: Record<ActivityType, string> = {
  [ActivityTypes.FLASH_SALE]: '限时秒杀',
  [ActivityTypes.PROMOTION]: '大促活动',
  [ActivityTypes.ADVANCED_PROMOTION]: '大促进阶',
  [ActivityTypes.CLEARANCE]: '清仓甩卖',
  [ActivityTypes.ADVANCED_FLASH_SALE]: '秒杀进阶',
};

// 报名状态枚举
export const EnrollStatuses = {
  PENDING: 1,        // 待审核
  APPROVED: 2,       // 审核通过
  REJECTED: 3,       // 审核不通过
  CANCELLED: 4,      // 已取消
  EXPIRED: 5,        // 已失效
} as const;

export type EnrollStatus = typeof EnrollStatuses[keyof typeof EnrollStatuses];

export const EnrollStatusNames: Record<EnrollStatus, string> = {
  [EnrollStatuses.PENDING]: '待审核',
  [EnrollStatuses.APPROVED]: '审核通过',
  [EnrollStatuses.REJECTED]: '审核不通过',
  [EnrollStatuses.CANCELLED]: '已取消',
  [EnrollStatuses.EXPIRED]: '已失效',
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

// 活动基本信息
export interface Activity {
  activityType: ActivityType;
  activityName: string;
  activityThematicId?: number;
  activityThematicName?: string;
  startTime?: number;
  endTime?: number;
}

// 活动列表响应
export interface ActivityListResponse {
  activities: Activity[];
}

// 活动详情
export interface ActivityDetail {
  activityType: ActivityType;
  activityName: string;
  activityThematicId?: number;
  activityThematicName?: string;
  activityStartTime?: number;
  activityEndTime?: number;
  enrollStartTime?: number;
  enrollEndTime?: number;
  description?: string;
  rules?: string[];
  activityExtraInfo?: ActivityExtraInfo;
}

// 活动扩展信息
export interface ActivityExtraInfo {
  // 可能有多种扩展信息，根据活动类型不同而不同
  [key: string]: unknown;
}

// 活动商品
export interface ActivityProduct {
  productId: number;
  productSkcId: number;
  productSkuId: number;
  productName: string;
  thumbUrl: string;
  currentPrice: number;
  originalPrice?: number;
  stockQuantity?: number;
  enrollStatus?: EnrollStatus;
  enrollStatusDesc?: string;
}

// 活动商品列表响应
export interface ActivityProductsResponse {
  products: ActivityProduct[];
  searchScrollContext?: string;
  hasMore: boolean;
}

// 活动场次
export interface ActivitySession {
  sessionId: number;
  sessionName?: string;
  startTime: number;
  endTime: number;
  status: SessionStatus;
  statusDesc?: string;
  enrollStartTime?: number;
  enrollEndTime?: number;
  discountRate?: number;
  siteId?: number;
  siteName?: string;
}

// 活动场次列表响应
export interface ActivitySessionsResponse {
  sessions: ActivitySession[];
}

// 报名记录
export interface ActivityEnrollRecord {
  enrollId: number;
  activityType: ActivityType;
  activityTypeName?: string;
  activityThematicId?: number;
  activityThematicName?: string;
  sessionId?: number;
  sessionName?: string;
  productId: number;
  productName?: string;
  thumbUrl?: string;
  enrollPrice: number;
  enrollQuantity?: number;
  enrollStatus: EnrollStatus;
  enrollStatusDesc?: string;
  enrollTime: number;
  sessionStartTime?: number;
  sessionEndTime?: number;
  sessionStatus?: SessionStatus;
  sessionStatusDesc?: string;
  rejectReason?: string;
  siteId?: number;
  siteName?: string;
}

// 报名记录列表响应
export interface ActivityEnrollListResponse {
  records: ActivityEnrollRecord[];
  total: number;
  pageNo: number;
  pageSize: number;
}

// 报名商品信息
export interface EnrollProductInfo {
  productId: number;
  productSkcId?: number;
  sessionId: number;
  enrollPrice: number;
  enrollQuantity?: number;
  siteId?: number;
}

// 报名结果
export interface EnrollResult {
  productId: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// 报名提交响应
export interface SubmitEnrollResponse {
  results: EnrollResult[];
  successCount: number;
  failCount: number;
}

// API 请求类型
export interface GetActivityListRequest {
  shopId: string;
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
}

export interface SubmitActivityEnrollRequest {
  shopId: string;
  activityType: ActivityType;
  activityThematicId?: number;
  productList: EnrollProductInfo[];
}
