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
            className="absolute bg-red-500 text-white px-3 py-1.5 rounded font-bold"
            style={{
              top: 0,
              left: 0,
              fontSize: 20 / zoom + 'px',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left'
            }}
          >
            {region.index}
          </div>

          {/* 分区尺寸信息 */}
          {zoom > 0.3 && (
            <div
              className="absolute bg-black/70 text-white px-1 py-0.5 rounded"
              style={{
                bottom: 0,
                right: 0,
                fontSize: 10 / zoom + 'px',
                transform: `scale(${zoom})`,
                transformOrigin: 'bottom right'
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