import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AspectRatio, ASPECT_RATIOS, ImageGenerationParams } from './types';

// 这些验证函数暂时保留供将来自定义尺寸功能使用
// const validateDimension = (value: number): number => {
//   const clamped = Math.max(256, Math.min(1440, value));
//   return Math.round(clamped / 32) * 32;
// };

// const validateDimensions = (width: number, height: number): { width: number; height: number } => {
//   let validWidth = validateDimension(width);
//   let validHeight = validateDimension(height);
//   return { width: validWidth, height: validHeight };
// };

// const checkDimensionsValid = (width: number, height: number): { valid: boolean; reason?: string } => {
//   if (width < 256 || width > 1440) {
//     return { valid: false, reason: '宽度必须在256-1440范围内' };
//   }
//   if (height < 256 || height > 1440) {
//     return { valid: false, reason: '高度必须在256-1440范围内' };
//   }
//   if (width % 32 !== 0 || height % 32 !== 0) {
//     return { valid: false, reason: '尺寸必须是32的倍数' };
//   }
//   return { valid: true };
// };

interface GenerationParamsPanelProps {
  selectedPromptsCount: number;
  isGeneratingImages?: boolean;
  onGenerateImages: (params: ImageGenerationParams) => void;
  isImageToImageMode?: boolean; // 是否为以图生图模式
  hasPrompts?: boolean; // 是否有可用的提示词
  hasReferenceImages?: boolean; // 是否有可用的参考图
}

// 可用的模型选项
const MODEL_OPTIONS = [
  { value: 'flux-dev', label: 'Flux Dev', description: '提示词生图' },
  // { value: 'flux-pro-1.1', label: 'Flux Pro 1.1', description: '专业版 1.1' },
  { value: 'doubao-seedream-4-0-250828', label: 'Doubao Seedream 4.0', description: '以图生图' }
];

export function GenerationParamsPanel({
  selectedPromptsCount,
  isGeneratingImages,
  onGenerateImages,
  isImageToImageMode,
  hasPrompts = false,
  hasReferenceImages = false
}: GenerationParamsPanelProps) {
  // 生成参数状态
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]); // 默认选择1:1
  // const [customWidth, setCustomWidth] = useState<number>(1024);
  // const [customHeight, setCustomHeight] = useState<number>(1024);
  // const [useCustomSize, setUseCustomSize] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('flux-dev'); // 默认模型
  const [imageCount, setImageCount] = useState<number>(1); // 每张参考图生成的图片数量（1-15）

  // 输入验证反馈状态
  // const [widthAdjusted, setWidthAdjusted] = useState(false);
  // const [heightAdjusted, setHeightAdjusted] = useState(false);

  // 处理比例选择变化
  const handleAspectRatioChange = (aspectRatio: AspectRatio) => {
    setSelectedAspectRatio(aspectRatio);
    // if (!useCustomSize) {
    //   setCustomWidth(aspectRatio.width);
    //   setCustomHeight(aspectRatio.height);
    // }
  };

  // // 处理自定义尺寸变化 - 允许用户输入，不立即验证
  // const handleCustomWidthChange = (value: string) => {
  //   const numValue = parseInt(value) || 0;
  //   setCustomWidth(numValue);
  // };

  // const handleCustomHeightChange = (value: string) => {
  //   const numValue = parseInt(value) || 0;
  //   setCustomHeight(numValue);
  // };

  // // 输入框失焦时验证
  // const handleWidthBlur = () => {
  //   const result = validateDimensions(customWidth, customHeight);
  //   if (result.width !== customWidth) {
  //     setCustomWidth(result.width);
  //     setWidthAdjusted(true);
  //     // 3秒后清除提示
  //     setTimeout(() => setWidthAdjusted(false), 3000);
  //   }
  //   if (result.height !== customHeight) {
  //     setCustomHeight(result.height);
  //     setHeightAdjusted(true);
  //     // 3秒后清除提示
  //     setTimeout(() => setHeightAdjusted(false), 3000);
  //   }
  // };

  // const handleHeightBlur = () => {
  //   const result = validateDimensions(customWidth, customHeight);
  //   if (result.width !== customWidth) {
  //     setCustomWidth(result.width);
  //     setWidthAdjusted(true);
  //     // 3秒后清除提示
  //     setTimeout(() => setWidthAdjusted(false), 3000);
  //   }
  //   if (result.height !== customHeight) {
  //     setCustomHeight(result.height);
  //     setHeightAdjusted(true);
  //     // 3秒后清除提示
  //     setTimeout(() => setHeightAdjusted(false), 3000);
  //   }
  // };

  return (
    <div className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-6">生成参数</h3>

        {/* 模型选择 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">选择模型</label>
          <div className="grid grid-cols-2 gap-2">
            {MODEL_OPTIONS.map((model) => (
              <button
                key={model.value}
                onClick={() => setSelectedModel(model.value)}
                className={`p-3 text-left border rounded-lg transition-all duration-200 ${
                  selectedModel === model.value
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col">
                  <div className="text-sm font-medium mb-1">{model.label}</div>
                  <div className="text-xs opacity-75">{model.description}</div>
                  {selectedModel === model.value && (
                    <div className="mt-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 业务场景说明 */}
          {selectedModel === 'flux-dev' && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600">
                💡 适合包装纸、日历业务
              </p>
            </div>
          )}

          {selectedModel === 'doubao-seedream-4-0-250828' && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600">
                💡 适合手账纸业务
              </p>
            </div>
          )}

          {/* 生成数量选择 - 仅在选择豆包模型且为以图生图模式时显示 */}
          {selectedModel === 'doubao-seedream-4-0-250828' && isImageToImageMode && (
            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">
                  生成数量
                </label>
                <div className="flex items-center justify-center w-8 h-6 bg-gray-900 text-white rounded text-xs font-semibold">
                  {imageCount}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={imageCount}
                onChange={(e) => setImageCount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
              />
              <div className="mt-1.5 text-xs text-gray-500">
                共 {selectedPromptsCount * imageCount} 张
              </div>
            </div>
          )}
        </div>


        {/* 比例选择 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">选择比例</label>
          <div className="grid grid-cols-2 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.name}
                onClick={() => handleAspectRatioChange(ratio)}
                className={`p-3 text-left border rounded-lg transition-all duration-200 ${
                  selectedAspectRatio.name === ratio.name
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col">
                  <div className="text-sm font-medium mb-1">{ratio.description}</div>
                  <div className="text-xs opacity-75">{ratio.label}</div>
                  <div className="text-xs opacity-75">({ratio.width}×{ratio.height})</div>
                  {selectedAspectRatio.name === ratio.name && (
                    <div className="mt-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义尺寸选项 */}
        {/* <div>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={useCustomSize}
              onChange={(e) => setUseCustomSize(e.target.checked)}
              className="w-4 h-4 text-gray-900 focus:ring-2 focus:ring-gray-900"
            />
            <span className="text-sm font-medium text-gray-700">自定义尺寸</span>
          </label>

          {useCustomSize && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">宽度</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={customWidth || ''}
                      onChange={(e) => handleCustomWidthChange(e.target.value)}
                      onBlur={handleWidthBlur}
                      min="256"
                      max="1440"
                      step="32"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                        widthAdjusted
                          ? 'border-amber-400 bg-amber-50 focus:ring-amber-400'
                          : 'border-gray-200 focus:ring-gray-900'
                      }`}
                      placeholder="256-1440"
                    />
                    {widthAdjusted && (
                      <div className="absolute -bottom-6 left-0 text-xs text-amber-600">
                        已自动调整为 {customWidth}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">高度</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={customHeight || ''}
                      onChange={(e) => handleCustomHeightChange(e.target.value)}
                      onBlur={handleHeightBlur}
                      min="256"
                      max="1440"
                      step="32"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                        heightAdjusted
                          ? 'border-amber-400 bg-amber-50 focus:ring-amber-400'
                          : 'border-gray-200 focus:ring-gray-900'
                      }`}
                      placeholder="256-1440"
                    />
                    {heightAdjusted && (
                      <div className="absolute -bottom-6 left-0 text-xs text-amber-600">
                        已自动调整为 {customHeight}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 text-xs text-gray-500 space-y-1">
                <div>• 尺寸范围：256-1440像素</div>
                <div>• 必须是32的倍数</div>
              </div>
            </>
          )}

          <div className="mt-4 text-sm text-gray-700 bg-white p-3 rounded-lg border">
            最终尺寸: <span className="font-mono font-semibold">
              {useCustomSize ? customWidth : selectedAspectRatio.width} × {useCustomSize ? customHeight : selectedAspectRatio.height}
            </span>

            {useCustomSize && (() => {
              const validation = checkDimensionsValid(customWidth, customHeight);

              return (
                <div className="mt-2 space-y-1 text-xs">
                  <div className={validation.valid ? "text-green-600" : "text-red-600"}>
                    {validation.valid ? "✓ 参数验证通过" : `✗ ${validation.reason}`}
                  </div>
                </div>
              );
            })()}
          </div>
        </div> */}

        {/* 生成图片按钮 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {/* 根据选择的模型判断是否可以生成 */}
          {(() => {
            const isFluxDev = selectedModel === 'flux-dev';
            const isDoubao = selectedModel === 'doubao-seedream-4-0-250828';

            // Flux Dev 只支持提示词生图
            const fluxDevDisabled = isFluxDev && !hasPrompts;
            // Doubao 只支持以图生图
            const doubaoDisabled = isDoubao && !hasReferenceImages;

            const isDisabled = selectedPromptsCount === 0 || isGeneratingImages || fluxDevDisabled || doubaoDisabled;

            return (
              <>
                <Button
                  onClick={() => onGenerateImages({
                    width: selectedAspectRatio.width,
                    height: selectedAspectRatio.height,
                    aspectRatio: selectedAspectRatio.name,
                    model: selectedModel,
                    count: (isImageToImageMode && selectedModel === 'doubao-seedream-4-0-250828') ? imageCount : undefined
                  })}
                  disabled={isDisabled}
                  className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingImages ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      生成中...
                    </>
                  ) : (
                    <>
                      生成图片
                      {selectedPromptsCount > 0 && (
                        <span className="ml-2 text-sm opacity-75">
                          ({selectedPromptsCount}个)
                        </span>
                      )}
                    </>
                  )}
                </Button>

                {/* 提示信息 */}
                {selectedPromptsCount === 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {isFluxDev ? '请先选择提示词' : '请先选择参考图'}
                  </p>
                )}

                {/* Flux Dev 模型提示 */}
                {isFluxDev && !hasPrompts && selectedPromptsCount === 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <span className="font-semibold">Flux Dev 模型</span>仅支持提示词生图。
                      请前往"提示词生成"步骤生成提示词。
                    </p>
                  </div>
                )}

                {/* Doubao 模型提示 */}
                {isDoubao && !hasReferenceImages && selectedPromptsCount === 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <span className="font-semibold">Doubao 模型</span>仅支持以图生图。
                      请上传参考图或从"热销品文案"导入图片。
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
