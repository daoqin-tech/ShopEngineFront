import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2, PackageOpen, Image as ImageIcon } from 'lucide-react';

type ExportStage = 'confirm' | 'processing' | 'completed';

interface UnifiedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  productCount: number;
  stage: ExportStage;
  currentProject: number;
  totalProjects: number;
  currentImage: number;
  totalImages: number;
  currentProductName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnifiedExportDialog({
  open,
  onOpenChange,
  title,
  description,
  productCount,
  stage,
  currentProject,
  totalProjects,
  currentImage,
  totalImages,
  currentProductName,
  onConfirm,
  onCancel
}: UnifiedExportDialogProps) {
  const overallProgress = totalProjects > 0
    ? Math.round(((currentProject - 1 + currentImage / totalImages) / totalProjects) * 100)
    : 0;

  const projectProgress = totalImages > 0
    ? Math.round((currentImage / totalImages) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      // 只有在确认阶段或完成阶段才允许关闭
      if (stage === 'confirm' || stage === 'completed') {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stage === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : stage === 'processing' ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            ) : (
              <PackageOpen className="w-5 h-5 text-blue-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {stage === 'confirm' && description}
            {stage === 'processing' && '正在导出，请稍候...'}
            {stage === 'completed' && '导出完成！'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 确认阶段 */}
          {stage === 'confirm' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">选中商品数量:</span>
                <span className="text-lg font-semibold text-blue-600">{productCount} 个</span>
              </div>
            </div>
          )}

          {/* 处理阶段 */}
          {stage === 'processing' && (
            <>
              {/* 当前处理的商品名称 */}
              {currentProductName && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">当前商品</div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentProductName}
                  </div>
                </div>
              )}

              {/* 总体进度 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">总体进度</span>
                  <span className="font-semibold text-blue-600">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>第 {currentProject} / {totalProjects} 个商品</span>
                </div>
              </div>

              {/* 当前商品图片进度 */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600">当前商品图片</span>
                  </div>
                  <span className="font-semibold text-gray-700">{projectProgress}%</span>
                </div>
                <Progress value={projectProgress} className="h-1.5" />
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>第 {currentImage} / {totalImages} 张</span>
                </div>
              </div>
            </>
          )}

          {/* 完成阶段 */}
          {stage === 'completed' && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">已导出商品</span>
                  <span className="text-lg font-semibold text-green-600">{totalProjects} 个</span>
                </div>
              </div>
              <div className="text-sm text-green-600 text-center font-medium">
                文件已自动下载，请查看浏览器下载目录
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {stage === 'confirm' && (
            <div className="text-sm text-gray-500">
              导出过程可能需要一些时间，请耐心等待。
            </div>
          )}
        </div>

        <DialogFooter>
          {stage === 'confirm' && (
            <>
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button onClick={onConfirm}>
                确定导出
              </Button>
            </>
          )}
          {stage === 'completed' && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              关闭
            </Button>
          )}
          {stage === 'processing' && (
            <div className="text-xs text-gray-500 text-center w-full">
              导出中，请勿关闭页面...
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
