import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PackageOpen } from 'lucide-react';

interface ExportConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  productCount: number;
  onConfirm: () => void;
}

export function ExportConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  productCount,
  onConfirm
}: ExportConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-blue-600" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div className="text-base text-gray-700">
              {description}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">选中商品数量:</span>
                <span className="text-lg font-semibold text-blue-600">{productCount} 个</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              导出过程可能需要一些时间，请耐心等待。
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            确定导出
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
