import { Clock, Sparkles } from 'lucide-react';

export function ImageEditor() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center space-y-6 max-w-md">
        {/* 图标区域 */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-12 h-12 text-blue-600" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
        </div>

        {/* 标题和描述 */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-800">商品图优化</h1>
          <h2 className="text-xl font-semibold text-gray-600">敬请期待</h2>
          <p className="text-gray-500 leading-relaxed">
            我们正在开发强大的商品图优化功能，包括智能背景替换、一键美化、尺寸调整等专业工具，让您的商品图更加出色。
          </p>
        </div>

        {/* 功能预告 */}
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <h3 className="font-medium text-gray-700 mb-3">即将推出的功能：</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              智能背景替换和抠图
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              一键商品图美化和增强
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              多平台尺寸批量适配
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              品牌水印和Logo添加
            </li>
          </ul>
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-gray-400">
          如有任何建议或需求，欢迎联系我们
        </div>
      </div>
    </div>
  );
}