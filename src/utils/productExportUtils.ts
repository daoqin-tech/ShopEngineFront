import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Product } from '@/services/productService';
import { JOURNAL_PAPER_CATEGORIES, CALENDAR_CATEGORIES, DECORATIVE_PAPER_CATEGORIES } from '@/types/shop';

// PDF页面尺寸配置（单位：mm）
// 所有类型在导出时会自动添加 6mm 出血
export const PAGE_SIZES = {
  JOURNAL_PAPER: { width: 152, height: 152 },       // 手账纸 15.2cm x 15.2cm
  DECORATIVE_PAPER: { width: 300, height: 300 },    // 包装纸 30cm x 30cm
  CALENDAR_PORTRAIT: { width: 210, height: 297 },   // 竖版日历 21cm x 29.7cm
  CALENDAR_LANDSCAPE: { width: 297, height: 210 },  // 横版日历 29.7cm x 21cm
  PAPER_BAG: { width: 660, height: 340 }            // 手提纸袋 66cm x 34cm
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
 * 导出手提纸袋PDF
 * 纸袋尺寸: 66cm x 34cm
 * 实际导出尺寸: 66.6cm x 34.6cm (包含6mm出血)
 * 图像区域: 64.6cm x 27.6cm
 * 每个商品使用2张图片,各占一半,从(0,0)开始平铺
 */
export async function exportPaperBagPdf(
  products: Product[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const productsWithImages = products.filter(p => p.productImages && p.productImages.length >= 2);

  if (productsWithImages.length === 0) {
    throw new Error('所选商品需要至少2张产品图才能导出纸袋PDF');
  }

  const zip = new JSZip();

  // 纸袋尺寸配置 (单位: mm)
  const bagWidth = 660;  // 66cm
  const bagHeight = 340; // 34cm
  const bleed = 6;       // 6mm 出血

  // 实际PDF页面尺寸 (包含出血)
  const pageWidth = bagWidth + bleed;   // 66.6cm
  const pageHeight = bagHeight + bleed; // 34.6cm

  // 图像填充区域 (64.6cm x 27.6cm)
  const imageWidth = 646;  // 64.6cm
  const imageHeight = 276; // 27.6cm

  // 图像区域起始位置 (从x=0, y=0开始)
  const imageX = 0;
  const imageY = 0;

  // 每张图占据的宽度 (一半)
  const halfWidth = imageWidth / 2;

  for (let index = 0; index < productsWithImages.length; index++) {
    const product = productsWithImages[index];
    const productImages = product.productImages;

    if (!productImages || productImages.length < 2) continue;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    try {
      // 获取前两张图片
      const image1Url = productImages[0];
      const image2Url = productImages[1];

      // 加载第一张图片
      const response1 = await fetch(image1Url, {
        mode: 'cors',
        headers: { 'Accept': 'image/*' }
      });
      const blob1 = await response1.blob();
      const imageDataUrl1 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(blob1);
      });

      // 加载第二张图片
      const response2 = await fetch(image2Url, {
        mode: 'cors',
        headers: { 'Accept': 'image/*' }
      });
      const blob2 = await response2.blob();
      const imageDataUrl2 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(blob2);
      });

      // 获取图片原始尺寸
      const img1 = new Image();
      await new Promise((resolve, reject) => {
        img1.onload = resolve;
        img1.onerror = reject;
        img1.src = imageDataUrl1;
      });

      const img2 = new Image();
      await new Promise((resolve, reject) => {
        img2.onload = resolve;
        img2.onerror = reject;
        img2.src = imageDataUrl2;
      });

      // 计算图片实际显示尺寸（保持原始比例，不压缩）
      // 以高度为基准，计算对应的宽度
      const img1Ratio = img1.naturalWidth / img1.naturalHeight;
      const img1DisplayHeight = imageHeight; // 27.6cm
      const img1DisplayWidth = img1DisplayHeight * img1Ratio;

      const img2Ratio = img2.naturalWidth / img2.naturalHeight;
      const img2DisplayHeight = imageHeight; // 27.6cm
      const img2DisplayWidth = img2DisplayHeight * img2Ratio;

      // 第一张图片: 左半部分，保持比例，从左到右裁剪
      // 保存图形状态
      pdf.saveGraphicsState();
      // 设置裁剪区域（左半部分）
      pdf.rect(imageX, imageY, halfWidth, imageHeight);
      pdf.clip();
      // 添加第一张图片，超出裁剪区域的部分会被裁掉
      pdf.addImage(imageDataUrl1, 'JPEG', imageX, imageY, img1DisplayWidth, img1DisplayHeight, undefined, 'NONE');
      // 恢复图形状态
      pdf.restoreGraphicsState();

      // 第二张图片: 右半部分，保持比例，从左到右裁剪
      // 保存图形状态
      pdf.saveGraphicsState();
      // 设置裁剪区域（右半部分）
      pdf.rect(imageX + halfWidth, imageY, halfWidth, imageHeight);
      pdf.clip();
      // 添加第二张图片，超出裁剪区域的部分会被裁掉
      pdf.addImage(imageDataUrl2, 'JPEG', imageX + halfWidth, imageY, img2DisplayWidth, img2DisplayHeight, undefined, 'NONE');
      // 恢复图形状态
      pdf.restoreGraphicsState();

    } catch (error) {
      console.warn(`处理商品 ${product.productCode || product.id} 的图片时出错:`, error);
      continue;
    }

    // 生成PDF blob并添加到压缩包
    const pdfBlob = pdf.output('blob');
    const pdfFileName = `${product.productCode || product.id}_纸袋.pdf`;
    zip.file(pdfFileName, pdfBlob);

    // 更新进度
    if (onProgress) {
      onProgress(index + 1, productsWithImages.length);
    }
  }

  // 生成压缩包
  const zipContent = await zip.generateAsync({ type: 'blob' });
  const filename = `手提纸袋PDF_${getDateTimeString()}.zip`;

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

  // 判断是否为日历类型
  const isCalendar = pageSize === 'CALENDAR_PORTRAIT' || pageSize === 'CALENDAR_LANDSCAPE';

  // 计算实际页面尺寸（所有类型都加6mm出血）
  const bleed = 6;
  const actualPageWidth = pageSizeConfig.width + bleed;
  const actualPageHeight = pageSizeConfig.height + bleed;

  for (let index = 0; index < productsWithImages.length; index++) {
    const product = productsWithImages[index];
    const productImages = product.productImages;

    if (!productImages || productImages.length === 0) continue;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [actualPageWidth, actualPageHeight]
    });

    const pageWidth = actualPageWidth;
    const pageHeight = actualPageHeight;

    // 非日历模式: 第一页是货号页
    if (!isCalendar) {
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
    }

    // 产品图页面
    let isFirstImage = true;
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

        // 添加新页 (日历模式且第一张图片时不添加，因为没有货号页)
        if (!isCalendar || !isFirstImage) {
          pdf.addPage();
        }

        // 获取图片尺寸
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageDataUrl;
        });

        // 手账纸和包装纸：直接拉伸铺满整个页面
        // 日历：保持比例并居中显示
        let displayWidth: number;
        let displayHeight: number;
        let x: number;
        let y: number;

        if (isCalendar) {
          // 日历模式：保持图片比例，居中显示
          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;
          const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
          displayWidth = imgWidth * ratio;
          displayHeight = imgHeight * ratio;
          x = (pageWidth - displayWidth) / 2;
          y = (pageHeight - displayHeight) / 2;
        } else {
          // 手账纸/包装纸模式：拉伸铺满整个页面
          displayWidth = pageWidth;
          displayHeight = pageHeight;
          x = 0;
          y = 0;
        }

        pdf.addImage(imageDataUrl, 'JPEG', x, y, displayWidth, displayHeight);

        // 日历模式：在第一张图片的右下角添加货号
        if (isCalendar && isFirstImage) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold'); // 设置粗体
          pdf.setTextColor(50, 50, 50); // 深灰色
          const productCode = product.productCode || product.id;
          const textWidth = pdf.getTextWidth(productCode);
          const textX = pageWidth - textWidth - 8; // 距离右边缘8mm
          const textY = pageHeight - 8; // 距离底部8mm
          pdf.text(productCode, textX, textY);
        }

        isFirstImage = false;

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
  onProgress?: (currentProject: number, totalProjects: number, currentImage: number, totalImages: number, productName: string) => void
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
      const totalImages = product.carouselImages.length;

      for (let i = 0; i < product.carouselImages.length; i++) {
        const imageUrl = product.carouselImages[i];

        // 更新进度 - 双维度统计
        if (onProgress) {
          onProgress(index + 1, productsWithImages.length, i + 1, totalImages, productCode);
        }

        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        folder.file(`商品图_${i + 1}.${ext}`, blob);
      }
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
  onProgress?: (currentProject: number, totalProjects: number, currentImage: number, totalImages: number, productName: string) => void
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
      const totalImages = product.productImages.length;

      for (let i = 0; i < product.productImages.length; i++) {
        const imageUrl = product.productImages[i];

        // 更新进度 - 双维度统计
        if (onProgress) {
          onProgress(index + 1, productsWithImages.length, i + 1, totalImages, productCode);
        }

        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        folder.file(`产品图_${i + 1}.${ext}`, blob);
      }
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

  // 获取店铺名称（取第一个商品的店铺）
  const firstProduct = products[0];
  const shopName = firstProduct.shopId ? getShopName(firstProduct.shopId) : '未知店铺';
  const dateStr = getDateTimeString();
  const fileName = `${shopName}_${dateStr}.xlsx`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '商品列表');
  XLSX.writeFile(wb, fileName);
}

/**
 * 根据分类ID判断产品名称
 */
function getProductNameByCategoryId(categoryId: string): string {
  // 手账本分类
  const journalCategories = JOURNAL_PAPER_CATEGORIES.map(c => c.categoryId);
  if (journalCategories.includes(categoryId)) {
    return '手帐本';
  }

  // 包装纸分类
  const decorativeCategories = DECORATIVE_PAPER_CATEGORIES.map(c => c.categoryId);
  if (decorativeCategories.includes(categoryId)) {
    return '包装纸';
  }

  // 日历分类
  const calendarCategories = CALENDAR_CATEGORIES.map(c => c.categoryId);
  if (calendarCategories.includes(categoryId)) {
    // 根据分类名称判断横版还是竖版
    const category = CALENDAR_CATEGORIES.find(c => c.categoryId === categoryId);
    if (category?.categoryName?.includes('横版')) {
      return '横版日历';
    }
    return '竖版日历';
  }

  // 手提纸袋 - 需要根据实际的分类ID判断
  // 暂时返回"包装袋"作为默认值
  return '包装袋';
}

/**
 * 导出物流信息Excel
 * 列：序号, Fnsku, seller sku, 产品名称, 产品英文名称, 重量, 系统重量, 长, 宽, 高, 货值, 状态, 添加时间
 */
export function exportLogisticsInfo(
  products: Product[],
  getShopName: (shopId: string) => string
): void {
  if (products.length === 0) {
    throw new Error('请至少选择一个商品');
  }

  // 准备导出数据
  const exportData = products.map((product, index) => {
    const productName = getProductNameByCategoryId(product.categoryId);

    return {
      '序号': index + 1,
      'Fnsku': product.productCode || '',
      'seller sku': product.productCode || '',
      '产品名称': productName,
      '产品英文名称': product.nameEn || '',
      '重量': product.weight || '',
      '系统重量': 0,
      '长': product.length || '',
      '宽': product.width || '',
      '高': product.height || '',
      '货值': 0.99,
      '状态': '启用',
      '添加时间': new Date(product.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  });

  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 设置列宽
  const colWidths = [
    { wch: 8 },   // 序号
    { wch: 15 },  // Fnsku
    { wch: 15 },  // seller sku
    { wch: 12 },  // 产品名称
    { wch: 40 },  // 产品英文名称
    { wch: 10 },  // 重量
    { wch: 10 },  // 系统重量
    { wch: 8 },   // 长
    { wch: 8 },   // 宽
    { wch: 8 },   // 高
    { wch: 10 },  // 货值
    { wch: 10 },  // 状态
    { wch: 20 }   // 添加时间
  ];
  ws['!cols'] = colWidths;

  // 设置表头样式
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: 'E8F5E9' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };
  }

  // 设置数据单元格样式和边框
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      ws[cellAddress].s = {
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      };
    }
  }

  // 生成文件名
  const firstProduct = products[0];
  const shopName = firstProduct.shopId ? getShopName(firstProduct.shopId) : '未知店铺';
  const dateStr = getDateTimeString();
  const fileName = `${shopName}_物流信息_${dateStr}.xlsx`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '物流信息');
  XLSX.writeFile(wb, fileName);
}
