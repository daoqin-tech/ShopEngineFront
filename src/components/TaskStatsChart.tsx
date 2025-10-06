import React from 'react'
import { TaskStatsResponse } from '@/services/coverProjectService'

interface TaskStatsChartProps {
  stats: TaskStatsResponse
}

const TaskStatsChart: React.FC<TaskStatsChartProps> = ({ stats }) => {
  const { totalTasks, pendingTasks, queuedTasks, processingTasks, completedTasks, failedTasks } = stats

  // 如果没有任务，显示空状态
  if (totalTasks === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">暂无任务</span>
      </div>
    )
  }

  // 状态配置
  const statusConfig = [
    { key: 'completed', count: completedTasks, label: '已完成', color: 'bg-emerald-500' },
    { key: 'failed', count: failedTasks, label: '失败', color: 'bg-red-500' },
    { key: 'processing', count: processingTasks, label: '处理中', color: 'bg-amber-500' },
    { key: 'queued', count: queuedTasks, label: '队列中', color: 'bg-blue-500' },
    { key: 'pending', count: pendingTasks, label: '等待中', color: 'bg-gray-400' },
  ].filter(item => item.count > 0)

  return (
    <div className="flex flex-col gap-1">
      {/* 堆叠进度条 */}
      <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
        {statusConfig.map((status, index) => {
          // 计算精确的百分比
          let width = (status.count / totalTasks) * 100

          // 确保最小可见宽度（至少0.5%，这样很小的数值也能看到）
          if (status.count > 0 && width < 0.5) {
            width = 0.5
          }

          // 最后一个元素占据剩余空间，避免舍入误差导致的空隙
          const isLast = index === statusConfig.length - 1

          return (
            <div
              key={status.key}
              className={`h-full ${status.color} group relative ${isLast ? 'flex-1' : ''}`}
              style={isLast ? {} : { width: `${width}%` }}
              title={`${status.label}: ${status.count} (${((status.count / totalTasks) * 100).toFixed(1)}%)`}
            >
              {/* 悬停提示 */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {status.label}: {status.count} ({((status.count / totalTasks) * 100).toFixed(1)}%)
              </div>
            </div>
          )
        })}
      </div>

      {/* 状态图例和总任务数 */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-gray-600">总任务: </span>
          <span className="font-semibold text-gray-900">{totalTasks}</span>
        </div>
        {statusConfig.map((status) => (
          <div key={status.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
            <span className="text-gray-600">{status.label} {status.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TaskStatsChart