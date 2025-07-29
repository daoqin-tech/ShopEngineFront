import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

interface Prompt {
  id: string;
  text: string;
  selected: boolean;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  productInput: string;
  prompts: Prompt[];
  generatedImages: GeneratedImage[];
  chatMessages: {user: string, assistant: string}[];
}

export function ProjectEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project>({
    id: projectId || '',
    name: '',
    description: '',
    productInput: '',
    prompts: [],
    generatedImages: [],
    chatMessages: []
  });
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (projectId && !projectId.startsWith('new-')) {
      // 加载现有项目数据
      loadProject(projectId);
    } else {
      // 新项目，设置默认值
      setProject(prev => ({
        ...prev,
        name: '新建AI制图项目',
        description: '请输入项目描述'
      }));
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    // 模拟加载项目数据
    const mockProject: Project = {
      id,
      name: '苹果手机产品图',
      description: '为新款iPhone制作商品主图',
      productInput: '苹果手机',
      prompts: [
        { id: '1', text: '高质量苹果手机产品摄影，白色背景，专业灯光', selected: true },
        { id: '2', text: '苹果手机商业摄影，简约风格，柔和阴影', selected: false }
      ],
      generatedImages: [
        {
          id: '1',
          prompt: '高质量苹果手机产品摄影，白色背景，专业灯光',
          imageUrl: 'https://picsum.photos/400/400?random=1'
        }
      ],
      chatMessages: []
    };
    setProject(mockProject);
  };

  const generatePrompts = async () => {
    if (!project.productInput.trim()) return;
    
    setIsGeneratingPrompts(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟返回的提示词
      const mockPrompts = [
        { id: '1', text: `高质量${project.productInput}产品摄影，白色背景，专业灯光`, selected: false },
        { id: '2', text: `${project.productInput}商业摄影，简约风格，柔和阴影`, selected: false },
        { id: '3', text: `${project.productInput}电商主图，清晰细节，中性色调`, selected: false },
        { id: '4', text: `${project.productInput}产品展示，现代简约，高端质感`, selected: false },
      ];
      
      setProject(prev => ({ ...prev, prompts: mockPrompts }));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('生成提示词失败:', error);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const togglePromptSelection = (id: string) => {
    setProject(prev => ({
      ...prev,
      prompts: prev.prompts.map(prompt => 
        prompt.id === id 
          ? { ...prompt, selected: !prompt.selected }
          : prompt
      )
    }));
    setHasUnsavedChanges(true);
  };

  const generateImages = async () => {
    const selectedPrompts = project.prompts.filter(p => p.selected);
    if (selectedPrompts.length === 0) return;
    
    setIsGeneratingImages(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟生成的图片
      const mockImages = selectedPrompts.map(prompt => ({
        id: Math.random().toString(36).substr(2, 9),
        prompt: prompt.text,
        imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`
      }));
      
      setProject(prev => ({ ...prev, generatedImages: mockImages }));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!currentChatInput.trim()) return;
    
    const userMessage = currentChatInput;
    setCurrentChatInput('');
    
    // 模拟对话回复
    setTimeout(() => {
      setProject(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, {
          user: userMessage,
          assistant: '我理解您的需求，让我为您优化提示词...'
        }]
      }));
      setHasUnsavedChanges(true);
    }, 500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 模拟保存项目
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      console.log('项目已保存:', project);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('您有未保存的更改，确定要离开吗？')) {
        navigate('/materials/product-images');
      }
    } else {
      navigate('/materials/product-images');
    }
  };

  const updateProjectField = (field: keyof Project, value: any) => {
    setProject(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* 项目头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <Input
              value={project.name}
              onChange={(e) => updateProjectField('name', e.target.value)}
              className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
              placeholder="项目名称"
            />
            <Input
              value={project.description}
              onChange={(e) => updateProjectField('description', e.target.value)}
              className="text-gray-600 border-none p-0 h-auto bg-transparent mt-1"
              placeholder="项目描述"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? '保存中...' : '保存项目'}
        </Button>
      </div>
        
      <div>
        
        {/* 商品输入区域 */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">
              请输入您想要生成的商品：
            </label>
            <div className="flex gap-2">
              <Input
                value={project.productInput}
                onChange={(e) => updateProjectField('productInput', e.target.value)}
                placeholder="例如：苹果手机、运动鞋、咖啡杯..."
                className="flex-1"
              />
              <Button 
                onClick={generatePrompts}
                disabled={isGeneratingPrompts || !project.productInput.trim()}
              >
                {isGeneratingPrompts ? '生成中...' : '生成提示词'}
              </Button>
            </div>
          </div>
        </div>

        {/* 多轮对话区域 */}
        {project.chatMessages.length > 0 && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">对话记录</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {project.chatMessages.map((msg, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-sm p-2 bg-blue-50 rounded">
                    <strong>用户：</strong>{msg.user}
                  </div>
                  <div className="text-sm p-2 bg-gray-50 rounded">
                    <strong>助手：</strong>{msg.assistant}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={currentChatInput}
                onChange={(e) => setCurrentChatInput(e.target.value)}
                placeholder="继续对话优化提示词..."
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              />
              <Button onClick={handleChatSubmit}>发送</Button>
            </div>
          </div>
        )}

        {/* 提示词选择区域 */}
        {project.prompts.length > 0 && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">生成的提示词（请选择需要的提示词）：</h3>
            <div className="space-y-2">
              {project.prompts.map(prompt => (
                <div key={prompt.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={prompt.selected}
                    onChange={() => togglePromptSelection(prompt.id)}
                    className="rounded"
                  />
                  <span className={`flex-1 p-2 rounded border cursor-pointer ${
                    prompt.selected ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
                  }`} onClick={() => togglePromptSelection(prompt.id)}>
                    {prompt.text}
                  </span>
                </div>
              ))}
            </div>
            <Button 
              onClick={generateImages}
              disabled={isGeneratingImages || !project.prompts.some(p => p.selected)}
              className="w-full"
            >
              {isGeneratingImages ? '生成中...' : '生成图片'}
            </Button>
          </div>
        )}

        {/* 生成的图片展示区域 */}
        {project.generatedImages.length > 0 && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">生成的图片：</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.generatedImages.map(image => (
                <div key={image.id} className="space-y-2">
                  <img 
                    src={image.imageUrl} 
                    alt="生成的商品图"
                    className="w-full h-48 object-cover rounded border"
                  />
                  <p className="text-sm text-gray-600">{image.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}