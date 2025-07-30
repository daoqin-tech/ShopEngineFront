import { Button } from '@/components/ui/button';
import { MessageSquare, Download, RefreshCw } from 'lucide-react';
import { ImageGenerationStepProps } from './types';

export function ImageGenerationStep({ 
  session,
  isGeneratingImages,
  onGenerateImages
}: ImageGenerationStepProps) {
  const selectedPrompts = session.prompts?.filter(p => p.selected) || [];
  const generatedImages = session.prompts?.filter(p => p.imageGenerated && p.imageUrl) || [];

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-gray-700">
              {generatedImages.length > 0 ? `已生成 ${generatedImages.length} 张图片` : `准备生成 ${selectedPrompts.length} 张图片`}
            </span>
          </div>
          <div className="flex gap-2">
            {generatedImages.length === 0 && (
              <Button 
                onClick={onGenerateImages}
                disabled={isGeneratingImages || selectedPrompts.length === 0}
              >
                {isGeneratingImages ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  `生成 ${selectedPrompts.length} 张图片`
                )}
              </Button>
            )}
            {generatedImages.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={onGenerateImages} disabled={isGeneratingImages}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  批量导出
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="bg-white rounded-lg shadow-sm p-6 min-h-[calc(100vh-350px)]">
        {generatedImages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-lg text-gray-500 mb-2">准备生成 {selectedPrompts.length} 张图片</p>
            <p className="text-sm text-gray-400">点击"生成图片"按钮开始创建</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((promptWithImage, index) => (
                <div key={promptWithImage.id} className="group relative space-y-3 p-4 border rounded-lg bg-gray-50 hover:shadow-lg transition-all duration-200">
                  <div className="relative">
                    <img 
                      src={promptWithImage.imageUrl!} 
                      alt={`AI生成的图片 ${index + 1}`}
                      className="w-full h-48 object-cover rounded border"
                    />
                    {/* 悬停时显示操作按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary">
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">图片 {index + 1}</span>
                      <span className="text-xs text-gray-400">1024×1024</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed bg-white p-3 rounded border line-clamp-3">
                      {promptWithImage.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}