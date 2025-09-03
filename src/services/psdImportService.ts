import { Template } from '@/types/template'

/**
 * 导入模板数据 - 后端直接返回 Template 格式
 */
export function importTemplateData(templateData: Template): Template['data'] {
  return templateData.data
}