import { useState, useEffect } from 'react'
import { TaskStatsResponse, coverProjectService } from '@/services/coverProjectService'

interface UseTaskStatsOptions {
  enabled?: boolean  // 是否启用轮询
  interval?: number  // 轮询间隔（毫秒），默认10秒
}

export const useTaskStats = (options: UseTaskStatsOptions = {}) => {
  const { enabled = true, interval = 10000 } = options

  const [stats, setStats] = useState<TaskStatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取任务统计数据
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await coverProjectService.getTaskStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取任务统计失败')
      console.error('Failed to fetch task stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // 手动刷新
  const refresh = () => {
    fetchStats()
  }

  // 定时轮询
  useEffect(() => {
    if (!enabled) return

    // 立即执行一次
    fetchStats()

    // 设置定时器
    const timer = setInterval(fetchStats, interval)

    // 清理定时器
    return () => {
      clearInterval(timer)
    }
  }, [enabled, interval])

  return {
    stats,
    loading,
    error,
    refresh
  }
}