import { apiClient } from '@/lib/api';
import type {
  ActivityListResponse,
  ActivityDetail,
  ActivityProductsResponse,
  ActivitySessionsResponse,
  ActivityEnrollListResponse,
  SubmitEnrollResponse,
  GetActivityListRequest,
  GetActivityDetailRequest,
  GetActivityProductsRequest,
  GetActivitySessionsRequest,
  GetActivityEnrollListRequest,
  SubmitActivityEnrollRequest,
} from '@/types/temuActivity';

export const temuActivityService = {
  // 获取活动列表
  getActivityList: async (params: GetActivityListRequest): Promise<ActivityListResponse> => {
    const response = await apiClient.get('/temu/activities', { params });
    return response.data;
  },

  // 获取活动详情
  getActivityDetail: async (params: GetActivityDetailRequest): Promise<ActivityDetail> => {
    const response = await apiClient.get('/temu/activities/detail', { params });
    return response.data;
  },

  // 获取可报名商品列表
  getActivityProducts: async (params: GetActivityProductsRequest): Promise<ActivityProductsResponse> => {
    const response = await apiClient.get('/temu/activities/products', { params });
    return response.data;
  },

  // 获取活动场次列表
  getActivitySessions: async (params: GetActivitySessionsRequest): Promise<ActivitySessionsResponse> => {
    const response = await apiClient.get('/temu/activities/sessions', { params });
    return response.data;
  },

  // 获取报名记录列表
  getActivityEnrollList: async (params: GetActivityEnrollListRequest): Promise<ActivityEnrollListResponse> => {
    const response = await apiClient.get('/temu/activities/enrolls', { params });
    return response.data;
  },

  // 提交活动报名
  submitActivityEnroll: async (data: SubmitActivityEnrollRequest): Promise<SubmitEnrollResponse> => {
    const response = await apiClient.post('/temu/activities/enrolls', data);
    return response.data;
  },
};
