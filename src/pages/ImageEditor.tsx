import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, RotateCw, Crop, Palette } from 'lucide-react';

export function ImageEditor() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async (action: string) => {
    setIsProcessing(true);
    // 模拟图片处理
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`执行${action}操作`);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">图片编辑</h1>
        
        {/* 图片上传区域 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          {selectedImage ? (
            <div className="space-y-4">
              <img 
                src={selectedImage} 
                alt="上传的图片"
                className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
              />
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    重新选择图片
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">上传图片</h3>
                <p className="text-gray-500 mb-4">支持 JPG、PNG、GIF 格式</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    选择图片
                  </Button>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 编辑工具栏 */}
        {selectedImage && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={() => handleProcess('旋转')}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 h-20"
              >
                <RotateCw className="w-6 h-6" />
                <span>旋转</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleProcess('裁剪')}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 h-20"
              >
                <Crop className="w-6 h-6" />
                <span>裁剪</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleProcess('调色')}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 h-20"
              >
                <Palette className="w-6 h-6" />
                <span>调色</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => handleProcess('下载')}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 h-20"
              >
                <Download className="w-6 h-6" />
                <span>下载</span>
              </Button>
            </div>

            {/* 调整参数区域 */}
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-medium">图片调整</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">亮度</label>
                  <Input type="range" min="-100" max="100" defaultValue="0" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">对比度</label>
                  <Input type="range" min="-100" max="100" defaultValue="0" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">饱和度</label>
                  <Input type="range" min="-100" max="100" defaultValue="0" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">锐化</label>
                  <Input type="range" min="0" max="100" defaultValue="0" />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => handleProcess('应用调整')} disabled={isProcessing}>
                  {isProcessing ? '处理中...' : '应用调整'}
                </Button>
                <Button variant="outline">重置</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}