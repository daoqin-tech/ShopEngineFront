export enum PromptSource {
  CONVERSATION = 'conversation', // 来自对话生成
  SYSTEM = 'system', // 系统预设
  IMPORTED = 'imported', // 用户导入
  TEMPLATE = 'template' // 模板库
}

export interface Prompt {
  id: string;
  text: string;
  source: PromptSource; // 提示词来源
  createdAt: string;
  selected: boolean; // UI状态：是否被选中
}

export interface GeneratedImage {
  id: string;
  promptId: string; // 关联的提示词ID
  imageUrl: string;
  createdAt: string;
  status: 'generating' | 'completed' | 'failed'; // 生成状态
  metadata?: {
    width?: number;
    height?: number;
    model?: string; // AI模型名称
    seed?: number; // 随机种子
  };
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
  isGeneratingPrompts: boolean;
  currentChatInput: string;
  setCurrentChatInput: (value: string) => void;
  selectedPromptsForOptimization: string[];
  setSelectedPromptsForOptimization: (value: string[]) => void;
  onTogglePromptSelection: (id: string) => void;
  onTogglePromptForOptimization: (id: string) => void;
  onUpdatePromptText: (id: string, newText: string) => void;
  onChatSubmit: () => void;
  onNextStep: () => void;
  canGoToNextStep: boolean;
  getImagesForPrompt: (promptId: string) => GeneratedImage[];
}


export interface ImageGenerationStepProps {
  session: AIImageSession;
  isGeneratingImages: boolean;
  onGenerateImages: () => void;
}