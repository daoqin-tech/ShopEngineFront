import { apiClient } from '@/lib/api';
import { uploadToTencentCloud } from '@/lib/tencentCloud';

export interface PresignedURLResponse {
  presignedURL: string;
  objectKey: string;
}

export class FileUploadAPI {
  // 获取预签名URL
  static async generatePresignedURL(objectKey: string): Promise<PresignedURLResponse> {
    try {
      const response = await apiClient.get('/file/generate-presigned-url', {
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
      const { presignedURL } = await this.generatePresignedURL(finalObjectKey);
      
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

  // 批量上传文件
  static async uploadFiles(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file));
    return Promise.all(uploadPromises);
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
}