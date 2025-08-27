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

export interface GeneratedImage {
  id: string;
  promptId: string; // 关联的提示词ID
  promptText: string; // 提示词文本
  imageUrl: string;
  createdAt: string;
  status: PromptStatus; // 生成状态，与PromptStatus一致
  width: number; // 图片宽度
  height: number; // 图片高度
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
  onCopyPrompt?: (promptId: string, count: number, messageId: string) => Promise<void>; // 复制提示词回调
}


// 图片比例预设
export interface AspectRatio {
  name: string;
  label: string;
  width: number;
  height: number;
  description: string;
}

// 预设的图片比例和尺寸 (符合FLUX API要求: 256-1440px, 32的倍数)
export const ASPECT_RATIOS: AspectRatio[] = [
  { name: 'square', label: '1:1', width: 1024, height: 1024, description: '正方形 - 适合头像、LOGO' },
  { name: 'landscape', label: '16:9', width: 1440, height: 832, description: '横向 - 适合横幅、背景' },
  { name: 'portrait', label: '9:16', width: 832, height: 1440, description: '竖向 - 适合海报、封面' },
  { name: 'widescreen', label: '21:9', width: 1344, height: 576, description: '超宽屏 - 适合全景图' },
  { name: 'standard', label: '4:3', width: 1152, height: 864, description: '标准 - 适合产品图' },
  { name: 'cinema', label: '3:2', width: 1152, height: 768, description: '电影比例 - 适合风景图' },
  { name: 'tall', label: '7:10', width: 896, height: 1280, description: '高比例 - 适合竖版海报' },
  { name: 'classic', label: '3:4', width: 960, height: 1280, description: '经典比例 - 适合传统照片' },
  { name: 'wide', label: '2:1', width: 1280, height: 640, description: '宽屏 - 适合横版插图' }
];

// 图片生成参数（UI层面）
export interface ImageGenerationParams {
  width: number;
  height: number;
  aspectRatio: string;
}

// 图片生成API请求参数
export interface ImageGenerationRequest {
  projectId: string;
  promptIds: string[];
  width: number;
  height: number;
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
  onGenerateImages: (params: ImageGenerationParams) => void;
  refreshTrigger?: number; // 触发历史数据重新加载
  projectName?: string; // 项目名称，用于导出文件命名
  isGeneratingImages?: boolean; // 是否正在生成图片
}