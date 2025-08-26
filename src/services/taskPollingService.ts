import { editApi } from './imageEditService'
import { TaskStatus, TaskStatusResponse } from '@/types/imageEdit'
import { toast } from 'sonner'

interface TaskPollingCallbacks {
  onCompleted?: (response: TaskStatusResponse) => void
  onFailed?: (error: string) => void
}

class TaskPollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 开始轮询任务状态
   * @param taskId 任务ID
   * @param callbacks 回调函数
   * @param interval 轮询间隔（毫秒）
   */
  startPolling(
    taskId: string, 
    callbacks: TaskPollingCallbacks = {}, 
    interval: number = 3000
  ) {
    // 清理之前的轮询
    this.stopPolling(taskId)
    
    if (!taskId) {
      return
    }

    const { onCompleted, onFailed } = callbacks

    const pollingInterval = setInterval(async () => {
      try {
        const statusResponse = await editApi.checkEditStatus(taskId)
        
        switch (statusResponse.status) {
          case TaskStatus.PENDING:
          case TaskStatus.QUEUED:
          case TaskStatus.PROCESSING:
            // 继续轮询
            break
            
          case TaskStatus.COMPLETED:
            this.stopPolling(taskId)
            onCompleted?.(statusResponse)
            break
            
          case TaskStatus.FAILED:
            this.stopPolling(taskId)
            const errorMsg = statusResponse.errorMessage || '处理失败，请重试'
            toast.error(errorMsg)
            onFailed?.(errorMsg)
            break
            
          default:
            this.stopPolling(taskId)
            const unknownError = '未知状态，请重试'
            toast.error(unknownError)
            onFailed?.(unknownError)
            break
        }
      } catch (error) {
        console.error('Status check failed:', error)
        const errorMsg = '状态检查失败，请重试'
        toast.error(errorMsg)
        this.stopPolling(taskId)
        onFailed?.(errorMsg)
      }
    }, interval)

    this.pollingIntervals.set(taskId, pollingInterval)
  }

  /**
   * 停止指定任务的轮询
   * @param taskId 任务ID
   */
  stopPolling(taskId: string) {
    const interval = this.pollingIntervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(taskId)
    }
  }

  /**
   * 停止所有轮询
   */
  stopAllPolling() {
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.pollingIntervals.clear()
  }

  /**
   * 获取当前正在轮询的任务数量
   */
  getActivePollingCount(): number {
    return this.pollingIntervals.size
  }

  /**
   * 检查指定任务是否正在轮询
   */
  isPolling(taskId: string): boolean {
    return this.pollingIntervals.has(taskId)
  }
}

// 导出单例实例
export const taskPollingService = new TaskPollingService()