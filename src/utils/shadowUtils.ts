import { Layer } from '@/types/template'

/**
 * 根据角度和距离计算 offsetX 和 offsetY
 */
export function calculateShadowOffset(angle: number, distance: number) {
  const radians = (angle * Math.PI) / 180
  return {
    offsetX: Math.cos(radians) * distance,
    offsetY: Math.sin(radians) * distance
  }
}

/**
 * 将 PSD 投影设置转换为 CSS box-shadow
 */
export function shadowToCSSBoxShadow(shadow: NonNullable<Layer['style']>['shadow']): string {
  if (!shadow || !shadow.enabled) {
    return 'none'
  }

  const { offsetX, offsetY } = calculateShadowOffset(shadow.angle, shadow.distance)
  
  // 构建 box-shadow 值
  const insetKeyword = shadow.inner_shadow ? 'inset ' : ''
  const x = Math.round(offsetX)
  const y = Math.round(offsetY)
  const blur = shadow.size
  const spread = shadow.spread
  
  // 处理颜色和透明度
  const color = hexToRgba(shadow.color, shadow.opacity / 100)
  
  return `${insetKeyword}${x}px ${y}px ${blur}px ${spread}px ${color}`
}

/**
 * 将十六进制颜色转换为带透明度的 rgba
 */
function hexToRgba(hex: string, opacity: number): string {
  // 移除 # 符号
  hex = hex.replace('#', '')
  
  // 处理 3 位或 6 位十六进制
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }
  
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * 将 CSS 混合模式转换为对应的 mix-blend-mode 值
 */
export function getBlendModeCSS(blendMode?: string): string {
  const blendModeMap: Record<string, string> = {
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'soft_light': 'soft-light',
    'hard_light': 'hard-light',
    'color_dodge': 'color-dodge',
    'color_burn': 'color-burn',
    'darken': 'darken',
    'lighten': 'lighten',
    'difference': 'difference',
    'exclusion': 'exclusion'
  }
  
  return blendModeMap[blendMode || 'multiply'] || 'normal'
}

/**
 * 将 PSD 投影设置转换为 CSS filter: drop-shadow (用于图片)
 */
export function shadowToCSSDropShadow(shadow: NonNullable<Layer['style']>['shadow']): string {
  if (!shadow || !shadow.enabled) {
    return 'none'
  }

  const { offsetX, offsetY } = calculateShadowOffset(shadow.angle, shadow.distance)
  
  const x = Math.round(offsetX)
  const y = Math.round(offsetY)
  const blur = shadow.size
  
  // 处理颜色和透明度
  const color = hexToRgba(shadow.color, shadow.opacity / 100)
  
  return `drop-shadow(${x}px ${y}px ${blur}px ${color})`
}

/**
 * 获取完整的投影 CSS 样式对象
 */
export function getShadowStyles(shadow: NonNullable<Layer['style']>['shadow']): React.CSSProperties {
  if (!shadow || !shadow.enabled) {
    return {}
  }

  const styles: React.CSSProperties = {
    boxShadow: shadowToCSSBoxShadow(shadow)
  }

  // 如果不是默认的混合模式，添加 mix-blend-mode
  if (shadow.blend_mode && shadow.blend_mode !== 'multiply') {
    styles.mixBlendMode = getBlendModeCSS(shadow.blend_mode) as any
  }

  return styles
}

/**
 * 获取图片专用的投影样式 (使用 filter: drop-shadow)
 */
export function getImageShadowStyles(shadow: NonNullable<Layer['style']>['shadow']): React.CSSProperties {
  if (!shadow || !shadow.enabled) {
    return {}
  }

  const styles: React.CSSProperties = {
    filter: shadowToCSSDropShadow(shadow)
  }

  // 如果不是默认的混合模式，添加 mix-blend-mode
  if (shadow.blend_mode && shadow.blend_mode !== 'multiply') {
    styles.mixBlendMode = getBlendModeCSS(shadow.blend_mode) as any
  }

  return styles
}