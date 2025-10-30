import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Product } from '@/services/productService';
import { JOURNAL_PAPER_CATEGORIES, CALENDAR_CATEGORIES, DECORATIVE_PAPER_CATEGORIES } from '@/types/shop';

// PDF页面尺寸配置
export const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 }
} as const;

export type PageSizeType = keyof typeof PAGE_SIZES;

/**
 * 生成日期时间字符串（用于文件名）
 */
function getDateTimeString(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * 导出产品图PDF
 */
export async function exportProductPdf(
  products: Product[],
  pageSize: PageSizeType,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const productsWithImages = products.filter(p => p.productImages && p.productImages.length > 0);

  if (productsWithImages.length === 0) {
    throw new Error('所选商品没有产品图');
  }

  const zip = new JSZip();
  const pageSizeConfig = PAGE_SIZES[pageSize];

  for (let index = 0; index < productsWithImages.length; index++) {
    const product = productsWithImages[index];
    const productImages = product.productImages;

    if (!productImages || productImages.length === 0) continue;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageSizeConfig.width, pageSizeConfig.height]
    });

    const pageWidth = pageSizeConfig.width;
    const pageHeight = pageSizeConfig.height;

    // 第一页: 货号页
    pdf.setFontSize(40);
    pdf.setTextColor(0, 0, 0);
    const productCode = product.productCode || product.id;
    const textWidth = pdf.getTextWidth(productCode);
    const textX = (pageWidth - textWidth) / 2;
    const textY = pageHeight / 2;
    pdf.text(productCode, textX, textY);

    // 添加右下角黑色标记 (用于分本)
    const blackMarkWidth = 10;  // 1cm
    const blackMarkHeight = 5;  // 0.5cm
    const blackMarkX = pageWidth - blackMarkWidth;
    const blackMarkY = pageHeight - blackMarkHeight - 5;
    pdf.setFillColor(0, 0, 0);
    pdf.rect(blackMarkX, blackMarkY, blackMarkWidth, blackMarkHeight, 'F');

    // 后续页: 产品图
    for (const imageUrl of productImages) {
      try {
        const response = await fetch(imageUrl, {
          mode: 'cors',
          headers: {
            'Accept': 'image/*',
          }
        });

        if (!response.ok) {
          console.warn(`跳过图片 ${imageUrl}，HTTP错误: ${response.status}`);
          continue;
        }

        const blob = await response.blob();
        const imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });

        // 添加新页
        pdf.addPage();

        // 获取图片尺寸
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageDataUrl;
        });

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        // 计算图片显示尺寸，保持比例并铺满页面
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const displayWidth = imgWidth * ratio;
        const displayHeight = imgHeight * ratio;

        // 居中显示
        const x = (pageWidth - displayWidth) / 2;
        const y = (pageHeight - displayHeight) / 2;

        pdf.addImage(imageDataUrl, 'JPEG', x, y, displayWidth, displayHeight);

      } catch (error) {
        console.warn(`跳过图片 ${imageUrl}，处理失败:`, error);
      }
    }

    // 生成PDF blob并添加到压缩包
    const pdfBlob = pdf.output('blob');
    const pdfFileName = `${product.productCode || product.id}.pdf`;
    zip.file(pdfFileName, pdfBlob);

    // 更新进度
    if (onProgress) {
      onProgress(index + 1, productsWithImages.length);
    }
  }

  // 生成压缩包
  const zipContent = await zip.generateAsync({ type: 'blob' });
  const filename = `产品图PDF_${getDateTimeString()}.zip`;

  // 下载压缩包
  const url = window.URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 导出商品图（轮播图）
 */
export async function exportCarouselImages(
  products: Product[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const productsWithImages = products.filter(p => p.carouselImages && p.carouselImages.length > 0);

  if (productsWithImages.length === 0) {
    throw new Error('所选商品没有商品图');
  }

  const zip = new JSZip();

  for (let index = 0; index < productsWithImages.length; index++) {
    const product = productsWithImages[index];
    const productCode = product.productCode || product.id;
    const folder = zip.folder(productCode);

    if (folder && product.carouselImages) {
      for (let i = 0; i < product.carouselImages.length; i++) {
        const imageUrl = product.carouselImages[i];
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        folder.file(`商品图_${i + 1}.${ext}`, blob);
      }
    }

    // 更新进度
    if (onProgress) {
      onProgress(index + 1, productsWithImages.length);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.download = `商品图_${getDateTimeString()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 导出产品图
 */
export async function exportProductImages(
  products: Product[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const productsWithImages = products.filter(p => p.productImages && p.productImages.length > 0);

  if (productsWithImages.length === 0) {
    throw new Error('所选商品没有产品图');
  }

  const zip = new JSZip();

  for (let index = 0; index < productsWithImages.length; index++) {
    const product = productsWithImages[index];
    const productCode = product.productCode || product.id;
    const folder = zip.folder(productCode);

    if (folder && product.productImages) {
      for (let i = 0; i < product.productImages.length; i++) {
        const imageUrl = product.productImages[i];
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        folder.file(`产品图_${i + 1}.${ext}`, blob);
      }
    }

    // 更新进度
    if (onProgress) {
      onProgress(index + 1, productsWithImages.length);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.download = `产品图_${getDateTimeString()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 导出Excel
 */
export function exportToExcel(
  products: Product[],
  getShopName: (shopId: string) => string
): void {
  if (products.length === 0) {
    throw new Error('请至少选择一个商品');
  }

  // 准备导出数据 - 按照模板格式（59列）
  const allCategories = [...JOURNAL_PAPER_CATEGORIES, ...DECORATIVE_PAPER_CATEGORIES, ...CALENDAR_CATEGORIES];

  const exportData = products.map(product => {
    const categoryConfig = allCategories.find(c => c.categoryId === product.categoryId);

    return {
      '产品标题': product.nameZh || '',
      '英文标题': product.nameEn || '',
      '产品描述': '',
      '产品货号': product.productCode || '',
      '变种名称': product.variantName || '',
      '变种属性名称一': product.variantAttributeName1 || '',
      '变种属性值一': product.variantAttributeValue1 || '',
      '变种属性名称二': '',
      '变种属性值二': '',
      '预览图': product.previewImage || '',
      '申报价格': product.declaredPrice || '',
      'SKU货号': product.productCode || '',
      '长': product.length || '',
      '宽': product.width || '',
      '高': product.height || '',
      '重量': product.weight || '',
      '识别码类型': '',
      '识别码': '',
      '站外产品链接': '',
      '轮播图': product.carouselImages?.join('\r\n') || '',
      '产品素材图': product.materialImage || '',
      '外包装形状': '',
      '外包装类型': '',
      '外包装图片': '',
      '建议零售价(建议零售价币种)': product.suggestedRetailPrice || '',
      '库存': product.stock || '',
      '发货时效': product.shippingTime || '',
      '分类id': product.categoryId || '',
      '产品属性': categoryConfig?.productAttributes || '',
      'SPU属性': '',
      'SKC属性': '',
      'SKU属性': '',
      '站点价格': '',
      '来源url': '',
      '产地': product.origin || '',
      '敏感属性': '',
      '备注': '',
      'SKU分类': '',
      'SKU分类数量': '',
      'SKU分类单位': '',
      '独立包装': '',
      '净含量数值': '',
      '净含量单位': '',
      '总净含量': '',
      '总净含量单位': '',
      '混合套装类型': '',
      'SKU分类总数量': '',
      'SKU分类总数量单位': '',
      '包装清单': '',
      '生命周期': '',
      '视频Url': '',
      '运费模板（模板id）': product.freightTemplateId || '',
      '经营站点': product.operatingSite || '',
      '所属店铺': getShopName(product.shopId),
      'SPUID': '',
      'SKCID': '',
      'SKUID': '',
      '创建时间': new Date(product.createdAt).toLocaleString('zh-CN'),
      '更新时间': new Date(product.updatedAt).toLocaleString('zh-CN')
    };
  });

  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 设置列宽
  const colWidths = [
    { wch: 35 },  // 1. 产品标题
    { wch: 35 },  // 2. 英文标题
    { wch: 30 },  // 3. 产品描述
    { wch: 15 },  // 4. 产品货号
    { wch: 12 },  // 5. 变种名称
    { wch: 18 },  // 6. 变种属性名称一
    { wch: 12 },  // 7. 变种属性值一
    { wch: 18 },  // 8. 变种属性名称二
    { wch: 12 },  // 9. 变种属性值二
    { wch: 60 },  // 10. 预览图
    { wch: 12 },  // 11. 申报价格
    { wch: 15 },  // 12. SKU货号
    { wch: 8 },   // 13. 长
    { wch: 8 },   // 14. 宽
    { wch: 8 },   // 15. 高
    { wch: 10 },  // 16. 重量
    { wch: 12 },  // 17. 识别码类型
    { wch: 20 },  // 18. 识别码
    { wch: 40 },  // 19. 站外产品链接
    { wch: 70 },  // 20. 轮播图
    { wch: 60 },  // 21. 产品素材图
    { wch: 12 },  // 22. 外包装形状
    { wch: 12 },  // 23. 外包装类型
    { wch: 60 },  // 24. 外包装图片
    { wch: 15 },  // 25. 建议零售价
    { wch: 10 },  // 26. 库存
    { wch: 10 },  // 27. 发货时效
    { wch: 12 },  // 28. 分类id
    { wch: 40 },  // 29. 产品属性
    { wch: 30 },  // 30. SPU属性
    { wch: 40 },  // 31. SKC属性
    { wch: 40 },  // 32. SKU属性
    { wch: 15 },  // 33. 站点价格
    { wch: 40 },  // 34. 来源url
    { wch: 20 },  // 35. 产地
    { wch: 12 },  // 36. 敏感属性
    { wch: 20 },  // 37. 备注
    { wch: 12 },  // 38. SKU分类
    { wch: 12 },  // 39. SKU分类数量
    { wch: 12 },  // 40. SKU分类单位
    { wch: 12 },  // 41. 独立包装
    { wch: 12 },  // 42. 净含量数值
    { wch: 12 },  // 43. 净含量单位
    { wch: 12 },  // 44. 总净含量
    { wch: 12 },  // 45. 总净含量单位
    { wch: 15 },  // 46. 混合套装类型
    { wch: 15 },  // 47. SKU分类总数量
    { wch: 15 },  // 48. SKU分类总数量单位
    { wch: 30 },  // 49. 包装清单
    { wch: 12 },  // 50. 生命周期
    { wch: 60 },  // 51. 视频Url
    { wch: 30 },  // 52. 运费模板
    { wch: 12 },  // 53. 经营站点
    { wch: 25 },  // 54. 所属店铺
    { wch: 15 },  // 55. SPUID
    { wch: 15 },  // 56. SKCID
    { wch: 15 },  // 57. SKUID
    { wch: 20 },  // 58. 创建时间
    { wch: 20 }   // 59. 更新时间
  ];
  ws['!cols'] = colWidths;

  // 初始化行高数组
  if (!ws['!rows']) ws['!rows'] = [];

  // 为所有单元格设置样式和行高
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const carouselImageColIndex = 19; // 轮播图列（0-based index）

  for (let row = range.s.r; row <= range.e.r; row++) {
    let maxLines = 1;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellAddress]) {
        const cellValue = ws[cellAddress].v || '';
        const lines = cellValue.toString().split(/\r?\n/).length;
        maxLines = Math.max(maxLines, lines);

        // 表头样式
        if (row === 0) {
          ws[cellAddress].s = {
            alignment: {
              vertical: 'center',
              horizontal: 'center',
              wrapText: true
            },
            font: {
              bold: true,
              sz: 11,
              name: 'Calibri'
            },
            fill: {
              fgColor: { rgb: "F0F0F0" }
            }
          };
        } else {
          // 数据行样式
          ws[cellAddress].s = {
            alignment: {
              vertical: 'center',
              horizontal: col === carouselImageColIndex || col === 5 || col === 12 ? 'left' : 'center',
              wrapText: true
            },
            font: {
              sz: 10,
              name: 'Calibri'
            }
          };
        }
      }
    }

    // 设置行高
    if (!ws['!rows'][row]) ws['!rows'][row] = {};
    if (row === 0) {
      ws['!rows'][row].hpt = 30; // 表头固定行高
    } else {
      ws['!rows'][row].hpt = Math.max(20, maxLines * 15); // 数据行根据内容行数计算
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '商品列表');
  XLSX.writeFile(wb, `商品列表_${getDateTimeString()}.xlsx`);
}
