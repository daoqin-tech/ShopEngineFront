import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  coverPollingService 
} from '@/services/coverProjectService'
import { 
  CoverProject, 
  CoverProjectStatus,
  ReplacementImage, 
  GeneratedCover,
  BatchGenerationStatus
} from '@/types/template'
// Mock data utilities
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

// 套图项目管理Hook
export function useCoverProjects() {
  const [projects, setProjects] = useState<CoverProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const loadProjects = useCallback(async (params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
  }) => {
    try {
      setLoading(true)
      setError(null)
      
      // Mock数据处理
      await delay(800)
      let filteredProjects: CoverProject[] = []
      
      // 模拟搜索过滤
      if (params?.search) {
        filteredProjects = filteredProjects.filter(project =>
          project.name.toLowerCase().includes(params.search!.toLowerCase()) ||
          project.template.name.toLowerCase().includes(params.search!.toLowerCase())
        )
      }
      
      // 模拟状态过滤
      if (params?.status) {
        filteredProjects = filteredProjects.filter(project =>
          project.status === params.status
        )
      }
      
      setProjects(filteredProjects)
      setTotal(filteredProjects.length)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const createProject = useCallback(async (name: string): Promise<CoverProject> => {
    try {
      setError(null)
      await delay(500)
      
      // Mock创建项目
      const newProject: CoverProject = {
        id: generateId(),
        name,
        templateId: '',
        template: null as any, // 默认模板
        status: 'draft' as CoverProjectStatus,
        totalImages: 0,
        completedImages: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setProjects(prev => [newProject, ...prev])
      return newProject
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建项目失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [])

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await delay(300)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除项目失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [])

  return {
    projects,
    loading,
    error,
    total,
    loadProjects,
    createProject,
    deleteProject,
    setError
  }
}

// 单个套图项目Hook
export function useCoverProject(projectId: string | null) {
  const [project, setProject] = useState<CoverProject | null>(null)
  const [replacementImages, setReplacementImages] = useState<ReplacementImage[]>([])
  const [generatedCovers, setGeneratedCovers] = useState<GeneratedCover[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<BatchGenerationStatus | null>(null)

  const pollingRef = useRef<boolean>(false)

  // 加载项目数据
  const loadProject = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      await delay(1000)
      
      // Mock加载项目数据
      const projectData = null
      if (!projectData) {
        throw new Error('项目不存在')
      }
      
      // Mock图片和套图数据
      const imagesData: ReplacementImage[] = []
      const coversData: GeneratedCover[] = []

      setProject(projectData)
      setReplacementImages(imagesData)
      setGeneratedCovers(coversData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载项目失败')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // 上传替换图片
  const uploadImages = useCallback(async (files: File[]) => {
    if (!projectId) return

    try {
      setError(null)
      
      // Mock上传图片
      const uploadPromises = files.map(async (file) => {
        const url = URL.createObjectURL(file)
        return {
          id: generateId(),
          originalName: file.name,
          url,
          width: 600, // Mock尺寸
          height: 600,
          fileSize: file.size
        }
      })
      
      const newImages = await Promise.all(uploadPromises)
      setReplacementImages(prev => [...prev, ...newImages])
      return newImages
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '上传图片失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [projectId])

  // 删除替换图片
  const deleteImage = useCallback(async (imageId: string) => {
    if (!projectId) return

    try {
      await delay(300)
      const image = replacementImages.find(img => img.id === imageId)
      if (image) {
        URL.revokeObjectURL(image.url) // 清理blob URL
      }
      setReplacementImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除图片失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [projectId, replacementImages])

  // 设置项目模板
  const setProjectTemplate = useCallback(async (templateId: string) => {
    if (!projectId) return

    try {
      // Mock设置模板
      await delay(300)
      if (project) {
        const template = null
        const updatedProject = { ...project, templateId, template: template! }
        setProject(updatedProject)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '设置模板失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [projectId])

  // 开始批量生成
  const startGeneration = useCallback(async (replacements: {
    layerId: string
    imageId?: string
    text?: string
  }[]) => {
    if (!projectId || !project?.template) return

    try {
      setError(null)
      setIsGenerating(true)
      pollingRef.current = true

      // Mock批量生成过程
      const totalImages = replacementImages.length
      let completed = 0
      
      const mockGeneratedResults: GeneratedCover[] = []
      
      // 模拟逐个生成
      const generateNext = () => {
        if (completed >= totalImages || !pollingRef.current) {
          setIsGenerating(false)
          setGenerationStatus({
            projectId,
            totalTasks: totalImages,
            completedTasks: completed,
            failedTasks: 0,
            results: mockGeneratedResults
          })
          return
        }
        
        const currentImage = replacementImages[completed]
        
        setTimeout(() => {
          // 创建mock生成结果
          const newCover: GeneratedCover = {
            id: generateId(),
            projectId,
            templateId: project.template.id,
            imageUrl: `https://picsum.photos/${project.template.data.width}/${project.template.data.height}?random=${Date.now() + completed}`,
            thumbnailUrl: `https://picsum.photos/300/200?random=${Date.now() + completed}`,
            width: project.template.data.width,
            height: project.template.data.height,
            status: 'completed',
            createdAt: new Date().toISOString(),
            replacements: replacements.map(r => ({
              layerId: r.layerId,
              content: r.imageId ? currentImage.url : r.text || ''
            }))
          }
          
          mockGeneratedResults.push(newCover)
          completed++
          
          // 更新状态
          setGenerationStatus({
            projectId,
            totalTasks: totalImages,
            completedTasks: completed,
            failedTasks: 0,
            results: [...mockGeneratedResults]
          })
          
          setGeneratedCovers([...mockGeneratedResults])
          
          // 继续下一个
          generateNext()
        }, 2000 + Math.random() * 3000) // 2-5秒生成一张
      }
      
      generateNext()

    } catch (err: unknown) {
      setIsGenerating(false)
      setError(err instanceof Error ? err.message : '开始生成失败')
    }
  }, [projectId, project, replacementImages])

  // 停止生成
  const stopGeneration = useCallback(() => {
    if (projectId) {
      coverPollingService.stopPolling(projectId)
      setIsGenerating(false)
      pollingRef.current = false
    }
  }, [projectId])

  // 下载单个套图
  const downloadCover = useCallback(async (coverId: string, format: 'jpg' | 'png' = 'jpg') => {
    if (!projectId) return

    try {
      const cover = generatedCovers.find(c => c.id === coverId)
      if (!cover) return
      
      // Mock下载：直接从imageUrl下载
      const link = document.createElement('a')
      link.href = cover.imageUrl
      link.download = `cover_${coverId}.${format}`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '下载失败')
    }
  }, [projectId, generatedCovers])

  // 批量下载套图
  const downloadAllCovers = useCallback(async (coverIds?: string[]) => {
    if (!projectId) return

    try {
      // Mock批量下载：逐个触发下载
      const coversToDownload = coverIds 
        ? generatedCovers.filter(c => coverIds.includes(c.id))
        : generatedCovers
      
      for (let i = 0; i < coversToDownload.length; i++) {
        const cover = coversToDownload[i]
        // 延迟下载以避免浏览器阻止多个下载
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = cover.imageUrl
          link.download = `cover_${i + 1}_${cover.id}.jpg`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, i * 1000) // 每个下载间隔1秒
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '批量下载失败')
    }
  }, [projectId, generatedCovers])

  // 删除生成的套图
  const deleteCover = useCallback(async (coverId: string) => {
    if (!projectId) return

    try {
      await delay(200)
      setGeneratedCovers(prev => prev.filter(cover => cover.id !== coverId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除套图失败')
    }
  }, [projectId])

  // 清理轮询
  useEffect(() => {
    return () => {
      if (projectId && pollingRef.current) {
        coverPollingService.stopPolling(projectId)
      }
    }
  }, [projectId])

  // 加载项目数据
  useEffect(() => {
    loadProject()
  }, [loadProject])

  return {
    project,
    replacementImages,
    generatedCovers,
    loading,
    error,
    isGenerating,
    generationStatus,
    uploadImages,
    deleteImage,
    setProjectTemplate,
    startGeneration,
    stopGeneration,
    downloadCover,
    downloadAllCovers,
    deleteCover,
    setError
  }
}