import axios from 'axios';

// 腾讯云对象存储配置
const TENCENT_CLOUD_BASE_URL = 'https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com';

// 创建腾讯云专用的axios实例
export const tencentCloudClient = axios.create({
  baseURL: TENCENT_CLOUD_BASE_URL,
  timeout: 30000, // 文件上传需要更长的超时时间
});

// 请求拦截器
tencentCloudClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
tencentCloudClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('腾讯云API请求失败:', error);
    return Promise.reject(error);
  }
);

// 上传文件到腾讯云对象存储
export const uploadToTencentCloud = async (presignedURL: string, file: File): Promise<void> => {
  try {
    await axios.put(presignedURL, file, {
      headers: {
        'Content-Type': file.type,
      },
      timeout: 30000,
    });
  } catch (error) {
    console.error('上传到腾讯云失败:', error);
    throw new Error('文件上传失败');
  }
};