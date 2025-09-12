import { SliceRegion } from '@/types/template'

interface SliceRegionsOverlayProps {
  regions: SliceRegion[]
  zoom: number
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}

export function SliceRegionsOverlay({ 
  regions, 
  zoom, 
  canvasWidth, 
  canvasHeight,
  isActive 
}: SliceRegionsOverlayProps) {
  if (!isActive || !regions?.length) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        width: canvasWidth * zoom,
        height: canvasHeight * zoom
      }}
    >
      {regions.map((region) => (
        <div
          key={region.id}
          className="absolute border-2 border-red-500 border-dashed bg-red-500/10"
          style={{
            left: region.x * zoom,
            top: region.y * zoom,
            width: region.width * zoom,
            height: region.height * zoom
          }}
        >
          {/* 分区编号 */}
          <div
            className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded font-bold"
            style={{
              fontSize: Math.max(10, 12 / zoom) + 'px'
            }}
          >
            {region.index}
          </div>
          
          {/* 分区尺寸信息 */}
          {zoom > 0.3 && (
            <div
              className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded"
              style={{
                fontSize: Math.max(8, 10 / zoom) + 'px'
              }}
            >
              {region.width}×{region.height}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}