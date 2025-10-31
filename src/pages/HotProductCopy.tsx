import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw, Scissors } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { capturedImageService } from '@/services/capturedImageService';
import type { CapturedImage, Platform } from '@/types/capturedImage';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { toast } from 'sonner';

// 按日期分组的图片数据
interface ImagesByDate {
  date: string; // YYYY-MM-DD
  displayDate: string; // 显示用的日期格式
  images: CapturedImage[];
  expanded: boolean;
}

export function HotProductCopy() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Platform>('temu');
  const [imagesByDate, setImagesByDate] = useState<ImagesByDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditingImage, setCurrentEditingImage] = useState<CapturedImage | null>(null); // 当前正在编辑的图片
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100, // 每页数量，最大值200
    total: 0,
  });

  const handleBack = () => {
    navigate(`/workspace/project/${projectId}/image-generation`);
  };

  const handleBackToHome = () => {
    navigate('/workspace/product-images');
  };

  // 格式化日期显示
  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 比较日期（忽略时间）
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (isSameDay(date, today)) {
      return '今天';
    } else if (isSameDay(date, yesterday)) {
      return '昨天';
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}年${month}月${day}日`;
    }
  };

  // 按日期分组图片
  const groupImagesByDate = (images: CapturedImage[]): ImagesByDate[] => {
    const groups: { [key: string]: CapturedImage[] } = {};

    images.forEach((image) => {
      const date = new Date(image.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(image);
    });

    // 转换为数组并按日期降序排序
    const sortedGroups = Object.entries(groups)
      .map(([date, images]) => ({
        date,
        displayDate: formatDisplayDate(date),
        images: images.sort((a, b) => b.timestamp - a.timestamp), // 同一天内按时间降序
        expanded: false,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序

    // 默认展开最近的一天
    if (sortedGroups.length > 0) {
      sortedGroups[0].expanded = true;
    }

    return sortedGroups;
  };

  // 加载图片列表
  const loadImages = async () => {
    setIsLoading(true);
    try {
      const response = await capturedImageService.getCapturedImages({
        platform: activeTab,
        page: pagination.page,
        limit: pagination.limit,
      });

      const grouped = groupImagesByDate(response.data);
      setImagesByDate(grouped);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
      });
    } catch (error) {
      console.error('加载图片失败:', error);
      toast.error('加载图片失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 展开某一天的图片（只展开点击的日期，关闭其他日期）
  const toggleDateExpansion = (date: string) => {
    setImagesByDate((prev) =>
      prev.map((group) => ({
        ...group,
        expanded: group.date === date, // 只展开点击的日期，其他都关闭
      }))
    );

    // 滚动到对应日期的内容区域
    setTimeout(() => {
      const element = document.getElementById(`date-group-${date}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 刷新列表
  const handleRefresh = () => {
    loadImages();
  };

  // 切换平台时重新加载
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 页码变化时重新加载
  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  // 处理截图完成（提示词生成后刷新列表）
  const handleCropComplete = () => {
    // 关闭编辑器
    setCurrentEditingImage(null);

    // 可以在这里重新加载数据或更新状态
    // 由于截图已经通过后端API处理，可以选择性刷新
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="h-screen overflow-hidden flex flex-col">
        {/* 顶部固定导航栏 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackToHome} className="text-gray-600 hover:text-gray-900">
                  <Home className="w-4 h-4 mr-2" />
                  首页
                </Button>
                <div className="h-5 w-px bg-gray-300"></div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
                <div className="h-5 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    抄爆款
                  </h1>
                </div>
              </div>
              {/* 操作按钮区域 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Platform)} className="w-full">
              {/* Tab 切换 - 居中显示 */}
              <div className="flex justify-center mb-6">
                <TabsList className="grid grid-cols-3 h-12 w-auto">
                  <TabsTrigger value="temu" className="text-base px-8">Temu</TabsTrigger>
                  <TabsTrigger value="amazon" className="text-base px-8">亚马逊</TabsTrigger>
                  <TabsTrigger value="etsy" className="text-base px-8">Etsy</TabsTrigger>
                </TabsList>
              </div>

              {/* 左右分栏的时间轴视图 */}
              {['temu', 'amazon', 'etsy'].map((platform) => (
                <TabsContent key={platform} value={platform} className="mt-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-3" />
                      <span className="text-gray-500">加载中...</span>
                    </div>
                  ) : imagesByDate.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-white">
                      <p className="text-gray-500 text-lg">暂无数据</p>
                      <p className="text-gray-400 text-sm mt-2">还没有抓取到任何 {platform.toUpperCase()} 商品图片</p>
                    </div>
                  ) : (
                    <div className="flex gap-6">
                      {/* 左侧时间轴 */}
                      <div className="w-48 flex-shrink-0">
                        <div className="sticky top-6 space-y-1">
                          {imagesByDate.map((dateGroup) => (
                            <button
                              key={dateGroup.date}
                              className={`w-full px-4 py-3 rounded-md cursor-pointer transition-colors text-left ${
                                dateGroup.expanded
                                  ? 'bg-secondary text-secondary-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              }`}
                              onClick={() => toggleDateExpansion(dateGroup.date)}
                            >
                              <div className="text-sm">
                                {dateGroup.displayDate}
                              </div>
                              <div className="text-xs mt-0.5 opacity-70">
                                {dateGroup.images.length} 张图片
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 右侧图片网格 */}
                      <div className="flex-1">
                        {imagesByDate.map((dateGroup) => (
                          dateGroup.expanded && (
                            <div key={dateGroup.date} id={`date-group-${dateGroup.date}`} className="rounded-lg border bg-card p-6">
                              <div className="mb-6">
                                <h3 className="text-xl font-semibold">
                                  {dateGroup.displayDate}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  共 {dateGroup.images.length} 张图片
                                </p>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {dateGroup.images.map((image) => (
                                  <div
                                    key={image.id}
                                    className="relative group rounded-md overflow-hidden border bg-card transition-all hover:shadow-md cursor-pointer"
                                    onClick={() => setCurrentEditingImage(image)}
                                  >
                                    {/* 图片 */}
                                    <div className="aspect-square bg-muted relative">
                                      <img
                                        src={image.imageUrl}
                                        alt={`Captured at ${new Date(image.timestamp).toLocaleString()}`}
                                        className="w-full h-full object-cover"
                                      />

                                      {/* 悬停遮罩 */}
                                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm" />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="text-center">
                                          <Scissors className="w-8 h-8 text-foreground mx-auto" />
                                          <p className="text-foreground text-sm mt-2 font-medium">点击截图</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 时间戳 - 悬停时显示 */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-muted-foreground">
                                        {new Date(image.timestamp).toLocaleTimeString('zh-CN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      {/* 截图编辑器弹窗 */}
      {currentEditingImage && projectId && (
        <ImageCropEditor
          imageUrl={currentEditingImage.imageUrl}
          sourceImageId={currentEditingImage.id}
          platform={activeTab}
          projectId={projectId}
          onClose={() => setCurrentEditingImage(null)}
          onComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
