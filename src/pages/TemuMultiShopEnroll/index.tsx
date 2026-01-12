import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, RefreshCw, Loader2, Eye, Square, RotateCcw } from 'lucide-react';
import {
  temuMultiShopEnrollService,
  type MultiShopEnrollJobItem,
  JOB_STATUS,
  getJobStatusDisplay,
} from '@/services/temuMultiShopEnrollService';
import { toast } from 'sonner';

// 格式化时间
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function TemuMultiShopEnroll() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<MultiShopEnrollJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 加载任务列表
  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await temuMultiShopEnrollService.getJobs({
        status: statusFilter || undefined,
        page,
        pageSize,
      });
      setJobs(response.items || []);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, pageSize]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // 自动刷新运行中的任务
  useEffect(() => {
    const hasRunning = jobs.some(job => job.status === JOB_STATUS.RUNNING);
    if (hasRunning) {
      const interval = setInterval(loadJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [jobs, loadJobs]);

  // 取消任务
  const handleCancelJob = async (jobId: number) => {
    try {
      await temuMultiShopEnrollService.cancelJob(jobId);
      toast.success('任务已取消');
      loadJobs();
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast.error('取消任务失败');
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const display = getJobStatusDisplay(status);
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      gray: 'secondary',
      blue: 'default',
      green: 'outline',
      red: 'destructive',
      orange: 'secondary',
    };
    return (
      <Badge variant={variantMap[display.color] || 'secondary'}>
        {display.text}
      </Badge>
    );
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>批量报名任务</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadJobs}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">刷新</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/workspace/temu-multi-shop-enroll/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              新建任务
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 状态筛选 */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="">全部</TabsTrigger>
              <TabsTrigger value={JOB_STATUS.RUNNING}>进行中</TabsTrigger>
              <TabsTrigger value={JOB_STATUS.COMPLETED}>已完成</TabsTrigger>
              <TabsTrigger value={JOB_STATUS.FAILED}>失败</TabsTrigger>
              <TabsTrigger value={JOB_STATUS.CANCELLED}>已取消</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 任务列表 */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">任务名称</TableHead>
                  <TableHead className="w-[100px]">店铺数</TableHead>
                  <TableHead className="w-[120px]">进度</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[150px]">创建时间</TableHead>
                  <TableHead className="w-[200px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2 text-muted-foreground">加载中...</p>
                    </TableCell>
                  </TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">暂无任务</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>{job.totalShops} 个店铺</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${job.totalShops > 0 ? ((job.completedShops + job.failedShops) / job.totalShops) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {job.completedShops + job.failedShops}/{job.totalShops}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(job.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/workspace/temu-multi-shop-enroll/${job.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                          {(job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.RUNNING) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              停止
                            </Button>
                          )}
                          {job.status === JOB_STATUS.FAILED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: 重试功能
                                toast.info('重试功能开发中');
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              重试
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {total > pageSize && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="py-2 px-4 text-sm text-muted-foreground">
                第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TemuMultiShopEnroll;
