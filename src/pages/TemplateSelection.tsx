import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Filter, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Template, LayerType } from '@/types/template'

interface TemplateSelectionProps {
  projectId: string
}

export function TemplateSelection({ projectId }: TemplateSelectionProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 模拟模板数据
  const mockTemplates: Template[] = [
    {
      id: '1',
      name: '电商产品海报模板',
      thumbnailUrl: '/api/placeholder/300/200',
      data: {
        width: 1920,
        height: 1080,
        layers: [
          { id: 'bg', name: '背景', type: LayerType.ARTBOARD, x: 0, y: 0, width: 1920, height: 1080, zIndex: 0, visible: true, locked: false, replaceable: false },
          { id: 'product', name: '产品图', type: LayerType.IMAGE, x: 100, y: 100, width: 600, height: 600, zIndex: 1, visible: true, locked: false, replaceable: true },
          { id: 'title', name: '标题', type: LayerType.TEXT, x: 800, y: 200, width: 900, height: 100, zIndex: 2, visible: true, locked: false, replaceable: true, content: '产品标题' }
        ]
      },
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Banner广告模板',
      thumbnailUrl: '/api/placeholder/300/150',
      data: {
        width: 1200,
        height: 600,
        layers: [
          { id: 'bg', name: '背景', type: LayerType.ARTBOARD, x: 0, y: 0, width: 1200, height: 600, zIndex: 0, visible: true, locked: false, replaceable: false },
          { id: 'product', name: '产品图', type: LayerType.IMAGE, x: 50, y: 50, width: 500, height: 500, zIndex: 1, visible: true, locked: false, replaceable: true },
          { id: 'title', name: '主标题', type: LayerType.TEXT, x: 600, y: 150, width: 550, height: 80, zIndex: 2, visible: true, locked: false, replaceable: true, content: '广告标题' }
        ]
      },
      createdAt: '2024-01-14',
      updatedAt: '2024-01-14'
    },
    {
      id: '3',
      name: '社交媒体海报模板',
      thumbnailUrl: '/api/placeholder/300/300',
      data: {
        width: 1080,
        height: 1080,
        layers: [
          { id: 'bg', name: '背景', type: LayerType.ARTBOARD, x: 0, y: 0, width: 1080, height: 1080, zIndex: 0, visible: true, locked: false, replaceable: false },
          { id: 'product', name: '产品图', type: LayerType.IMAGE, x: 100, y: 100, width: 880, height: 500, zIndex: 1, visible: true, locked: false, replaceable: true },
          { id: 'title', name: '标题', type: LayerType.TEXT, x: 100, y: 700, width: 880, height: 100, zIndex: 2, visible: true, locked: false, replaceable: true, content: '社媒标题' }
        ]
      },
      createdAt: '2024-01-16',
      updatedAt: '2024-01-16'
    }
  ]

  const categories = ['全部', '电商', 'Banner', '社交媒体', '海报', '宣传单']
  
  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || selectedCategory === '全部'
    
    return matchesSearch && matchesCategory
  })

  const handleTemplateSelect = (template: Template) => {
    // 导航到套图制作页面
    navigate(`/workspace/cover-project/${projectId}/edit?templateId=${template.id}`)
  }

  const getReplaceLayers = (template: Template) => {
    return template.data?.layers?.filter(layer => layer.replaceable) || []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/cover-projects')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回项目列表
            </Button>
            <div>
              <h1 className="text-xl font-semibold">选择模板</h1>
              <p className="text-sm text-gray-600">为您的套图项目选择合适的模板</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 搜索和筛选 */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索模板名称、描述或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category || (selectedCategory === 'all' && category === '全部') ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category === '全部' ? 'all' : category)}
                className="h-8"
              >
                <Tag className="w-3 h-3 mr-1" />
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* 模板网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => {
            const replaceableLayers = getReplaceLayers(template)
            
            return (
              <Card key={template.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="p-0">
                  <div className="relative aspect-[4/3] bg-gray-100 rounded-t-lg overflow-hidden">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {replaceableLayers.length} 可替换
                      </Badge>
                    </div>
                    
                    {/* 悬停显示详情 */}
                    <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between text-white text-sm">
                      <div>
                        <h4 className="font-medium mb-2">可替换元素:</h4>
                        <ul className="space-y-1">
                          {replaceableLayers.map((layer) => (
                            <li key={layer.id} className="flex items-center">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                              {layer.name} ({layer.type === LayerType.IMAGE ? '图片' : '文本'})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        className="w-full mt-4"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        选择此模板
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4" onClick={() => handleTemplateSelect(template)}>
                  <CardTitle className="text-lg mb-2 line-clamp-1">{template.name}</CardTitle>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>尺寸: {template.data?.width} × {template.data?.height}</span>
                    <span>{template.data?.layers?.length || 0} 图层</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 空状态 */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Filter className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的模板</h3>
            <p className="text-gray-500">请尝试调整搜索关键词或筛选条件</p>
          </div>
        )}
      </div>
    </div>
  )
}