import { apiClient } from '@/lib/api';

// 价格策略
export type PriceStrategy =
  | 'suggest'           // 使用参考申报价
  | 'daily_discount'    // 基于日常申报价打折
  | 'daily_reduce'      // 基于日常申报价降价
  | 'suggest_discount'  // 基于参考申报价打折
  | 'suggest_reduce';   // 基于参考申报价降价

// 库存策略
export type StockStrategy =
  | 'suggest'  // 使用参考活动库存
  | 'manual';  // 手动设置固定库存

// 任务状态
export type TaskStatus =
  | 'pending'    // 待执行
  | 'running'    // 执行中
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'cancelled'; // 已取消

// 详情状态
export type DetailStatus = 'success' | 'failed';

// 创建任务请求
export interface CreateBatchEnrollTaskRequest {
  shopId: string;
  activityType: number;
  activityThematicId?: number;
  activityName?: string;
  sessionIds: number[];
  priceStrategy: PriceStrategy;
  priceValue?: number;
  stockStrategy: StockStrategy;
  stockValue?: number;
}

// 创建任务响应
export interface CreateBatchEnrollTaskResponse {
  taskId: number;
  status: string;
}

// 任务DTO
export interface BatchEnrollTask {
  id: number;
  shopId: string;
  activityType: number;
  activityThematicId?: number;
  activityName: string;
  sessionIds: number[];
  priceStrategy: PriceStrategy;
  priceValue?: number;
  stockStrategy: StockStrategy;
  stockValue?: number;
  totalCount: number;
  successCount: number;
  failCount: number;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 任务列表请求
export interface GetBatchEnrollTasksRequest {
  shopId: string;
  pageNo?: number;
  pageSize?: number;
  status?: TaskStatus;
}

// 任务列表响应
export interface GetBatchEnrollTasksResponse {
  total: number;
  list: BatchEnrollTask[];
}

// 任务详情DTO
export interface BatchEnrollDetail {
  id: number;
  taskId: number;
  productId: number;
  productName: string;
  dailyPrice?: number;
  suggestPrice?: number;
  activityPrice?: number;
  activityStock?: number;
  status: DetailStatus;
  failReason: string;
  createdAt: string;
}

// 任务详情列表请求
export interface GetBatchEnrollDetailsRequest {
  taskId: number;
  pageNo?: number;
  pageSize?: number;
  status?: DetailStatus;
}

// 任务详情列表响应
export interface GetBatchEnrollDetailsResponse {
  total: number;
  list: BatchEnrollDetail[];
}

// 日志DTO
export interface BatchEnrollLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// 进度DTO
export interface BatchEnrollProgress {
  taskId: number;
  status: TaskStatus;
  totalCount: number;
  successCount: number;
  failCount: number;
  progress: number;
  phase: 'pending' | 'fetching' | 'enrolling' | 'completed';
  logs: BatchEnrollLog[];
}

// 取消任务响应
export interface CancelBatchEnrollTaskResponse {
  success: boolean;
  message: string;
}

// 价格策略名称映射
export const priceStrategyNames: Record<PriceStrategy, string> = {
  suggest: '使用参考申报价',
  daily_discount: '基于日常申报价打折',
  daily_reduce: '基于日常申报价降价',
  suggest_discount: '基于参考申报价打折',
  suggest_reduce: '基于参考申报价降价',
};

// 库存策略名称映射
export const stockStrategyNames: Record<StockStrategy, string> = {
  suggest: '使用参考活动库存',
  manual: '手动设置固定库存',
};

// 任务状态名称映射
export const taskStatusNames: Record<TaskStatus, string> = {
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export const temuBatchEnrollService = {
  // 创建批量报名任务
  createTask: async (data: CreateBatchEnrollTaskRequest): Promise<CreateBatchEnrollTaskResponse> => {
    const response = await apiClient.post('/temu/batch-enroll/tasks', data);
    return response.data;
  },

  // 获取任务列表
  getTasks: async (params: GetBatchEnrollTasksRequest): Promise<GetBatchEnrollTasksResponse> => {
    const response = await apiClient.get('/temu/batch-enroll/tasks', { params });
    return response.data;
  },

  // 获取任务详情
  getTask: async (taskId: number): Promise<BatchEnrollTask> => {
    const response = await apiClient.get(`/temu/batch-enroll/tasks/${taskId}`);
    return response.data;
  },

  // 获取任务进度
  getTaskProgress: async (taskId: number): Promise<BatchEnrollProgress> => {
    const response = await apiClient.get(`/temu/batch-enroll/tasks/${taskId}/progress`);
    return response.data;
  },

  // 获取任务商品明细
  getTaskDetails: async (params: GetBatchEnrollDetailsRequest): Promise<GetBatchEnrollDetailsResponse> => {
    const { taskId, ...rest } = params;
    const response = await apiClient.get(`/temu/batch-enroll/tasks/${taskId}/details`, { params: rest });
    return response.data;
  },

  // 取消任务
  cancelTask: async (taskId: number): Promise<CancelBatchEnrollTaskResponse> => {
    const response = await apiClient.post(`/temu/batch-enroll/tasks/${taskId}/cancel`);
    return response.data;
  },
};
