export interface Prompt {
  id: string;
  text: string;
  selected: boolean;
  imageUrl?: string; // 可选，因为可能还没生成图片
  imageGenerated: boolean; // 标记是否已生成图片
  createdAt: string;
  conversationId: string; // 来源对话轮次ID
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  promptIds?: string[]; // 引用提示词ID数组，而不是存储副本
}

export interface Conversation {
  id: string;
  timestamp: string;
  messages: ConversationMessage[];
}

export interface AIImageSession {
  id: string;
  projectId: string; // 关联的项目ID
  prompts: Map<string, Prompt>; // 使用Map存储，key为promptId
  conversation: Conversation; // 当前对话
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

export interface PromptGenerationStepProps {
  session: AIImageSession;
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
}


export interface ImageGenerationStepProps {
  session: AIImageSession;
  isGeneratingImages: boolean;
  onGenerateImages: () => void;
}