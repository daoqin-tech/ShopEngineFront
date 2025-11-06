import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Image as ImageIcon } from 'lucide-react';

interface StaticCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (copyCount: number) => void;
  isProcessing?: boolean;
}

export function StaticCopyDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isProcessing = false
}: StaticCopyDialogProps) {
  const [copyCount, setCopyCount] = useState(1);

  const handleConfirm = () => {
    onConfirm(copyCount);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setCopyCount(1); // 重置为默认值
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            静态复制图片
          </DialogTitle>
          <DialogDescription>
            复制选中的图片记录，无需重新生成
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 选中图片数量 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">已选择图片</span>
              </div>
              <span className="text-lg font-semibold text-blue-600">{selectedCount} 张</span>
            </div>
          </div>

          {/* 复制数量选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">复制份数</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">每张图片复制</span>
                <div className="flex items-center justify-center w-12 h-8 bg-gray-900 text-white rounded text-sm font-semibold">
                  {copyCount}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={copyCount}
                onChange={(e) => setCopyCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1份</span>
                <span>20份</span>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">选中图片:</span>
                <span className="font-medium text-gray-900">{selectedCount} 张</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">每张复制:</span>
                <span className="font-medium text-gray-900">{copyCount} 份</span>
              </div>
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">将生成:</span>
                <span className="font-semibold text-blue-600">{selectedCount * copyCount} 张新图片</span>
              </div>
            </div>
          </div>

          {/* 说明 */}
          <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
            <span className="font-medium text-yellow-800">提示：</span>
            静态复制只会复制图片记录，不会重新调用AI生成，速度很快。
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || copyCount < 1}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                复制中...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                确定复制
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
