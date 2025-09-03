import React from 'react'
import { Layer, LayerType } from '@/types/template'
import { getShadowStyles, getImageShadowStyles } from '@/utils/shadowUtils'

interface LayerComponentProps {
  layer: Layer
  zoom: number
  isSelected: boolean
  activeToolType: 'select' | 'pan'
  onMouseDown: (e: React.MouseEvent) => void
}

export function LayerComponent({ layer, zoom, isSelected, activeToolType, onMouseDown }: LayerComponentProps) {
  if (!layer.visible) return null

  // 根据工具类型决定光标样式
  const getCursorStyle = () => {
    switch (activeToolType) {
      case 'pan':
        return 'grab'
      case 'select':
        return 'move'
      default:
        return 'default'
    }
  }

  // 基础样式
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: layer.x * zoom,
    top: layer.y * zoom,
    width: layer.width * zoom,
    height: layer.height * zoom,
    opacity: layer.style?.opacity || 1,
    cursor: getCursorStyle(),
    pointerEvents: 'auto'
  }

  // 投影样式 - 为不同类型的图层使用不同的投影方式
  const shadowStyles = getShadowStyles(layer.style?.shadow)
  const imageShadowStyles = getImageShadowStyles(layer.style?.shadow)

  // 合并所有样式 - 对于图片不包含投影样式，投影直接应用到img元素
  const style: React.CSSProperties = {
    ...baseStyle,
    ...(layer.type !== LayerType.IMAGE && layer.type !== LayerType.SMART_OBJECT ? shadowStyles : {})
  }

  const borderStyle = isSelected ? {
    outline: '2px solid #3b82f6'
  } : {}

  let content: React.ReactNode

  switch (layer.type) {
    case LayerType.ARTBOARD:
      content = (
        <div
          className="w-full h-full"
          style={{ 
            backgroundColor: layer.content as string, 
            ...style, 
            ...borderStyle,
            overflow: 'hidden' // 确保子元素不会超出画板边界
          }}
          onMouseDown={onMouseDown}
        />
      )
      break

    case LayerType.IMAGE:
    case LayerType.SMART_OBJECT:
      content = (
        <div
          style={{ ...style, ...borderStyle }}
          onMouseDown={onMouseDown}
          className="w-full h-full"
        >
          <img
            src={layer.content as string}
            alt={layer.name}
            className="w-full h-full"
            style={{ 
              ...imageShadowStyles // 应用图片专用的投影样式
            }}
            draggable={false}
          />
        </div>
      )
      break

    case LayerType.TEXT:
      const getJustifyContent = () => {
        switch (layer.style?.textAlign) {
          case 'center': return 'center'
          case 'right': return 'flex-end'
          case 'justify': return 'stretch'
          default: return 'flex-start' // left
        }
      }
      
      content = (
        <div
          style={{ ...style, ...borderStyle }}
          onMouseDown={onMouseDown}
          className="w-full h-full"
        >
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: (layer.style?.fontSize || 16) * zoom,
              fontFamily: layer.style?.fontFamily || 'Tahoma, sans-serif',
              color: layer.style?.color || '#000000',
              writingMode: layer.style?.writingMode || 'horizontal-tb',
              textOrientation: layer.style?.textOrientation === 'vertical' ? 'mixed' : undefined,
              justifyContent: getJustifyContent(),
              textAlign: layer.style?.textAlign || 'left',
              transformOrigin: 'center center'
            }}
          >
            {layer.content as string}
          </div>
        </div>
      )
      break

    default:
      content = (
        <div
          className="w-full h-full bg-gray-200 border-2 border-dashed border-gray-400"
          style={{ ...style, ...borderStyle }}
          onMouseDown={onMouseDown}
        />
      )
  }

  return content
}