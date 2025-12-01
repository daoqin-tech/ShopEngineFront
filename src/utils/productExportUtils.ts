import * as XLSX from 'xlsx-js-style';
import * as XLSXNative from 'xlsx'; // 导入原生xlsx库用于物流信息导出
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import convert from 'color-convert';
import { PDFDocument, rgb, cmyk } from 'pdf-lib';
import { Product } from '@/services/productService';
import { ProductCategory } from '@/types/productCategory';
import { JOURNAL_PAPER_CATEGORIES, CALENDAR_CATEGORIES, DECORATIVE_PAPER_CATEGORIES, PLANNER_CATEGORIES, PAPER_BAG_CATEGORIES } from '@/types/shop';

/**
 * 生成日期时间字符串（用于文件名）
 */
function getDateTimeString(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * 从产品分类获取PDF页面尺寸
 * @param category 产品分类
 * @returns PDF页面尺寸 {width, height}，单位mm
 */
function getPageSizeFromCategory(category: ProductCategory): { width: number; height: number } | null {
  if (!category.manufacturingLength || !category.manufacturingWidth) {
    return null;
  }

  // 生产尺寸是cm，转换为mm
  const length = category.manufacturingLength * 10;
  const width = category.manufacturingWidth * 10;

  // manufacturingLength 对应 PDF 的高度，manufacturingWidth 对应 PDF 的宽度
  return { width: width, height: length };
}

/**
 * 加载图片并获取其DataURL和原始尺寸
 * @param imageUrl 图片URL
 * @returns 包含DataURL和Image对象的对象
 */
async function loadImageWithSize(imageUrl: string): Promise<{ dataUrl: string; img: HTMLImageElement }> {
  const response = await fetch(imageUrl, {
    mode: 'cors',
    headers: { 'Accept': 'image/*' }
  });
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(blob);
  });

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  return { dataUrl, img };
}

/**
 * 将RGB图片转换为CMYK模式
 * @param img HTML图片元素
 * @returns CMYK模式的图片DataURL
 */
async function convertImageToCMYK(img: HTMLImageElement): Promise<string> {
  // 创建Canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }

  // 绘制原始图片
  ctx.drawImage(img, 0, 0);

  // 获取图片像素数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 将每个像素从RGB转换为CMYK
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 使用color-convert转换为CMYK (值范围0-100)
    const [c, m, y, k] = convert.rgb.cmyk(r, g, b);

    // 将CMYK转回RGB用于显示 (因为Canvas只支持RGB)
    // 这里实际上我们需要的是CMYK值,但Canvas无法直接显示CMYK
    // 所以我们先保持RGB,在PDF中使用CMYK色彩空间

    // 简单的CMYK到RGB转换
    const rNew = 255 * (1 - c / 100) * (1 - k / 100);
    const gNew = 255 * (1 - m / 100) * (1 - k / 100);
    const bNew = 255 * (1 - y / 100) * (1 - k / 100);

    data[i] = Math.round(rNew);
    data[i + 1] = Math.round(gNew);
    data[i + 2] = Math.round(bNew);
    // alpha通道保持不变
  }

  // 将处理后的数据放回Canvas
  ctx.putImageData(imageData, 0, 0);

  // 返回处理后的DataURL
  return canvas.toDataURL('image/jpeg', 1.0);
}

/**
 * 生成手提纸袋PDF (使用pdf-lib生成CMYK PDF)
 * @param product 产品信息
 * @param pageWidth 页面宽度 (mm)
 * @param pageHeight 页面高度 (mm)
 * @returns PDF Blob
 */
async function generatePaperBagPdfWithCMYK(
  product: Product,
  pageWidth: number,
  pageHeight: number
): Promise<Blob> {
  const productImages = product.productImages || [];

  if (productImages.length < 1) {
    throw new Error(`纸袋产品 ${product.newProductCode || product.id} 需要至少1张产品图`);
  }

  // 创建新的PDF文档
  const pdfDoc = await PDFDocument.create();

  // 图像填充区域 (64cm x 27cm = 640mm x 270mm)
  // pdf-lib使用点(points)作为单位: 1mm ≈ 2.83465 points
  const mmToPoints = 2.83465;
  const pageWidthPt = pageWidth * mmToPoints;
  const pageHeightPt = pageHeight * mmToPoints;

  const imageWidth = 640;
  const imageHeight = 270;
  const imageWidthPt = imageWidth * mmToPoints;
  const imageHeightPt = imageHeight * mmToPoints;
  const halfWidthPt = imageWidthPt / 2;

  // 添加页面
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // 加载第一张图片
  const response = await fetch(productImages[0], {
    mode: 'cors',
    headers: { 'Accept': 'image/*' }
  });
  const imageBytes = await response.arrayBuffer();

  // 根据图片类型嵌入图片
  let image;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('png')) {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }

  const imgDims = image.scale(1);
  const imgRatio = imgDims.width / imgDims.height;

  // 计算图片实际显示尺寸（保持原始比例）
  const imgDisplayHeightPt = imageHeightPt;
  const imgDisplayWidthPt = imgDisplayHeightPt * imgRatio;

  // 左半部分：显示同一张图
  page.drawImage(image, {
    x: 0,
    y: pageHeightPt - imageHeightPt, // pdf-lib坐标系是从底部开始
    width: Math.min(imgDisplayWidthPt, halfWidthPt),
    height: imgDisplayHeightPt,
  });

  // 右半部分：显示同一张图
  page.drawImage(image, {
    x: halfWidthPt,
    y: pageHeightPt - imageHeightPt,
    width: Math.min(imgDisplayWidthPt, halfWidthPt),
    height: imgDisplayHeightPt,
  });

  // 在底部中心位置添加货号 (使用CMYK黑色)
  const productCode = product.newProductCode || product.id;
  const fontSize = 12;

  // 获取文本宽度
  const font = await pdfDoc.embedFont('Helvetica-Bold');
  const textWidth = font.widthOfTextAtSize(productCode, fontSize);
  const textX = (pageWidthPt - textWidth) / 2;
  const textY = 8 * mmToPoints; // 距离底部8mm

  page.drawText(productCode, {
    x: textX,
    y: textY,
    size: fontSize,
    font: font,
    color: cmyk(0, 0, 0, 1), // CMYK黑色 (100% K)
  });

  // 生成PDF并返回Blob
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * 通用PDF生成方法（手账纸、包装纸等）
 * 第一页是货号页，后续页是产品图
 */
async function generateGenericProductPdf(
  product: Product,
  category: ProductCategory
): Promise<Blob> {
  const pageSizeConfig = getPageSizeFromCategory(category);
  if (!pageSizeConfig) {
    throw new Error(`分类 ${category.name} 缺少生产尺寸信息`);
  }

  const bleed = 6;
  const actualPageWidth = pageSizeConfig.width + bleed;
  const actualPageHeight = pageSizeConfig.height + bleed;
  const orientation = actualPageWidth > actualPageHeight ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [actualPageWidth, actualPageHeight]
  });

  const pageWidth = actualPageWidth;
  const pageHeight = actualPageHeight;

  // 第一页：货号页
  pdf.setFontSize(40);
  pdf.setTextColor(0, 0, 0);
  const productCode = product.newProductCode || product.id;
  const textWidth = pdf.getTextWidth(productCode);
  const textX = (pageWidth - textWidth) / 2;
  const textY = pageHeight / 2;
  pdf.text(productCode, textX, textY);

  // 添加右下角黑色标记（用于分本）
  const blackMarkWidth = 10;
  const blackMarkHeight = 5;
  const blackMarkX = pageWidth - blackMarkWidth;
  const blackMarkY = pageHeight - blackMarkHeight - 5;
  pdf.setFillColor(0, 0, 0);
  pdf.rect(blackMarkX, blackMarkY, blackMarkWidth, blackMarkHeight, 'F');

  // 产品图页面
  const productImages = product.productImages || [];
  for (const imageUrl of productImages) {
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        headers: { 'Accept': 'image/*' }
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

      pdf.addPage();

      // 拉伸铺满整个页面（包含出血）
      pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.warn(`跳过图片 ${imageUrl}，处理失败:`, error);
    }
  }

  return pdf.output('blob');
}

/**
 * 日历PDF生成方法
 * 第一页直接是产品图（右下角显示货号），无货号页
 */
async function generateCalendarProductPdf(
  product: Product,
  category: ProductCategory
): Promise<Blob> {
  const pageSizeConfig = getPageSizeFromCategory(category);
  if (!pageSizeConfig) {
    throw new Error(`分类 ${category.name} 缺少生产尺寸信息`);
  }

  const bleed = 6;
  const actualPageWidth = pageSizeConfig.width + bleed;
  const actualPageHeight = pageSizeConfig.height + bleed;
  const orientation = actualPageWidth > actualPageHeight ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [actualPageWidth, actualPageHeight]
  });

  const pageWidth = actualPageWidth;
  const pageHeight = actualPageHeight;

  // 产品图页面（无货号页）
  const productImages = product.productImages || [];
  let isFirstImage = true;

  for (const imageUrl of productImages) {
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        headers: { 'Accept': 'image/*' }
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

      // 第一张图片不需要添加新页
      if (!isFirstImage) {
        pdf.addPage();
      }

      // 拉伸铺满整个页面（包含出血）
      pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);

      // 在第一张图片的右下角添加货号
      if (isFirstImage) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(50, 50, 50);
        const productCode = product.newProductCode || product.id;
        const textWidth = pdf.getTextWidth(productCode);
        const textX = pageWidth - textWidth - 8;
        const textY = pageHeight - 8;
        pdf.text(productCode, textX, textY);
      }

      isFirstImage = false;
    } catch (error) {
      console.warn(`跳过图片 ${imageUrl}，处理失败:`, error);
    }
  }

  return pdf.output('blob');
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
    const productCode = product.newProductCode || product.id;
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
    const productCode = product.newProductCode || product.id;
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
  const allCategories = [...JOURNAL_PAPER_CATEGORIES, ...DECORATIVE_PAPER_CATEGORIES, ...CALENDAR_CATEGORIES, ...PLANNER_CATEGORIES, ...PAPER_BAG_CATEGORIES];

  const exportData = products.map(product => {
    const categoryConfig = allCategories.find(c => c.categoryId === product.categoryId);

    return {
      '产品标题': product.nameZh || '',
      '英文标题': product.nameEn || '',
      '产品描述': '',
      '产品货号': product.newProductCode || '',
      '变种名称': product.variantName || '',
      '变种属性名称一': product.variantAttributeName1 || '',
      '变种属性值一': product.variantAttributeValue1 || '',
      '变种属性名称二': '',
      '变种属性值二': '',
      '预览图': product.previewImage || '',
      '申报价格': product.declaredPrice || '',
      'SKU货号': product.newProductCode || '',
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
 * 导出物流信息Excel
 * 使用原生xlsx库，不添加任何自定义格式
 */
export function exportLogisticsInfo(
  products: Product[],
  getShopName: (shopId: string) => string
): void {
  if (products.length === 0) {
    throw new Error('请至少选择一个商品');
  }

  // 准备导出数据 - 不做任何格式转换，让xlsx自动处理
  const exportData = products.map((product) => {
    return {
      'Fnsku': product.newProductCode ? String(product.newProductCode) : '',
      'seller sku': product.newProductCode ? String(product.newProductCode) : '',
      '产品英文名': product.productCategoryNameEn || '',
      '产品中文名': product.productCategoryName || '',
      '产品描述': '',
      '申报价值': 0.99,
      '重量': product.weight ? product.weight / 1000 : '',
      '长': product.length || '',
      '宽': product.width || '',
      '高': product.height || '',
      '海关编码': '',
      '原产地': '',
      '是否带电池': '不含电池',
      '颜色': '',
      '平台SKU(如有多个请用英文逗号隔开)': '',
      '规格型号': '',
      '图片URL': product.productImages && product.productImages.length > 0 ? product.productImages[0] : '',
      '备注': '',
      '是否组合[1为组合sku]': '',
      '组合sku1': '',
      '组合数量1': '',
      '组合sku2': '',
      '组合数量2': '',
      '组合sku3': '',
      '组合数量3': '',
      '组合sku4': '',
      '组合数量4': '',
      '组合sku5': '',
      '组合数量5': '',
      '组合sku6': '',
      '组合数量6': '',
      '组合sku7': '',
      '组合数量7': '',
      '组合sku8': '',
      '组合数量8': '',
      '组合sku9': '',
      '组合数量9': '',
      '组合sku10': '',
      '组合数量10': '',
      '组合sku11': '',
      '组合数量11': '',
      '组合sku12': '',
      '组合数量12': '',
      '组合sku13': '',
      '组合数量13': '',
      '组合sku14': '',
      '组合数量14': '',
      '组合sku15': '',
      '组合数量15': '',
      '组合sku16': '',
      '组合数量16': '',
      '组合sku17': '',
      '组合数量17': '',
      '组合sku18': '',
      '组合数量18': '',
      '组合sku19': '',
      '组合数量19': '',
      '组合sku20': '',
      '组合数量20': '',
      '组合sku21': '',
      '组合数量21': '',
      '组合sku22': '',
      '组合数量22': '',
      '组合sku23': '',
      '组合数量23': '',
      '组合sku24': '',
      '组合数量24': '',
      '组合sku25': ''
    };
  });

  // 使用原生xlsx创建worksheet
  const ws = XLSXNative.utils.json_to_sheet(exportData);
  const wb = XLSXNative.utils.book_new();
  XLSXNative.utils.book_append_sheet(wb, ws, '物流信息');

  // 生成文件名
  const firstProduct = products[0];
  const shopName = firstProduct.shopId ? getShopName(firstProduct.shopId) : '未知店铺';
  const dateStr = getDateTimeString();
  const fileName = `${shopName}_物流信息_${dateStr}.xls`;

  // 使用 bookSST: true 确保使用 LabelSST 记录（与模板文件一致）
  XLSXNative.writeFile(wb, fileName, {
    bookType: 'xls',
    bookSST: true  // 使用共享字符串表（Shared String Table）
  });
}

/**
 * 生成单个产品的PDF Blob（不下载）
 * @param product 产品
 * @param category 产品分类（用于获取生产尺寸）
 * @returns PDF Blob
 */
async function generateProductPdfBlob(product: Product, category: ProductCategory): Promise<Blob> {
  const productImages = product.productImages || [];

  if (productImages.length === 0) {
    throw new Error(`产品 ${product.newProductCode || product.id} 没有产品图`);
  }

  const pageSizeConfig = getPageSizeFromCategory(category);
  if (!pageSizeConfig) {
    throw new Error(`产品分类 ${category.name} 缺少生产尺寸信息`);
  }

  const isCalendar = category.id === '3' || category.id === '4';
  const isPaperBag = category.id === '5'; // 手提纸袋
  const bleed = 6;
  const actualPageWidth = pageSizeConfig.width + bleed;
  const actualPageHeight = pageSizeConfig.height + bleed;
  const orientation = actualPageWidth > actualPageHeight ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [actualPageWidth, actualPageHeight]
  });

  const pageWidth = actualPageWidth;
  const pageHeight = actualPageHeight;

  // 手提纸袋特殊处理: 只用第1张图,左右并排显示同一张图,不要货号页,使用CMYK色彩空间
  if (isPaperBag) {
    return await generatePaperBagPdfWithCMYK(product, pageWidth, pageHeight);
  }

  // 非日历、非纸袋模式: 第一页是货号页
  if (!isCalendar) {
    pdf.setFontSize(40);
    pdf.setTextColor(0, 0, 0);
    const productCode = product.newProductCode || product.id;
    const textWidth = pdf.getTextWidth(productCode);
    const textX = (pageWidth - textWidth) / 2;
    const textY = pageHeight / 2;
    pdf.text(productCode, textX, textY);

    const blackMarkWidth = 10;
    const blackMarkHeight = 5;
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
        headers: { 'Accept': 'image/*' }
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

      if (!isCalendar || !isFirstImage) {
        pdf.addPage();
      }

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      const displayWidth = pageWidth;
      const displayHeight = pageHeight;
      const x = 0;
      const y = 0;

      pdf.addImage(imageDataUrl, 'JPEG', x, y, displayWidth, displayHeight);

      if (isCalendar && isFirstImage) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(50, 50, 50);
        const productCode = product.newProductCode || product.id;
        const textWidth = pdf.getTextWidth(productCode);
        const textX = pageWidth - textWidth - 8;
        const textY = pageHeight - 8;
        pdf.text(productCode, textX, textY);
      }

      isFirstImage = false;
    } catch (error) {
      console.warn(`跳过图片 ${imageUrl}，处理失败:`, error);
    }
  }

  return pdf.output('blob');
}

/**
 * 智能批量导出产品PDF（新版 - 统一打包）
 * - 自动根据产品分类识别页面尺寸
 * - 所有产品打包到一个ZIP文件中
 * - 日历类型需要逐个调整月份顺序
 *
 * @param products 要导出的产品列表
 * @param categories 产品分类列表（用于获取生产尺寸）
 * @returns 返回导出结果，包括需要调整顺序的日历产品列表和非日历产品的ZIP
 */
export async function exportProductPdfSmart(
  products: Product[],
  categories: ProductCategory[]
): Promise<{
  zip: JSZip; // 共享的ZIP对象
  nonCalendarCount: number; // 已添加到ZIP的非日历产品数量
  calendarProducts: { products: Product[]; category: ProductCategory }[]; // 待调整顺序的日历产品
}> {
  // 创建共享的ZIP对象
  const zip = new JSZip();

  // 创建分类ID到分类对象的映射
  const categoryMap = new Map<string, ProductCategory>();
  for (const category of categories) {
    categoryMap.set(category.id, category);
  }

  // 按分类ID分组
  const productsByCategory = new Map<string, { products: Product[]; category: ProductCategory | null }>();

  for (const product of products) {
    const categoryKey = product.productCategoryId || 'unknown';
    const category = categoryMap.get(categoryKey) || null;

    if (!productsByCategory.has(categoryKey)) {
      productsByCategory.set(categoryKey, { products: [], category });
    }

    productsByCategory.get(categoryKey)!.products.push(product);
  }

  let processedCount = 0;
  const calendarProductsList: { products: Product[]; category: ProductCategory }[] = [];

  // 遍历每个分类
  for (const [categoryId, { products: categoryProducts, category }] of productsByCategory) {
    if (!category) {
      console.warn(`产品分类 ${categoryId} 无法找到分类信息，跳过导出`);
      continue;
    }

    const isCalendar = category.id === '3' || category.id === '4';

    if (isCalendar) {
      // 日历类型：收集起来，等待用户调整顺序
      calendarProductsList.push({ products: categoryProducts, category });
    } else {
      // 非日历类型：生成PDF并添加到ZIP
      for (let i = 0; i < categoryProducts.length; i++) {
        const product = categoryProducts[i];

        try {
          const pdfBlob = await generateProductPdfBlob(product, category);
          const pdfFileName = `${product.newProductCode || product.id}.pdf`;
          zip.file(pdfFileName, pdfBlob);
        } catch (error) {
          console.error(`生成PDF失败: ${product.newProductCode || product.id}`, error);
        }
      }

      processedCount += categoryProducts.length;
    }
  }

  return {
    zip,
    nonCalendarCount: processedCount,
    calendarProducts: calendarProductsList
  };
}

/**
 * 添加日历PDF到现有ZIP
 * @param zip 现有的ZIP对象
 * @param products 日历产品列表
 * @param category 产品分类（用于获取生产尺寸）
 */
export async function addCalendarPdfsToZip(
  zip: JSZip,
  products: Product[],
  category: ProductCategory
): Promise<void> {
  for (const product of products) {
    const pdfBlob = await generateProductPdfBlob(product, category);
    const pdfFileName = `${product.newProductCode || product.id}.pdf`;
    zip.file(pdfFileName, pdfBlob);
  }
}

/**
 * 下载ZIP文件
 * @param zip ZIP对象
 * @param filename 文件名
 */
export async function downloadZip(zip: JSZip, filename?: string): Promise<void> {
  const zipContent = await zip.generateAsync({ type: 'blob' });
  const defaultFilename = `产品图PDF_${getDateTimeString()}.zip`;

  const url = window.URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
