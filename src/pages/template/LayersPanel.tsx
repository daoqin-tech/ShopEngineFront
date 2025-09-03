import { useEffect, useRef } from 'react'
import { Layer, LayerType } from '@/types/template'
import { Checkbox } from '@/components/ui/checkbox'

interface LayersPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string) => void
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void
}

export function LayersPanel({ 
  layers, 
  selectedLayerId, 
  onSelectLayer, 
  onUpdateLayer
}: LayersPanelProps) {
  const selectedLayerRef = useRef<HTMLDivElement>(null)

  // 当选中图层改变时，自动滚动到对应的图层项
  useEffect(() => {
    if (selectedLayerId && selectedLayerRef.current) {
      selectedLayerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [selectedLayerId])

  // 截取图层名称，避免过长
  const truncateLayerName = (name: string, maxLength: number = 15) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">图层</h3>
        <span className="text-sm text-muted-foreground">{layers.length} 个图层</span>
      </div>
      
      <div className="space-y-1">
        {[...layers].reverse().sort((a, b) => {
          // smart_object 图层排在前面
          if (a.type === LayerType.SMART_OBJECT && b.type !== LayerType.SMART_OBJECT) return -1
          if (a.type !== LayerType.SMART_OBJECT && b.type === LayerType.SMART_OBJECT) return 1
          return 0
        }).filter(layer => layer.visible).map((layer, index) => (
          <div
            key={layer.id}
            ref={selectedLayerId === layer.id ? selectedLayerRef : undefined}
            className={`p-3 rounded-md border cursor-pointer transition-colors ${
              selectedLayerId === layer.id 
                ? 'bg-accent border-accent-foreground/20' 
                : 'bg-card border-border hover:bg-accent/50'
            }`}
            onClick={() => onSelectLayer(layer.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-xs text-muted-foreground font-mono w-6 text-center flex-shrink-0">
                  {index + 1}
                </span>
                <span 
                  className="text-sm font-medium text-foreground flex-1 min-w-0 truncate"
                  title={layer.name}
                >
                  {truncateLayerName(layer.name)}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* 可替换复选框 - 只显示智能对象图层 */}
                {layer.type === LayerType.SMART_OBJECT && (
                  <div 
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={layer.replaceable || false}
                      onCheckedChange={(checked: boolean) => {
                        onUpdateLayer(layer.id, { replaceable: checked })
                      }}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-foreground">可替换</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {layer.type} · {Math.round(layer.x)}, {Math.round(layer.y)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}