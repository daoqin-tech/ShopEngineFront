import { apiClient } from '@/lib/api';
import { uploadToTencentCloud } from '@/lib/tencentCloud';

export class FileUploadAPI {
  // 获取预签名URL
  static async generatePresignedURL(objectKey: string): Promise<string> {
    try {
      const response = await apiClient.get('/upload/generatePresignedURL', {
        params: {
          objectKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('获取预签名URL失败:', error);
      throw new Error('获取上传URL失败');
    }
  }

  // 完整的文件上传流程
  static async uploadFile(file: File, objectKey?: string): Promise<string> {
    try {
      // 如果没有提供objectKey，生成一个
      const finalObjectKey = objectKey || `pdfUploads/${Date.now()}-${file.name}`;
      
      // 1. 获取预签名URL
      const presignedURL = await this.generatePresignedURL(finalObjectKey);
      // 2. 上传文件到腾讯云
      await uploadToTencentCloud(presignedURL, file);
      
      // 3. 返回文件的访问URL
      const fileURL = `https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/${finalObjectKey}`;
      return fileURL;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }

  // 带进度回调的文件上传
  static async uploadFileWithProgress(
    file: File, 
    onProgress: (progress: number) => void,
    objectKey?: string
  ): Promise<string> {
    try {
      // 如果没有提供objectKey，生成一个
      const finalObjectKey = objectKey || `psdUploads/${Date.now()}-${file.name}`;
      
      // 1. 获取预签名URL
      onProgress(10); // 获取URL完成
      const presignedURL = await this.generatePresignedURL(finalObjectKey);
      
      // 2. 上传文件到腾讯云（带进度）
      await this.uploadToTencentCloudWithProgress(presignedURL, file, (uploadProgress) => {
        // 将上传进度映射到 10-90 的范围
        const adjustedProgress = 10 + (uploadProgress * 0.8);
        onProgress(adjustedProgress);
      });
      
      // 3. 返回文件的访问URL
      onProgress(100); // 上传完成
      const fileURL = `https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/${finalObjectKey}`;
      return fileURL;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }

  // 带进度的腾讯云上传
  private static async uploadToTencentCloudWithProgress(
    presignedURL: string,
    file: File,
    onProgress: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 监听上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      // 监听完成事件
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // 监听错误事件
      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'));
      });

      // 监听中止事件
      xhr.addEventListener('abort', () => {
        reject(new Error('上传被中止'));
      });

      // 发送请求
      xhr.open('PUT', presignedURL);
      xhr.send(file);
    });
  }

  // 批量上传文件
  static async uploadFiles(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, `coverImages/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`));
    return Promise.all(uploadPromises);
  }

  // 批量上传文件带进度
  static async uploadFilesWithProgress(
    files: File[], 
    onProgress: (fileIndex: number, progress: number, totalProgress: number) => void
  ): Promise<string[]> {
    const results: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectKey = `coverImages/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
      
      try {
        const fileUrl = await this.uploadFileWithProgress(
          file, 
          (progress) => {
            const totalProgress = ((i / files.length) * 100) + (progress / files.length);
            onProgress(i, progress, totalProgress);
          },
          objectKey
        );
        results.push(fileUrl);
      } catch (error) {
        console.error(`文件 ${file.name} 上传失败:`, error);
        throw error;
      }
    }
    
    return results;
  }

  // 验证文件类型和大小
  static validateFile(file: File, maxSize: number = 10 * 1024 * 1024): boolean {
    // 验证文件类型（只允许图片）
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件');
    }

    // 验证文件大小（默认10MB）
    if (file.size > maxSize) {
      throw new Error(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    return true;
  }

  // 验证PSD文件
  static validatePSDFile(file: File, maxSize: number = 500 * 1024 * 1024): boolean {
    // 验证文件扩展名
    if (!file.name.toLowerCase().endsWith('.psd')) {
      throw new Error('只能上传PSD文件');
    }

    // 验证文件大小（默认100MB）
    if (file.size > maxSize) {
      throw new Error(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    return true;
  }
}