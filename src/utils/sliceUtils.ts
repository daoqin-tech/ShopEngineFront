import { SliceRegion } from '@/types/template'

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 自动均分算法
export function createAutoSliceRegions(canvasWidth: number, canvasHeight: number): SliceRegion[] {
  // 计算最佳分区数量和方向
  const aspectRatio = canvasWidth / canvasHeight
  
  let sliceCount: number
  let isHorizontal: boolean // true=水平切割(垂直分布), false=垂直切割(水平分布)
  
  if (aspectRatio > 2) {
    // 横向长条(宽>高)：垂直分割成多个正方形或接近正方形
    isHorizontal = false
    sliceCount = Math.round(canvasWidth / canvasHeight) || 1
  } else if (aspectRatio < 0.5) {
    // 纵向长条(高>宽)：水平分割成多个正方形或接近正方形  
    isHorizontal = true
    sliceCount = Math.round(canvasHeight / canvasWidth) || 1
  } else {
    // 接近正方形：根据面积决定分割方式
    const area = canvasWidth * canvasHeight
    if (area > 2000000) { // 大画布，分成4块
      sliceCount = 4
      isHorizontal = canvasHeight > canvasWidth
    } else {
      sliceCount = 1 // 小画布不分割
      isHorizontal = false // 默认值
    }
  }
  
  // 特殊情况：超长画布
  if (canvasHeight > canvasWidth * 4) {
    // 纵向超长：水平分割
    sliceCount = Math.ceil(canvasHeight / canvasWidth)
    isHorizontal = true
  } else if (canvasWidth > canvasHeight * 4) {
    // 横向超长：垂直分割
    sliceCount = Math.ceil(canvasWidth / canvasHeight)
    isHorizontal = false
  }
  
  // 生成分区
  const regions: SliceRegion[] = []
  
  if (isHorizontal) {
    // 水平切割（垂直分布）
    const sliceHeight = canvasHeight / sliceCount
    for (let i = 0; i < sliceCount; i++) {
      regions.push({
        id: generateUUID(),
        x: 0,
        y: Math.round(i * sliceHeight),
        width: canvasWidth,
        height: Math.round(sliceHeight),
        index: i + 1
      })
    }
  } else {
    // 垂直切割（水平分布）
    const sliceWidth = canvasWidth / sliceCount
    for (let i = 0; i < sliceCount; i++) {
      regions.push({
        id: generateUUID(),
        x: Math.round(i * sliceWidth),
        y: 0,
        width: Math.round(sliceWidth),
        height: canvasHeight,
        index: i + 1
      })
    }
  }
  
  return regions
}

// 重新计算分区索引
export function reindexSliceRegions(regions: SliceRegion[]): SliceRegion[] {
  return regions
    .sort((a, b) => {
      // 先按y坐标排序，再按x坐标排序
      if (Math.abs(a.y - b.y) < 5) { // 同一行
        return a.x - b.x
      }
      return a.y - b.y
    })
    .map((region, index) => ({
      ...region,
      index: index + 1
    }))
}