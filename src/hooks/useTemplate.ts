import { useState, useCallback } from 'react'
import { Template, Layer } from '@/types/template'
import { templateService } from '@/services/templateService'

// 模板管理Hook
export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const templates = await templateService.getTemplates()
      setTemplates(templates)
      setTotal(templates.length)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载模板列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      await templateService.deleteTemplate(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除模板失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [])

  return {
    templates,
    loading,
    error,
    total,
    loadTemplates,
    deleteTemplate,
    setError
  }
}

// 单个模板Hook
export function useTemplate(templateId: string | null) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Template[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // 加载模板
  const loadTemplate = useCallback(async () => {
    if (!templateId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // 使用本地JSON数据模拟模板加载
      const response = await fetch('/mock-template.json')
      const jsonData = await response.json()
      
      // 转换JSON数据为Template格式
      const mockTemplate: Template = {
        id: templateId,
        name: jsonData.data.file_name || '手账纸模板3',
        thumbnailUrl: '',
        data: {
          width: jsonData.data.canvas.width,
          height: jsonData.data.canvas.height,
          layers: jsonData.data.layers
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setTemplate(mockTemplate)
      setHistory([mockTemplate])
      setHistoryIndex(0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载模板失败')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  // 保存到历史记录
  const saveToHistory = useCallback((newTemplate: Template) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newTemplate)
      return newHistory
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  // 更新图层
  const updateLayer = useCallback(async (layerId: string, updates: Partial<Layer>) => {
    if (!template) return

    try {
      // 乐观更新
      const newTemplate = {
        ...template,
        data: {
          ...template.data,
          layers: template.data.layers.map(layer =>
            layer.id === layerId ? { ...layer, ...updates } : layer
          )
        }
      }
      setTemplate(newTemplate)
      saveToHistory(newTemplate)

      // API调用 - 更新图层
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新图层失败')
      // 回滚更改
      if (history[historyIndex - 1]) {
        setTemplate(history[historyIndex - 1])
        setHistoryIndex(prev => prev - 1)
      }
    }
  }, [template, history, historyIndex, saveToHistory])

  // 删除图层
  const deleteLayer = useCallback(async (layerId: string) => {
    if (!template) return

    try {
      const newTemplate = {
        ...template,
        data: {
          ...template.data,
          layers: template.data.layers.filter(layer => layer.id !== layerId)
        }
      }
      setTemplate(newTemplate)
      saveToHistory(newTemplate)

      // API调用 - 删除图层
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除图层失败')
      // 回滚更改
      if (history[historyIndex - 1]) {
        setTemplate(history[historyIndex - 1])
        setHistoryIndex(prev => prev - 1)
      }
    }
  }, [template, history, historyIndex, saveToHistory])

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setTemplate(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setTemplate(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  // 保存模板
  const saveTemplate = useCallback(async () => {
    if (!template) return

    try {
      setLoading(true)
      // API调用 - 保存模板
      // 模拟保存成功，实际返回相同的模板数据
      setTemplate({...template, updatedAt: new Date().toISOString()})
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存模板失败')
      throw err instanceof Error ? err : new Error(String(err))
    } finally {
      setLoading(false)
    }
  }, [template])


  // 导入 PSD 数据
  const importPSDData = useCallback((width: number, height: number, layers: Layer[]) => {
    if (!template) return
    
    const newTemplate = {
      ...template,
      data: {
        width,
        height,
        layers
      }
    }
    setTemplate(newTemplate)
    saveToHistory(newTemplate)
  }, [template, saveToHistory])

  return {
    template,
    loading,
    error,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    updateLayer,
    deleteLayer,
    undo,
    redo,
    saveTemplate,
    setError,
    importPSDData,
    loadTemplate
  }
}

