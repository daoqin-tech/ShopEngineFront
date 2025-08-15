import axios from 'axios';

// 根据环境设置不同的baseURL
const getBaseURL = () => {
  if (import.meta.env.MODE === 'production') {
    return 'https://api.echohome.cn/api/v1/';
  }
  return 'http://127.0.0.1:8080/api/v1';
};

// 创建axios实例
export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回后端响应数据
    return response.data;
  },
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // 处理认证失败 - 清除token并重定向到登录页
      console.log('认证失败，请重新登录');
      localStorage.removeItem('token');
      
      // 只在生产环境重定向到登录页
      if (import.meta.env.MODE === 'production') {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);