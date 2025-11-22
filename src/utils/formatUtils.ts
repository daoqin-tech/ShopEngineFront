/**
 * 格式化生产尺寸为字符串
 * @param length 长度(cm)
 * @param width 宽度(cm)
 * @param height 高度(cm)
 * @returns 格式化后的字符串，如 "29.7×21×0"
 */
export function formatManufacturingSize(
  length?: number | null,
  width?: number | null,
  height?: number | null
): string {
  if (length == null || width == null || height == null) {
    return '-';
  }
  return `${length}×${width}×${height}`;
}

/**
 * 格式化生产尺寸为详细字符串（带单位）
 * @param length 长度(cm)
 * @param width 宽度(cm)
 * @param height 高度(cm)
 * @returns 格式化后的字符串，如 "长29.7cm×宽21cm×高0cm"
 */
export function formatManufacturingSizeDetailed(
  length?: number | null,
  width?: number | null,
  height?: number | null
): string {
  if (length == null || width == null || height == null) {
    return '-';
  }
  return `长${length}cm×宽${width}cm×高${height}cm`;
}
