import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ExportProgressDialogProps {
  open: boolean;
  title: string;
  current: number;
  total: number;
  onClose?: () => void;
}

export function ExportProgressDialog({
  open,
  title,
  current,
  total,
  onClose
}: ExportProgressDialogProps) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current === total && total > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {isComplete ? '导出完成！' : '正在导出，请稍候...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 进度条 */}
          <Progress value={progress} className="h-2" />

          {/* 进度文本 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              已处理 {current} / {total} 个商品
            </span>
            <span className="font-semibold text-blue-600">
              {progress}%
            </span>
          </div>

          {/* 完成提示 */}
          {isComplete && (
            <div className="text-sm text-green-600 text-center font-medium">
              文件已自动下载，请查看浏览器下载目录
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
