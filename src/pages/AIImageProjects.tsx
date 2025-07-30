import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Image } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
  thumbnail?: string;
}

export function AIImageProjects() {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: '苹果手机产品图',
      description: '为新款iPhone制作商品主图',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-16',
      imageCount: 4,
      thumbnail: 'https://picsum.photos/200/150?random=1'
    },
    {
      id: '2', 
      name: '运动鞋广告图',
      description: '运动鞋电商推广图片制作',
      createdAt: '2024-01-14',
      updatedAt: '2024-01-15',
      imageCount: 6,
      thumbnail: 'https://picsum.photos/200/150?random=2'
    },
    {
      id: '3',
      name: '咖啡杯产品摄影',
      description: '精品咖啡杯商品图制作',
      createdAt: '2024-01-13',
      updatedAt: '2024-01-13',
      imageCount: 0
    }
  ]);

  const handleNewProject = () => {
    const newProjectId = `new-${Date.now()}`;
    navigate(`/materials/project/${newProjectId}/edit`);
  };

  const handleEditProject = (projectId: string) => {
    navigate(`/materials/project/${projectId}/edit`);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI商品制图</h1>
        <Button onClick={handleNewProject} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建商品制图
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Image className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">还没有制图项目</h2>
          <p className="text-gray-500 mb-6">点击上方按钮创建您的第一个商品制图项目</p>
          <Button onClick={handleNewProject} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建商品制图
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
              onClick={() => handleEditProject(project.id)}
            >
              {/* 缩略图区域 */}
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* 项目信息 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg truncate mb-2">
                  {project.name}
                </h3>
                
                <p className="text-gray-600 text-sm line-clamp-2">
                  {project.description}
                </p>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Image className="w-4 h-4" />
                    <span>{project.imageCount} 张图片</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{project.updatedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}