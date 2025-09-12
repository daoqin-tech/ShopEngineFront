import { SliceRegion } from '@/types/template'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, X } from 'lucide-react'

interface SlicePanelProps {
  regions: SliceRegion[]
  onDeleteSlice: (sliceId: string) => void
  onAddSlice: () => void
}

export function SlicePanel({ 
  regions, 
  onDeleteSlice, 
  onAddSlice 
}: SlicePanelProps) {
  if (!regions?.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">图片分区</h3>
        </div>
        
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-sm">
            点击左侧分区工具开始创建分区
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">图片分区</h3>
        <span className="text-sm text-muted-foreground">{regions.length} 个分区</span>
      </div>
      
      {/* 提示信息 */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        <div className="font-medium mb-1">提示:</div>
        <div>• 分区将用于后续的套图功能</div>
        <div>• 每个分区会生成一张独立的商品图</div>
      </div>
      
      <Separator />
      
      {/* 分区列表 */}
      <div className="flex-1 min-h-0">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          分区列表
        </div>
        <div className="space-y-2 h-full overflow-y-auto">
          {regions
            .sort((a, b) => a.index - b.index)
            .map((region) => (
              <div
                key={region.id}
                className="p-3 rounded-md border bg-card border-border hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground font-mono w-6 text-center">
                      {region.index}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      区域 {region.index}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-muted-foreground">
                      {region.width} × {region.height}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSlice(region.id)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  位置: ({region.x}, {region.y})
                </div>
              </div>
            ))}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddSlice}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加分区
        </Button>
      </div>
    </div>
  )
}