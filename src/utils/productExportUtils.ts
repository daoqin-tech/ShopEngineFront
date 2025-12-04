import * as XLSX from 'xlsx-js-style';
import * as XLSXNative from 'xlsx'; // 导入原生xlsx库用于物流信息导出
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { PDFDocument, cmyk } from 'pdf-lib';
import { Product } from '@/services/productService';
import { ProductCategory } from '@/types/productCategory';
import { JOURNAL_PAPER_CATEGORIES, CALENDAR_CATEGORIES, DECORATIVE_PAPER_CATEGORIES, PLANNER_CATEGORIES, PAPER_BAG_CATEGORIES } from '@/types/shop';
import { imageConversionService } from '@/services/imageConversionService';

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

  // 步骤1: 调用后端接口将RGB图片转换为CMYK（返回base64）
  console.log('开始转换图片为CMYK:', productImages[0]);
  const cmykImageBase64 = await imageConversionService.convertToCMYK(productImages[0]);
  console.log('收到CMYK图片base64，长度:', cmykImageBase64.length);

  // 步骤2: 将base64转换为ArrayBuffer
  // base64格式: data:image/jpeg;base64,/9j/4AAQ...
  const base64Data = cmykImageBase64.split(',')[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const cmykImageBytes = bytes.buffer;

  // 步骤3: 直接嵌入CMYK JPEG（pdf-lib会保留CMYK色彩空间）
  const cmykImage = await pdfDoc.embedJpg(cmykImageBytes);

  // 获取图片尺寸用于裁剪计算
  const imgDims = cmykImage.scale(1);
  const imgRatio = imgDims.width / imgDims.height;
  const targetRatio = halfWidthPt / imageHeightPt; // 320mm / 270mm

  // 计算铺满区域的尺寸（保持图片比例，确保完全覆盖目标区域）
  let imgDisplayWidthPt, imgDisplayHeightPt, offsetX, offsetY;

  if (imgRatio > targetRatio) {
    // 图片更宽 - 以高度为基准，宽度会超出，需要裁剪左右
    imgDisplayHeightPt = imageHeightPt;
    imgDisplayWidthPt = imgDisplayHeightPt * imgRatio;
    offsetX = -(imgDisplayWidthPt - halfWidthPt) / 2; // 居中裁剪
    offsetY = 0;
  } else {
    // 图片更高 - 以宽度为基准，高度会超出，需要裁剪上下
    imgDisplayWidthPt = halfWidthPt;
    imgDisplayHeightPt = imgDisplayWidthPt / imgRatio;
    offsetX = 0;
    offsetY = -(imgDisplayHeightPt - imageHeightPt) / 2; // 居中裁剪
  }

  const imageY = pageHeightPt - imageHeightPt; // pdf-lib坐标系是从底部开始

  // 左半部分：显示CMYK图片（居中裁剪）
  page.drawImage(cmykImage, {
    x: offsetX,
    y: imageY + offsetY,
    width: imgDisplayWidthPt,
    height: imgDisplayHeightPt,
  });

  // 右半部分：显示CMYK图片（居中裁剪）
  page.drawImage(cmykImage, {
    x: halfWidthPt + offsetX,
    y: imageY + offsetY,
    width: imgDisplayWidthPt,
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

// Excel导出列配置类型
type ExcelColumnConfig<T> = {
  key: string;
  width: number;
  getValue: (item: T, ctx?: any) => string | number;
};

// 上架表格列配置（59列）
const EXCEL_COLUMNS: ExcelColumnConfig<Product>[] = [
  { key: '产品标题', width: 35, getValue: p => p.nameZh || '' },
  { key: '英文标题', width: 35, getValue: p => p.nameEn || '' },
  { key: '产品描述', width: 30, getValue: () => '' },
  { key: '产品货号', width: 15, getValue: p => p.newProductCode || '' },
  { key: '变种名称', width: 12, getValue: p => p.variantName || '' },
  { key: '变种属性名称一', width: 18, getValue: p => p.variantAttributeName1 || '' },
  { key: '变种属性值一', width: 12, getValue: p => p.variantAttributeValue1 || '' },
  { key: '变种属性名称二', width: 18, getValue: () => '' },
  { key: '变种属性值二', width: 12, getValue: () => '' },
  { key: '预览图', width: 60, getValue: p => p.previewImage || '' },
  { key: '申报价格', width: 12, getValue: p => p.declaredPrice || '' },
  { key: 'SKU货号', width: 15, getValue: p => p.newProductCode || '' },
  { key: '长', width: 8, getValue: p => p.length || '' },
  { key: '宽', width: 8, getValue: p => p.width || '' },
  { key: '高', width: 8, getValue: p => p.height || '' },
  { key: '重量', width: 10, getValue: p => p.weight || '' },
  { key: '识别码类型', width: 12, getValue: () => '' },
  { key: '识别码', width: 20, getValue: () => '' },
  { key: '站外产品链接', width: 40, getValue: () => '' },
  { key: '轮播图', width: 70, getValue: p => p.carouselImages?.join('\r\n') || '' },
  { key: '产品素材图', width: 60, getValue: p => p.materialImage || '' },
  { key: '外包装形状', width: 12, getValue: () => '' },
  { key: '外包装类型', width: 12, getValue: () => '' },
  { key: '外包装图片', width: 60, getValue: () => '' },
  { key: '建议零售价(建议零售价币种)', width: 15, getValue: p => p.suggestedRetailPrice || '' },
  { key: '库存', width: 10, getValue: p => p.stock || '' },
  { key: '发货时效', width: 10, getValue: p => p.shippingTime || '' },
  { key: '分类id', width: 12, getValue: p => p.categoryId || '' },
  { key: '产品属性', width: 40, getValue: (_p, ctx) => ctx?.categoryConfig?.productAttributes || '' },
  { key: 'SPU属性', width: 30, getValue: () => '' },
  { key: 'SKC属性', width: 40, getValue: () => '' },
  { key: 'SKU属性', width: 40, getValue: () => '' },
  { key: '站点价格', width: 15, getValue: () => '' },
  { key: '来源url', width: 40, getValue: () => '' },
  { key: '产地', width: 20, getValue: p => p.origin || '' },
  { key: '敏感属性', width: 12, getValue: () => '' },
  { key: '备注', width: 20, getValue: () => '' },
  { key: 'SKU分类', width: 12, getValue: () => '' },
  { key: 'SKU分类数量', width: 12, getValue: () => '' },
  { key: 'SKU分类单位', width: 12, getValue: () => '' },
  { key: '独立包装', width: 12, getValue: () => '' },
  { key: '净含量数值', width: 12, getValue: () => '' },
  { key: '净含量单位', width: 12, getValue: () => '' },
  { key: '总净含量', width: 12, getValue: () => '' },
  { key: '总净含量单位', width: 12, getValue: () => '' },
  { key: '混合套装类型', width: 15, getValue: () => '' },
  { key: 'SKU分类总数量', width: 15, getValue: () => '' },
  { key: 'SKU分类总数量单位', width: 15, getValue: () => '' },
  { key: '包装清单', width: 30, getValue: () => '' },
  { key: '生命周期', width: 12, getValue: () => '' },
  { key: '视频Url', width: 60, getValue: () => '' },
  { key: '运费模板（模板id）', width: 30, getValue: p => p.freightTemplateId || '' },
  { key: '经营站点', width: 12, getValue: p => p.operatingSite || '' },
  { key: '所属店铺', width: 25, getValue: (p, ctx) => ctx?.getShopName(p.shopId) || '' },
  { key: 'SPUID', width: 15, getValue: () => '' },
  { key: 'SKCID', width: 15, getValue: () => '' },
  { key: 'SKUID', width: 15, getValue: () => '' },
  { key: '创建时间', width: 20, getValue: p => new Date(p.createdAt).toLocaleString('zh-CN') },
  { key: '更新时间', width: 20, getValue: p => new Date(p.updatedAt).toLocaleString('zh-CN') },
];

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

  const allCategories = [...JOURNAL_PAPER_CATEGORIES, ...DECORATIVE_PAPER_CATEGORIES, ...CALENDAR_CATEGORIES, ...PLANNER_CATEGORIES, ...PAPER_BAG_CATEGORIES];

  // 使用配置生成导出数据
  const exportData = products.map(product => {
    const categoryConfig = allCategories.find(c => c.categoryId === product.categoryId);
    const ctx = { categoryConfig, getShopName };
    const row: Record<string, string | number> = {};
    EXCEL_COLUMNS.forEach(col => {
      row[col.key] = col.getValue(product, ctx);
    });
    return row;
  });

  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 使用配置生成列宽
  ws['!cols'] = EXCEL_COLUMNS.map(col => ({ wch: col.width }));

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

// 物流信息列配置
const LOGISTICS_BASE_COLUMNS: ExcelColumnConfig<Product>[] = [
  { key: 'Fnsku', width: 15, getValue: p => p.newProductCode ? String(p.newProductCode) : '' },
  { key: 'seller sku', width: 15, getValue: p => p.newProductCode ? String(p.newProductCode) : '' },
  { key: '产品英文名', width: 30, getValue: p => p.productCategoryNameEn || '' },
  { key: '产品中文名', width: 20, getValue: p => p.productCategoryName || '' },
  { key: '产品描述', width: 30, getValue: () => '' },
  { key: '申报价值', width: 10, getValue: () => 0.99 },
  { key: '重量', width: 10, getValue: p => p.weight ? p.weight / 1000 : '' },
  { key: '长', width: 8, getValue: p => p.length || '' },
  { key: '宽', width: 8, getValue: p => p.width || '' },
  { key: '高', width: 8, getValue: p => p.height || '' },
  { key: '海关编码', width: 15, getValue: () => '' },
  { key: '原产地', width: 10, getValue: () => '' },
  { key: '是否带电池', width: 12, getValue: () => '不含电池' },
  { key: '颜色', width: 10, getValue: () => '' },
  { key: '平台SKU(如有多个请用英文逗号隔开)', width: 30, getValue: () => '' },
  { key: '规格型号', width: 15, getValue: () => '' },
  { key: '图片URL', width: 60, getValue: p => p.productImages?.[0] || '' },
  { key: '备注', width: 20, getValue: () => '' },
  { key: '是否组合[1为组合sku]', width: 20, getValue: () => '' },
];

// 生成组合SKU列配置（1-25）
const LOGISTICS_COMBO_COLUMNS: ExcelColumnConfig<Product>[] = Array.from({ length: 25 }, (_, i) => [
  { key: `组合sku${i + 1}`, width: 15, getValue: () => '' },
  { key: `组合数量${i + 1}`, width: 12, getValue: () => '' },
]).flat();

// 完整的物流信息列配置
const LOGISTICS_COLUMNS = [...LOGISTICS_BASE_COLUMNS, ...LOGISTICS_COMBO_COLUMNS];

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

  // 使用配置生成导出数据
  const exportData = products.map(product => {
    const row: Record<string, string | number> = {};
    LOGISTICS_COLUMNS.forEach(col => {
      row[col.key] = col.getValue(product);
    });
    return row;
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
 * 产品分类类型枚举
 * 基于 typeCode 判断：SZ-手账纸, BZ-包装纸, HR-横版日历, SR-竖版日历, ST-手提纸袋, BJ-笔记本
 */
export enum ProductCategoryType {
  JOURNAL_PAPER = 'journal_paper',     // 手账纸 (SZ) - 40张
  WRAPPING_PAPER = 'wrapping_paper',   // 包装纸 (BZ) - 20张
  CALENDAR_H = 'calendar_h',           // 横版日历 (HR) - 需要用户排序
  CALENDAR_V = 'calendar_v',           // 竖版日历 (SR) - 需要用户排序
  PAPER_BAG = 'paper_bag',             // 手提纸袋 (ST) - CMYK处理
  NOTEBOOK = 'notebook',               // 笔记本 (BJ) - 单张图片，货号右下角
  NORMAL = 'normal',                   // 其他普通产品
}

/**
 * 获取产品分类类型（基于 typeCode）
 */
export function getProductCategoryType(category: ProductCategory): ProductCategoryType {
  switch (category.typeCode) {
    case 'SZ':
      return ProductCategoryType.JOURNAL_PAPER;
    case 'BZ':
      return ProductCategoryType.WRAPPING_PAPER;
    case 'HR':
      return ProductCategoryType.CALENDAR_H;
    case 'SR':
      return ProductCategoryType.CALENDAR_V;
    case 'ST':
      return ProductCategoryType.PAPER_BAG;
    case 'BJ':
      return ProductCategoryType.NOTEBOOK;
    default:
      return ProductCategoryType.NORMAL;
  }
}

/**
 * 判断是否为日历类型（需要用户排序）
 */
export function isCalendarType(category: ProductCategory): boolean {
  const type = getProductCategoryType(category);
  return type === ProductCategoryType.CALENDAR_H || type === ProductCategoryType.CALENDAR_V;
}

/**
 * 判断是否为手提纸袋类型（需要CMYK处理）
 */
export function isPaperBagType(category: ProductCategory): boolean {
  return getProductCategoryType(category) === ProductCategoryType.PAPER_BAG;
}

/**
 * 判断产品是否需要用户排序（日历类型需要排序）
 */
export function needsUserReorder(category: ProductCategory): boolean {
  return isCalendarType(category);
}

/**
 * 生成单个产品的PDF Blob（公开函数，供外部调用）
 * @param product 产品
 * @param category 产品分类（用于获取生产尺寸）
 * @returns PDF Blob
 */
export async function generateSingleProductPdf(product: Product, category: ProductCategory): Promise<Blob> {
  return generateProductPdfBlob(product, category);
}

// ============================================================================
// PDF 生成函数 - 按分类类型拆分
// ============================================================================

/**
 * 通用工具：获取图片的 DataURL
 */
async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      headers: { 'Accept': 'image/*' }
    });

    if (!response.ok) {
      console.warn(`跳过图片 ${imageUrl}，HTTP错误: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`跳过图片 ${imageUrl}，处理失败:`, error);
    return null;
  }
}

/**
 * 通用工具：创建 jsPDF 实例
 */
function createPdfInstance(pageWidth: number, pageHeight: number, bleed: number = 6): {
  pdf: jsPDF;
  actualWidth: number;
  actualHeight: number;
} {
  const actualWidth = pageWidth + bleed;
  const actualHeight = pageHeight + bleed;
  const orientation = actualWidth > actualHeight ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [actualWidth, actualHeight]
  });

  return { pdf, actualWidth, actualHeight };
}

/**
 * 生成日历 PDF
 * 特点：无货号页，第一页右下角显示货号，需要用户排序
 */
async function generateCalendarPdf(
  product: Product,
  pageWidth: number,
  pageHeight: number
): Promise<Blob> {
  const productImages = product.productImages || [];
  const { pdf, actualWidth, actualHeight } = createPdfInstance(pageWidth, pageHeight);

  let isFirstImage = true;
  for (const imageUrl of productImages) {
    const imageDataUrl = await fetchImageAsDataUrl(imageUrl);
    if (!imageDataUrl) continue;

    if (!isFirstImage) {
      pdf.addPage();
    }

    pdf.addImage(imageDataUrl, 'JPEG', 0, 0, actualWidth, actualHeight);

    // 第一页右下角显示货号
    if (isFirstImage) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(50, 50, 50);
      const productCode = product.newProductCode || product.id;
      const textWidth = pdf.getTextWidth(productCode);
      pdf.text(productCode, actualWidth - textWidth - 8, actualHeight - 8);
    }

    isFirstImage = false;
  }

  return pdf.output('blob');
}

/**
 * 生成普通产品 PDF（手账纸、包装纸等）
 * 特点：第一页是货号页（带黑色标记），后续是产品图
 */
async function generateNormalProductPdf(
  product: Product,
  pageWidth: number,
  pageHeight: number
): Promise<Blob> {
  const productImages = product.productImages || [];
  const { pdf, actualWidth, actualHeight } = createPdfInstance(pageWidth, pageHeight);

  // 第一页：货号页
  pdf.setFontSize(40);
  pdf.setTextColor(0, 0, 0);
  const productCode = product.newProductCode || product.id;
  const textWidth = pdf.getTextWidth(productCode);
  pdf.text(productCode, (actualWidth - textWidth) / 2, actualHeight / 2);

  // 右下角黑色标记（用于分本）
  const blackMarkWidth = 10;
  const blackMarkHeight = 5;
  pdf.setFillColor(0, 0, 0);
  pdf.rect(actualWidth - blackMarkWidth, actualHeight - blackMarkHeight - 5, blackMarkWidth, blackMarkHeight, 'F');

  // 后续页：产品图
  for (const imageUrl of productImages) {
    const imageDataUrl = await fetchImageAsDataUrl(imageUrl);
    if (!imageDataUrl) continue;

    pdf.addPage();
    pdf.addImage(imageDataUrl, 'JPEG', 0, 0, actualWidth, actualHeight);
  }

  return pdf.output('blob');
}

/**
 * 从图片右侧区域提取平均颜色
 * @param imageDataUrl 图片的 DataURL
 * @param rightPercentage 右侧区域占比（0-1），默认 0.1 即 10%
 * @returns RGB颜色对象 {r, g, b}
 */
async function extractRightEdgeColor(imageDataUrl: string, rightPercentage: number = 0.1): Promise<{r: number, g: number, b: number}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ r: 200, g: 200, b: 200 }); // 默认灰色
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 计算右侧区域的起始位置
      const startX = Math.floor(img.width * (1 - rightPercentage));
      const regionWidth = img.width - startX;

      // 获取右侧区域的像素数据
      const imageData = ctx.getImageData(startX, 0, regionWidth, img.height);
      const pixels = imageData.data;

      let totalR = 0, totalG = 0, totalB = 0;
      const pixelCount = pixels.length / 4;

      for (let i = 0; i < pixels.length; i += 4) {
        totalR += pixels[i];
        totalG += pixels[i + 1];
        totalB += pixels[i + 2];
      }

      resolve({
        r: Math.round(totalR / pixelCount),
        g: Math.round(totalG / pixelCount),
        b: Math.round(totalB / pixelCount)
      });
    };
    img.onerror = () => {
      resolve({ r: 200, g: 200, b: 200 }); // 默认灰色
    };
    img.src = imageDataUrl;
  });
}

/**
 * 生成笔记本 PDF
 * 特点：封面 + 封底展开图，总宽度 432mm，高度 210mm
 * - 封面（左半部分）：产品图
 * - 封底（右半部分）：从封面提取的主色调纯色，货号在封底
 * - 出血：6mm
 */
async function generateNotebookPdf(
  product: Product,
  _pageWidth: number,  // 原始宽度参数不使用，笔记本有特殊尺寸
  _pageHeight: number  // 原始高度参数不使用
): Promise<Blob> {
  const productImages = product.productImages || [];

  // 笔记本特殊尺寸：封面+封底展开（已含出血）
  // 总宽度 432mm（已含出血）= 封面 216mm + 封底 216mm
  // 高度 286mm（280mm + 6mm出血）
  const actualWidth = 432; // mm（已含出血）
  const actualHeight = 286; // mm（280mm + 6mm出血）
  const halfWidth = actualWidth / 2; // 封面和封底各占一半 216mm

  // 创建 PDF（横向）
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [actualWidth, actualHeight]
  });

  if (productImages.length > 0) {
    const imageDataUrl = await fetchImageAsDataUrl(productImages[0]);
    if (imageDataUrl) {
      // 1. 从图片右侧 10% 区域提取颜色
      const edgeColor = await extractRightEdgeColor(imageDataUrl, 0.1);

      // 2. 封底（右半部分）：填充纯色
      pdf.setFillColor(edgeColor.r, edgeColor.g, edgeColor.b);
      pdf.rect(halfWidth, 0, halfWidth, actualHeight, 'F');

      // 3. 封面（左半部分）：绘制产品图
      pdf.addImage(imageDataUrl, 'JPEG', 0, 0, halfWidth, actualHeight);

      // 4. 货号放在封底右下角
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      // 根据背景色亮度决定文字颜色
      const brightness = (edgeColor.r * 299 + edgeColor.g * 587 + edgeColor.b * 114) / 1000;
      if (brightness > 128) {
        pdf.setTextColor(50, 50, 50); // 深色文字
      } else {
        pdf.setTextColor(220, 220, 220); // 浅色文字
      }
      const productCode = product.newProductCode || product.id;
      const textWidth = pdf.getTextWidth(productCode);
      pdf.text(productCode, actualWidth - textWidth - 10, actualHeight - 10);
    }
  }

  return pdf.output('blob');
}

/**
 * 生成单个产品的 PDF Blob（路由函数）
 * 根据分类类型调用对应的生成函数
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

  const { width, height } = pageSizeConfig;
  const categoryType = getProductCategoryType(category);

  switch (categoryType) {
    case ProductCategoryType.PAPER_BAG:
      // 手提纸袋：CMYK 处理，无出血
      return generatePaperBagPdfWithCMYK(product, width, height);

    case ProductCategoryType.CALENDAR_H:
    case ProductCategoryType.CALENDAR_V:
      // 日历：无货号页，第一页显示货号
      return generateCalendarPdf(product, width, height);

    case ProductCategoryType.NOTEBOOK:
      // 笔记本：只导出第一张图片，货号右下角，出血6mm
      return generateNotebookPdf(product, width, height);

    case ProductCategoryType.JOURNAL_PAPER:
    case ProductCategoryType.WRAPPING_PAPER:
    default:
      // 手账纸、包装纸、其他：货号页 + 产品图
      return generateNormalProductPdf(product, width, height);
  }
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

    if (isCalendarType(category)) {
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
