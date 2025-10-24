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

// 上传PSD文件到腾讯云，支持进度回调
export const uploadPSDToTencentCloud = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // 生成文件路径
  const timestamp = Date.now();
  const fileName = `psd/${timestamp}_${file.name}`;
  const presignedURL = `${TENCENT_CLOUD_BASE_URL}/${fileName}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // 监听上传完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(presignedURL);
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    });

    // 监听网络错误
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误，上传失败'));
    });

    // 监听上传被取消
    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    // 设置超时
    xhr.timeout = 300000; // 5分钟超时，PSD文件较大
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时'));
    });

    // 开始上传
    xhr.open('PUT', presignedURL);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
};

// 上传裁剪图片到腾讯云
export const uploadCroppedImageToTencentCloud = async (
  file: File
): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `croppedImages/${timestamp}_${file.name}`;
  const uploadURL = `${TENCENT_CLOUD_BASE_URL}/${fileName}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(uploadURL);
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('网络错误，上传失败'));
    });

    xhr.timeout = 30000; // 30秒超时
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时'));
    });

    xhr.open('PUT', uploadURL);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    xhr.send(file);
  });
};