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
}


// 图片比例预设
export interface AspectRatio {
  name: string;
  label: string;
  width: number;
  height: number;
  description: string;
}

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