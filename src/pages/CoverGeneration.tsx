import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, X, ChevronLeft, ChevronRight, Image, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DateTimePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  coverProjectService,
  type TaskInfo,
  type TemplateSearchItem,
  type RestartFailedTasksRequest
} from '@/services/coverProjectService'
import { toast } from 'sonner'
import JSZip from 'jszip'
import TaskStatsChart from '@/components/TaskStatsChart'
import { useTaskStats } from '@/hooks/useTaskStats'

export function CoverGeneration() {
  const navigate = useNavigate()

  // 任务统计
  const { stats, loading: statsLoading, refresh: refreshStats } = useTaskStats()

  // 任务列表状态
  const [tasks, setTasks] = useState<TaskInfo[]>([])
  const [loading, setLoading] = useState(true)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState('')
  const [templateFilter, setTemplateFilter] = useState('')
  const [startTime, setStartTime] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState<Date | undefined>()

  // 模板搜索选项状态
  const [templatesForSearch, setTemplatesForSearch] = useState<TemplateSearchItem[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // 选择和操作状态
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [previewImages, setPreviewImages] = useState<{ taskId: string; images: string[] } | null>(null)


  // 获取任务列表
  const fetchTasks = async (page: number = currentPage) => {
    try {
      setLoading(true)

      const params: any = {
        page,
        limit: pageSize,
      }

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter
      }

      if (templateFilter && templateFilter !== 'all') {
        params.templateId = templateFilter
      }

      if (startTime) {
        params.startTime = Math.floor(startTime.getTime() / 1000)
      }

      if (endTime) {
        params.endTime = Math.floor(endTime.getTime() / 1000)
      }

      const response = await coverProjectService.getAllTasks(params)
      setTasks(response.data || [])
      setTotal(response.total || 0)
      setCurrentPage(response.page || page)
    } catch (err) {
      toast.error('加载任务列表失败', {
        description: '请检查网络连接或稍后再试'
      })
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // 获取模板搜索选项
  const fetchTemplatesForSearch = async () => {
    try {
      setLoadingTemplates(true)
      const templates = await coverProjectService.getTemplatesForSearch()
      setTemplatesForSearch(templates)
    } catch (err) {
      console.error('Error fetching templates for search:', err)
      toast.error('加载模板选项失败')
    } finally {
      setLoadingTemplates(false)
    }
  }


  useEffect(() => {
    fetchTasks(1)
    fetchTemplatesForSearch()
  }, [])


  // 应用筛选
  const handleApplyFilters = () => {
    setCurrentPage(1)
    fetchTasks(1)
  }

  // 重置筛选
  const handleResetFilters = () => {
    setStatusFilter('')
    setTemplateFilter('')
    setStartTime(undefined)
    setEndTime(undefined)
    setCurrentPage(1)
    fetchTasks(1)
  }

  // 新建套图任务
  const handleNewCoverTask = () => {
    navigate('/workspace/cover-generation/create')
  }

  // 任务选择相关
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    // 包括已完成有图片的任务和失败的任务
    const selectableTasks = tasks.filter(task =>
      (task.status === 'completed' && task.resultImages?.length) || task.status === 'failed'
    )
    const selectableIds = selectableTasks.map(task => task.taskId)
    const allSelected = selectableIds.every(id => selectedTaskIds.has(id))

    if (allSelected && selectableIds.length > 0) {
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev)
        selectableIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev)
        selectableIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  // 批量下载
  const handleBatchDownload = async () => {
    if (selectedTaskIds.size === 0) {
      toast.error('请选择要下载的任务')
      return
    }

    try {
      toast.info('正在准备下载...')
      const zip = new JSZip()

      const selectedTasks = tasks.filter(task => selectedTaskIds.has(task.taskId))

      const promises = selectedTasks.flatMap((task, taskIndex) =>
        task.resultImages?.map(async (imageUrl, imageIndex) => {
          try {
            const response = await fetch(imageUrl)
            if (!response.ok) throw new Error(`Failed to fetch image`)

            const blob = await response.blob()
            const extension = imageUrl.split('.').pop()?.toLowerCase() || 'jpg'
            const filename = `task_${taskIndex + 1}_image_${imageIndex + 1}.${extension}`

            zip.file(filename, blob)
          } catch (error) {
            console.error('下载图片失败:', error)
          }
        }) || []
      )

      await Promise.all(promises)

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cover_generation_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('下载完成!')
      setSelectedTaskIds(new Set())
    } catch (error) {
      console.error('批量下载失败:', error)
      toast.error('下载失败，请重试')
    }
  }

  // 重新生成单个失败任务
  const handleRestartSingleTask = async (taskId: string) => {
    try {
      const request: RestartFailedTasksRequest = {
        taskIds: [taskId]
      }

      await coverProjectService.restartFailedTasks(request)
      toast.success('任务重新生成中...')

      // 刷新任务列表
      await fetchTasks()
    } catch (error) {
      console.error('重新生成失败任务失败:', error)
      toast.error('重新生成失败，请重试')
    }
  }

  // 批量重新生成失败任务
  const handleBatchRestartFailed = async () => {
    try {
      const failedTaskIds = Array.from(selectedTaskIds).filter(taskId => {
        const task = tasks.find(t => t.taskId === taskId)
        return task?.status === 'failed'
      })

      if (failedTaskIds.length === 0) {
        toast.warning('没有选择的失败任务')
        return
      }

      const request: RestartFailedTasksRequest = {
        taskIds: failedTaskIds
      }

      await coverProjectService.restartFailedTasks(request)
      toast.success(`已重新生成 ${failedTaskIds.length} 个失败任务`)

      // 清空选择并刷新任务列表
      setSelectedTaskIds(new Set())
      await fetchTasks()
    } catch (error) {
      console.error('批量重新生成失败任务失败:', error)
      toast.error('批量重新生成失败，请重试')
    }
  }

  // 获取状态显示文本
  const getStatusText = (status: TaskInfo['status']) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'queued': return '队列中'
      case 'processing': return '处理中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      default: return '未知'
    }
  }

  // 获取状态样式
  const getStatusStyle = (status: TaskInfo['status']) => {
    switch (status) {
      case 'pending':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'queued':
        return 'text-orange-700 bg-orange-50 border-orange-200'
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }


  return (
    <div className="h-screen flex flex-col">
      {/* 页面头部 */}
      <div className="flex justify-between items-center p-6 border-b bg-white">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold">套图生成</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* 任务统计图表 */}
          {stats && <TaskStatsChart stats={stats} />}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchTasks()
                refreshStats()
              }}
              disabled={loading || statsLoading}
            >
              <RefreshCw className={`w-4 h-4 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={handleNewCoverTask} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新建套图任务
            </Button>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">模板:</label>
            <Select
              value={templateFilter || undefined}
              onValueChange={(value) => setTemplateFilter(value || '')}
              disabled={loadingTemplates}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="全部模板" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模板</SelectItem>
                {templatesForSearch.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">状态:</label>
            <Select
              value={statusFilter || undefined}
              onValueChange={(value) => setStatusFilter(value || '')}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">等待中</SelectItem>
                <SelectItem value="queued">队列中</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">开始时间:</label>
            <DateTimePicker
              date={startTime}
              onDateChange={setStartTime}
              placeholder="选择开始时间"
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">结束时间:</label>
            <DateTimePicker
              date={endTime}
              onDateChange={setEndTime}
              placeholder="选择结束时间"
              className="w-48"
            />
          </div>
          <Button onClick={handleApplyFilters} className="px-6">
            搜索
          </Button>
          <Button variant="outline" onClick={handleResetFilters}>
            重置
          </Button>
          {selectedTaskIds.size > 0 && (
            <>
              <Button variant="outline" onClick={handleBatchDownload}>
                <Download className="w-4 h-4 mr-2" />
                批量下载 ({selectedTaskIds.size})
              </Button>
              {(() => {
                const failedTaskCount = Array.from(selectedTaskIds).filter(taskId => {
                  const task = tasks.find(t => t.taskId === taskId)
                  return task?.status === 'failed'
                }).length

                return failedTaskCount > 0 && (
                  <Button variant="outline" onClick={handleBatchRestartFailed} className="text-red-600 hover:text-red-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成失败任务 ({failedTaskCount})
                  </Button>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {/* 任务列表容器 - 可滚动 */}
      <div className="flex-1 overflow-hidden mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">还没有套图任务</h2>
              <p className="text-gray-500 mb-6">点击上方按钮创建您的第一个套图任务</p>
              <Button onClick={handleNewCoverTask}>
                <Plus className="w-4 h-4 mr-2" />
                新建套图任务
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="bg-white border-l border-r">
              {/* 表头 */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-5">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    checked={(() => {
                      const selectableTasks = tasks.filter(t =>
                        (t.status === 'completed' && t.resultImages?.length) || t.status === 'failed'
                      )
                      return selectableTasks.length > 0 && selectableTasks.every(t => selectedTaskIds.has(t.taskId))
                    })()}
                    onChange={toggleSelectAll}
                  />
                </div>
                <div className="col-span-1">缩略图</div>
                <div className="col-span-3">模板名称</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-3">创建时间</div>
                <div className="col-span-2">操作</div>
              </div>

              {/* 任务列表 */}
              {tasks.map((task) => {
                const isCompleted = task.status === 'completed'
                const hasImages = task.resultImages && task.resultImages.length > 0
                const isFailed = task.status === 'failed'
                const canSelect = (isCompleted && hasImages) || isFailed
                const isSelected = selectedTaskIds.has(task.taskId)

                return (
                  <div
                    key={task.taskId}
                    className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 group"
                  >
                    {/* 选择框 */}
                    <div className="col-span-1 flex items-center">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          checked={isSelected}
                          onChange={() => toggleTaskSelection(task.taskId)}
                        />
                      ) : (
                        <div className="w-4 h-4"></div>
                      )}
                    </div>

                    {/* 缩略图 */}
                    <div className="col-span-1 flex items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {task.thumbnail ? (
                          <img
                            src={task.thumbnail}
                            alt={task.templateName || '模板缩略图'}
                            className="w-full h-full object-cover"
                          />
                        ) : task.resultImages && task.resultImages.length > 0 ? (
                          <img
                            src={task.resultImages[0]}
                            alt={task.templateName || '模板缩略图'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 模板名称 */}
                    <div className="col-span-3 flex items-center">
                      <div className="text-sm text-gray-700 truncate" title={task.templateName || '暂无模板'}>
                        {task.templateName || '暂无模板'}
                      </div>
                    </div>

                    {/* 状态 */}
                    <div className="col-span-2 flex items-center">
                      <Badge
                        className={`${getStatusStyle(task.status)} font-medium`}
                      >
                        {getStatusText(task.status)}
                      </Badge>
                    </div>

                    {/* 创建时间 */}
                    <div className="col-span-3 flex items-center text-sm text-gray-500">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </div>

                    {/* 操作 */}
                    <div className="col-span-2 flex items-center justify-start">
                      {isCompleted && hasImages && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                            onClick={() => setPreviewImages({ taskId: task.taskId, images: task.resultImages! })}
                          >
                            预览
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-500 hover:text-green-700 text-xs"
                            onClick={() => {
                              setSelectedTaskIds(new Set([task.taskId]))
                              handleBatchDownload()
                            }}
                          >
                            下载
                          </Button>
                        </div>
                      )}
                      {task.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-500 hover:text-red-700 text-xs"
                          onClick={() => handleRestartSingleTask(task.taskId)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          重新生成
                        </Button>
                      )}
                      {task.status === 'processing' && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>处理中...</span>
                        </div>
                      )}
                      {(task.status === 'pending' || task.status === 'queued') && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <span>等待中...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {total > 0 && (
        <div className="border-t bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {total} 个任务，第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
            </div>

            {total > pageSize && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTasks(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchTasks(page)}
                      disabled={loading}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTasks(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 图片预览对话框 */}
      {previewImages && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImages(null)}
        >
          <div
            className="relative w-[80vw] max-h-[80vh] bg-white rounded-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                任务 {previewImages.taskId} 的结果图片 ({previewImages.images.length} 张)
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewImages(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-4 gap-4">
                {previewImages.images.map((imageUrl, index) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`结果图片 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t flex justify-center">
              <Button
                onClick={() => {
                  setSelectedTaskIds(new Set([previewImages.taskId]))
                  handleBatchDownload()
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                下载所有图片
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}