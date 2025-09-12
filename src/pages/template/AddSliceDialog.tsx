import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SliceRegion } from '@/types/template'

interface AddSliceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canvasWidth: number
  canvasHeight: number
  existingRegions: SliceRegion[]
  onAddSlice: (region: Omit<SliceRegion, 'id' | 'index'>) => void
}

export function AddSliceDialog({
  open,
  onOpenChange,
  canvasWidth,
  canvasHeight,
  existingRegions,
  onAddSlice
}: AddSliceDialogProps) {
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [width, setWidth] = useState(200)
  const [height, setHeight] = useState(200)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证输入
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      setError('请输入有效的数值')
      return
    }

    if (x + width > canvasWidth || y + height > canvasHeight) {
      setError('分区不能超出画布边界')
      return
    }

    // 检查是否与现有分区重叠
    const hasOverlap = existingRegions.some(region => {
      return !(
        x >= region.x + region.width ||
        x + width <= region.x ||
        y >= region.y + region.height ||
        y + height <= region.y
      )
    })

    if (hasOverlap) {
      setError('分区不能与现有分区重叠')
      return
    }

    onAddSlice({ x, y, width, height })
    onOpenChange(false)
    
    // 重置表单
    resetForm()
  }

  const resetForm = () => {
    setX(0)
    setY(0)
    setWidth(200)
    setHeight(200)
    setError('')
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加分区</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="x">X坐标</Label>
              <Input
                id="x"
                type="number"
                min="0"
                max={canvasWidth - 1}
                value={x}
                onChange={(e) => {
                  setX(Math.max(0, parseInt(e.target.value) || 0))
                  setError('') // 清除错误提示
                }}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="y">Y坐标</Label>
              <Input
                id="y"
                type="number"
                min="0"
                max={canvasHeight - 1}
                value={y}
                onChange={(e) => {
                  setY(Math.max(0, parseInt(e.target.value) || 0))
                  setError('') // 清除错误提示
                }}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">宽度</Label>
              <Input
                id="width"
                type="number"
                min="1"
                max={canvasWidth}
                value={width}
                onChange={(e) => {
                  setWidth(Math.max(1, parseInt(e.target.value) || 1))
                  setError('') // 清除错误提示
                }}
                placeholder="200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">高度</Label>
              <Input
                id="height"
                type="number"
                min="1"
                max={canvasHeight}
                value={height}
                onChange={(e) => {
                  setHeight(Math.max(1, parseInt(e.target.value) || 1))
                  setError('') // 清除错误提示
                }}
                placeholder="200"
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            <div className="font-medium mb-1">画布信息：</div>
            <div>尺寸: {canvasWidth} × {canvasHeight}</div>
            <div>现有分区: {existingRegions.length} 个</div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button type="submit">
              添加分区
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}