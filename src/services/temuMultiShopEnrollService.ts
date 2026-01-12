import { apiClient } from '@/lib/api';

// ===================== 类型定义 =====================

// 活动专场
export interface ShopActivityThematic {
  thematicId: number;
  thematicName: string;
}

// 店铺活动
export interface ShopActivity {
  activityType: number;
  activityName: string;
  thematics: ShopActivityThematic[];
}

// 店铺可报活动响应
export interface GetShopActivitiesResponse {
  activities: ShopActivity[];
}

// 店铺场次
export interface ShopSession {
  sessionId: number;
  sessionName: string;
  siteId: number;
  siteName: string;
  startTime: number;
  endTime: number;
}

// 店铺可报场次响应
export interface GetShopSessionsResponse {
  sessions: ShopSession[];
}

// 店铺报名配置
export interface ShopEnrollConfig {
  shopId: string;
  activityType: number;
  activityName?: string;
  thematicId?: number;
  thematicName?: string;
  sessionIds: number[];
  sessionNames?: string[];
}

// 创建任务请求
export interface CreateMultiShopEnrollJobRequest {
  shopConfigs: ShopEnrollConfig[];
  priceStrategy: string;
  priceValue?: number;
  stockStrategy: string;
  stockValue?: number;
}

// 创建任务响应
export interface CreateMultiShopEnrollJobResponse {
  jobId: number;
  name: string;
}

// 任务列表项
export interface MultiShopEnrollJobItem {
  id: number;
  name: string;
  totalShops: number;
  completedShops: number;
  failedShops: number;
  status: string;
  createdAt: string;
}

// 任务列表响应
export interface GetMultiShopEnrollJobsResponse {
  total: number;
  items: MultiShopEnrollJobItem[];
}

// 报名失败详情
export interface EnrollFailDetail {
  productId: number;
  failMsg: string;
  failReason: number;
}

// 任务店铺详情
export interface MultiShopEnrollJobShop {
  id: number;
  shopId: string;
  shopName: string;
  activityType: number;
  activityName: string;
  thematicName: string;
  sessionNames: string;
  status: string;
  totalProducts: number;
  successProducts: number;
  failedProducts: number;
  errorMessage: string;
  failDetails?: EnrollFailDetail[];
  startedAt?: string;
  completedAt?: string;
}

// 任务详情响应
export interface GetMultiShopEnrollJobDetailResponse {
  id: number;
  name: string;
  priceStrategy: string;
  priceValue?: number;
  stockStrategy: string;
  stockValue?: number;
  totalShops: number;
  completedShops: number;
  failedShops: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  shops: MultiShopEnrollJobShop[];
}

// 店铺进度
export interface MultiShopEnrollJobShopProgress {
  shopId: string;
  shopName: string;
  status: string;
  totalProducts: number;
  successProducts: number;
  failedProducts: number;
  progress: number;
  errorMessage: string;
}

// 任务进度响应
export interface MultiShopEnrollJobProgress {
  jobId: number;
  status: string;
  totalShops: number;
  completedShops: number;
  failedShops: number;
  progress: number;
  shops: MultiShopEnrollJobShopProgress[];
}

// ===================== 服务 =====================

export const temuMultiShopEnrollService = {
  // 获取店铺可报活动
  getShopActivities: async (shopId: string): Promise<GetShopActivitiesResponse> => {
    const response = await apiClient.get(`/temu/multi-shop-enroll/shops/${shopId}/activities`);
    return response.data;
  },

  // 获取店铺可报场次
  getShopSessions: async (shopId: string, activityType: number, thematicId?: number): Promise<GetShopSessionsResponse> => {
    const params: { activityType: number; thematicId?: number } = { activityType };
    if (thematicId) {
      params.thematicId = thematicId;
    }
    const response = await apiClient.get(`/temu/multi-shop-enroll/shops/${shopId}/sessions`, { params });
    return response.data;
  },

  // 获取任务列表
  getJobs: async (params?: { status?: string; page?: number; pageSize?: number }): Promise<GetMultiShopEnrollJobsResponse> => {
    const response = await apiClient.get('/temu/multi-shop-enroll/jobs', { params });
    return response.data;
  },

  // 创建任务
  createJob: async (data: CreateMultiShopEnrollJobRequest): Promise<CreateMultiShopEnrollJobResponse> => {
    const response = await apiClient.post('/temu/multi-shop-enroll/jobs', data);
    return response.data;
  },

  // 获取任务详情
  getJobDetail: async (jobId: number): Promise<GetMultiShopEnrollJobDetailResponse> => {
    const response = await apiClient.get(`/temu/multi-shop-enroll/jobs/${jobId}`);
    return response.data;
  },

  // 获取任务进度
  getJobProgress: async (jobId: number): Promise<MultiShopEnrollJobProgress> => {
    const response = await apiClient.get(`/temu/multi-shop-enroll/jobs/${jobId}/progress`);
    return response.data;
  },

  // 取消任务
  cancelJob: async (jobId: number): Promise<void> => {
    await apiClient.post(`/temu/multi-shop-enroll/jobs/${jobId}/cancel`);
  },
};

// ===================== 常量 =====================

// 任务状态
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// 店铺状态
export const SHOP_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// 价格策略
export const PRICE_STRATEGY = {
  SUGGEST: 'suggest',           // 使用参考申报价
  DAILY_DISCOUNT: 'daily_discount',   // 日常价打折
  DAILY_REDUCE: 'daily_reduce',       // 日常价减价
  SUGGEST_DISCOUNT: 'suggest_discount', // 参考价打折
  SUGGEST_REDUCE: 'suggest_reduce',    // 参考价减价
} as const;

// 库存策略
export const STOCK_STRATEGY = {
  SUGGEST: 'suggest',   // 使用参考活动库存
  MANUAL: 'manual',     // 手动设置库存
} as const;

// 价格策略选项
export const PRICE_STRATEGY_OPTIONS = [
  { value: PRICE_STRATEGY.SUGGEST, label: '使用参考申报价' },
  { value: PRICE_STRATEGY.DAILY_DISCOUNT, label: '日常价打折' },
  { value: PRICE_STRATEGY.DAILY_REDUCE, label: '日常价减价' },
  { value: PRICE_STRATEGY.SUGGEST_DISCOUNT, label: '参考价打折' },
  { value: PRICE_STRATEGY.SUGGEST_REDUCE, label: '参考价减价' },
];

// 库存策略选项
export const STOCK_STRATEGY_OPTIONS = [
  { value: STOCK_STRATEGY.SUGGEST, label: '使用参考活动库存' },
  { value: STOCK_STRATEGY.MANUAL, label: '手动设置库存' },
];

// 状态显示
export const getJobStatusDisplay = (status: string): { text: string; color: string } => {
  switch (status) {
    case JOB_STATUS.PENDING:
      return { text: '等待中', color: 'gray' };
    case JOB_STATUS.RUNNING:
      return { text: '进行中', color: 'blue' };
    case JOB_STATUS.COMPLETED:
      return { text: '已完成', color: 'green' };
    case JOB_STATUS.FAILED:
      return { text: '失败', color: 'red' };
    case JOB_STATUS.CANCELLED:
      return { text: '已取消', color: 'orange' };
    default:
      return { text: '未知', color: 'gray' };
  }
};

export const getShopStatusDisplay = (status: string): { text: string; color: string } => {
  switch (status) {
    case SHOP_STATUS.PENDING:
      return { text: '等待中', color: 'gray' };
    case SHOP_STATUS.RUNNING:
      return { text: '执行中', color: 'blue' };
    case SHOP_STATUS.COMPLETED:
      return { text: '已完成', color: 'green' };
    case SHOP_STATUS.FAILED:
      return { text: '失败', color: 'red' };
    default:
      return { text: '未知', color: 'gray' };
  }
};
