import type { CropArea } from '@/types/cropImage';

/**
 * 从图片URL裁剪指定区域并返回Blob
 * @param imageUrl 原图URL
 * @param cropArea 裁剪区域
 * @returns 裁剪后的图片Blob
 */
export async function cropImageFromUrl(
  imageUrl: string,
  cropArea: CropArea
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // 创建canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        // 设置canvas尺寸为裁剪区域大小
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;

        // 绘制裁剪区域
        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );

        // 转换为Blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('无法生成图片Blob'));
          }
        }, 'image/jpeg', 0.95);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = imageUrl;
  });
}

/**
 * 将Blob转换为File对象
 * @param blob Blob对象
 * @param filename 文件名
 * @returns File对象
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * 生成裁剪图片的文件名
 * @param _sourceImageUrl 原图URL (保留参数以保持接口一致性)
 * @param cropIndex 裁剪索引
 * @returns 文件名
 */
export function generateCroppedFileName(_sourceImageUrl: string, cropIndex: number): string {
  const timestamp = Date.now();
  return `cropped_${timestamp}_${cropIndex}.jpg`;
}
