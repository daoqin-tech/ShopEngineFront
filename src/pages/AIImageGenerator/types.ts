export enum PromptSource {
  CONVERSATION = 'conversation', // 来自对话生成
  SYSTEM = 'system', // 系统预设
  IMPORTED = 'imported', // 用户导入
  TEMPLATE = 'template' // 模板库
}

export enum PromptStatus {
  PENDING = 'pending', // 刚创建，未提交
  QUEUED = 'queued', // 已提交到队列，排队等待
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 生成成功
  FAILED = 'failed' // 生成失败
}

export interface Prompt {
  id: string;
  text: string;
  source: PromptSource; // 提示词来源
  createdAt: string;
  status: PromptStatus; // 生成状态
}

// 参考图片(用于以图生图)
export interface ReferenceImage {
  id: string;
  imageUrl: string; // 图片URL
  createdAt: string;
  status: PromptStatus; // 生成状态,与Prompt保持一致
}

export interface GeneratedImage {
  id: string;
  taskId: string | null; // 任务ID（用于轮询状态），上传的图片可能为null
  promptId: string; // 关联的提示词ID
  promptText: string; // 提示词文本
  imageUrl: string;
  createdAt: string;
  status: PromptStatus; // 生成状态，与PromptStatus一致
  width: number; // 图片宽度
  height: number; // 图片高度
  errorMessage?: string; // 错误信息（当状态为failed时）
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  prompts?: Prompt[]; // 关联的提示词对象数组
  isThinking?: boolean; // 标记AI正在思考状态
}

// ProcessChatResponse - processAIResponse接口的响应类型
export interface ProcessChatResponse {
  taskId: string;
  status: string;
  message: string;
}

// AIProcessStatusResponse - 查询AI处理状态和结果的响应类型
export interface AIProcessStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Message; // MessageResponse类型，即Message
  error?: string;
}

export interface AIImageSession {
  id: string;
  projectId: string; // 关联的项目ID
  messages: Message[]; // 消息数组
}

export enum Step {
  PROMPT_GENERATION = 1,
  IMAGE_GENERATION = 2
}

export interface StepIndicatorProps {
  currentStep: Step;
  onStepClick: (step: Step) => void;
  canClickStep2: boolean;
}

export interface ExtendedAIImageSession extends AIImageSession {
  prompts: Map<string, Prompt>;
  images: Map<string, GeneratedImage>;
  referenceImages?: Map<string, ReferenceImage>; // 参考图片集合(可选)
}

export interface PromptGenerationStepProps {
  session: ExtendedAIImageSession;
  selectedPromptIds: Set<string>; // UI状态：选中的提示词ID
  isGeneratingPrompts: boolean;
  currentChatInput: string;
  setCurrentChatInput: (value: string) => void;
  selectedPromptsForOptimization: string[];
  setSelectedPromptsForOptimization: (value: string[]) => void;
  onTogglePromptSelection: (id: string) => void;
  onTogglePromptForOptimization: (id: string) => void;
  onChatSubmit: () => void;
}


// 图片比例预设
export interface AspectRatio {
  name: string;
  label: string;
  width: number;
  height: number;
  description: string;
}

// 预设的图片比例和尺寸 (根据新模型推荐尺寸)
export const ASPECT_RATIOS: AspectRatio[] = [
  { name: 'square', label: '1:1', width: 1024, height: 1024, description: '手账纸' },
  { name: 'wrapping_paper', label: '1:1', width: 1024, height: 1024, description: '包装纸' },
  // { name: 'paper_bag', label: '66:35', width: 1312, height: 704, description: '手提纸袋' },
  { name: 'template_region', label: '99:70', width: 1408, height: 992, description: '竖版日历内页' },
  { name: 'calendar_cover', label: '99:140', width: 1024, height: 1440, description: '竖版日历封面' },
  { name: 'horizontal_calendar_inner', label: '1000:1544', width: 928, height: 1440, description: '横版日历内页' },
  { name: 'horizontal_calendar_cover', label: '2000:1544', width: 1440, height: 1120, description: '横版日历封面' }
];

// 图片生成参数（UI层面）
export interface ImageGenerationParams {
  width: number;
  height: number;
  aspectRatio: string;
  model?: string;
  count?: number; // 每张参考图生成多少张图片（1-15），用于以图生图
}

// 图片生成API请求参数(根据提示词生成)
export interface ImageGenerationRequest {
  projectId: string;
  promptIds: string[];
  width: number;
  height: number;
  model?: string;
}

// 以图生图API请求参数
export interface ImageFromImagesRequest {
  projectId: string;
  imageUrls: string[];
  prompt?: string;
  width: number;
  height: number;
  count: number;
}

// 图片生成API响应
export interface GenerateImageBatchResponse {
  taskIDs: string[];
  totalTasks: number;
}

// 批量状态查询响应
export interface BatchStatusResponse {
  project_id: string;
  results: PromptGenerationResult[];
}

// 提示词生成结果
export interface PromptGenerationResult {
  prompt_id: string;
  status: string;
  task_id?: string;
  expected_image_count?: number; // 期望生成的图片数量（用于组图）
  images?: GeneratedImageInfo[];
  error?: string;
}

// 生成的图片信息
export interface GeneratedImageInfo {
  id: string;
  url: string;
  width: number;
  height: number;
  file_size: number;
}

// 单个提示词生成状态 (保留旧的接口以兼容现有代码)
export interface PromptGenerationStatus {
  promptId: string;
  status: PromptStatus;
  progress?: number; // 0-100
  imageUrl?: string;
  error?: string;
  completedAt?: string;
}

export interface ImageGenerationStepProps {
  session: ExtendedAIImageSession;
  selectedPromptIds: Set<string>; // UI状态：选中的提示词ID
  selectedReferenceImageIds?: Set<string>; // UI状态：选中的参考图片ID
  onGenerateImages: (params: ImageGenerationParams) => void;
  onGenerateFromImages?: (params: ImageGenerationParams) => void; // 以图生图回调
  onTogglePromptSelection?: (id: string) => void; // 切换提示词选择
  onToggleReferenceImageSelection?: (id: string) => void; // 切换参考图片选择
  refreshTrigger?: number; // 触发历史数据重新加载
  projectName?: string; // 项目名称，用于导出文件命名
  isGeneratingImages?: boolean; // 是否正在生成图片
  onStartPolling?: (promptIds: string[]) => void; // 开始轮询回调
}