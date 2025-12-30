import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, RefreshCw, Search, FileText, Eye, Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import {
  temuTitleTemplateService,
  type TemuTitleTemplate,
  type CreateTemuTitleTemplateRequest,
  type UpdateTemuTitleTemplateRequest,
  type TitlePreviewResponse,
} from '@/services/temuTitleTemplateService';
import { toast } from 'sonner';

export function TemuTitleTemplates() {
  const [templates, setTemplates] = useState<TemuTitleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemuTitleTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TemuTitleTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState<CreateTemuTitleTemplateRequest>({
    name: '',
    categoryKeywordsZh: '',
    categoryKeywordsEn: '',
    productSpec: '',
    productUsage: '',
    theme: '',
    festivalKeywords: '',
    maxLengthZh: 127,
    maxLengthEn: 255,
    forbiddenWords: '',
  });

  // 预览状态
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<TitlePreviewResponse | null>(null);
  const [sampleScene, setSampleScene] = useState('');

  // 加载模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await temuTitleTemplateService.getAllTemplates();
      setTemplates(response.templates);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      toast.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 打开新建对话框
  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      categoryKeywordsZh: '',
      categoryKeywordsEn: '',
      productSpec: '',
      productUsage: '',
      theme: '',
      festivalKeywords: '',
      maxLengthZh: 127,
      maxLengthEn: 255,
      forbiddenWords: '',
    });
    setPreviewResult(null);
    setSampleScene('');
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (template: TemuTitleTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      categoryKeywordsZh: template.categoryKeywordsZh || '',
      categoryKeywordsEn: template.categoryKeywordsEn || '',
      productSpec: template.productSpec || '',
      productUsage: template.productUsage || '',
      theme: template.theme || '',
      festivalKeywords: template.festivalKeywords || '',
      maxLengthZh: template.maxLengthZh || 127,
      maxLengthEn: template.maxLengthEn || 255,
      forbiddenWords: template.forbiddenWords || '',
    });
    setPreviewResult(null);
    setSampleScene('');
    setShowDialog(true);
  };

  // 复制模板
  const handleCopy = (template: TemuTitleTemplate) => {
    setEditingTemplate(null); // 设置为 null 表示这是新建
    setFormData({
      name: `${template.name} - 副本`,
      categoryKeywordsZh: template.categoryKeywordsZh || '',
      categoryKeywordsEn: template.categoryKeywordsEn || '',
      productSpec: template.productSpec || '',
      productUsage: template.productUsage || '',
      theme: template.theme || '',
      festivalKeywords: template.festivalKeywords || '',
      maxLengthZh: template.maxLengthZh || 127,
      maxLengthEn: template.maxLengthEn || 255,
      forbiddenWords: template.forbiddenWords || '',
    });
    setPreviewResult(null);
    setSampleScene('');
    setShowDialog(true);
    toast.info('已复制模板，请修改名称后保存');
  };

  // 预览标题效果
  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const result = await temuTitleTemplateService.previewTitle({
        categoryKeywordsZh: formData.categoryKeywordsZh,
        categoryKeywordsEn: formData.categoryKeywordsEn,
        productSpec: formData.productSpec,
        productUsage: formData.productUsage,
        theme: formData.theme,
        festivalKeywords: formData.festivalKeywords,
        maxLengthZh: formData.maxLengthZh,
        maxLengthEn: formData.maxLengthEn,
        forbiddenWords: formData.forbiddenWords,
        sampleScene: sampleScene || undefined,
      });

      setPreviewResult(result);
    } catch (error: any) {
      console.error('预览生成失败:', error);
      toast.error(error.response?.data?.message || '预览生成失败');
    } finally {
      setPreviewing(false);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    try {
      setSubmitting(true);

      if (editingTemplate) {
        // 更新
        const updateData: UpdateTemuTitleTemplateRequest = {
          ...formData,
          isActive: editingTemplate.isActive,
        };
        await temuTitleTemplateService.updateTemplate(editingTemplate.id, updateData);
        toast.success('模板更新成功');
      } else {
        // 创建
        await temuTitleTemplateService.createTemplate(formData);
        toast.success('模板创建成功');
      }

      setShowDialog(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('保存模板失败:', error);
      toast.error(error.response?.data?.message || '保存模板失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换启用状态
  const handleToggleActive = async (template: TemuTitleTemplate) => {
    try {
      const updateData: UpdateTemuTitleTemplateRequest = {
        name: template.name,
        categoryKeywordsZh: template.categoryKeywordsZh,
        categoryKeywordsEn: template.categoryKeywordsEn,
        productSpec: template.productSpec,
        productUsage: template.productUsage,
        theme: template.theme,
        festivalKeywords: template.festivalKeywords,
        maxLengthZh: template.maxLengthZh,
        maxLengthEn: template.maxLengthEn,
        forbiddenWords: template.forbiddenWords,
        isActive: !template.isActive,
      };
      await temuTitleTemplateService.updateTemplate(template.id, updateData);
      fetchTemplates();
    } catch (error: any) {
      console.error('切换状态失败:', error);
      toast.error(error.response?.data?.message || '切换状态失败');
    }
  };

  // 删除模板
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await temuTitleTemplateService.deleteTemplate(deletingTemplate.id);
      toast.success('模板删除成功');
      setShowDeleteDialog(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      console.error('删除模板失败:', error);
      toast.error(error.response?.data?.message || '删除模板失败');
    }
  };

  // 过滤模板
  const filteredTemplates = templates.filter(t => {
    const keyword = searchKeyword.toLowerCase();
    return (
      t.name.toLowerCase().includes(keyword) ||
      t.categoryKeywordsZh?.toLowerCase().includes(keyword) ||
      t.categoryKeywordsEn?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temu 标题模板</h1>
          <p className="text-gray-600">管理 AI 生成标题的配置模板</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索模板名称或关键词..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 模板列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">模板名称</TableHead>
              <TableHead>类目关键词(中文)</TableHead>
              <TableHead>类目关键词(英文)</TableHead>
              <TableHead className="w-24">中文限制</TableHead>
              <TableHead className="w-24">英文限制</TableHead>
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无模板</h3>
                  <p>{searchKeyword ? '没有找到匹配的模板' : '点击上方按钮创建第一个模板'}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={template.categoryKeywordsZh}>
                    {template.categoryKeywordsZh || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={template.categoryKeywordsEn}>
                    {template.categoryKeywordsEn || '-'}
                  </TableCell>
                  <TableCell>{template.maxLengthZh} 字</TableCell>
                  <TableCell>{template.maxLengthEn} 字符</TableCell>
                  <TableCell>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(template)}
                        title="复制模板"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        title="编辑模板"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingTemplate(template);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                        title="删除模板"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 新建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTemplate ? '编辑标题模板' : '新建标题模板'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? '修改标题模板配置' : '创建新的 AI 标题生成模板'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">基本信息</h4>
              <div className="space-y-2">
                <Label htmlFor="name">模板名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：礼品包装纸模板"
                />
              </div>
            </div>

            {/* 核心关键词配置 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">核心关键词配置</h4>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">重要</span>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                类目关键词是标题最核心的部分，可加入节日词提升搜索曝光，如：<span className="text-blue-600 font-medium">Christmas wrapping paper</span>、<span className="text-blue-600 font-medium">Birthday wrapping paper</span>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryKeywordsZh" className="flex items-center gap-1">
                    类目关键词（中文）
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="categoryKeywordsZh"
                    value={formData.categoryKeywordsZh}
                    onChange={(e) => setFormData({ ...formData, categoryKeywordsZh: e.target.value })}
                    placeholder="如：圣诞节礼品包装纸"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryKeywordsEn" className="flex items-center gap-1">
                    类目关键词（英文）
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="categoryKeywordsEn"
                    value={formData.categoryKeywordsEn}
                    onChange={(e) => setFormData({ ...formData, categoryKeywordsEn: e.target.value })}
                    placeholder="如：Christmas wrapping paper"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productSpec">商品规格</Label>
                  <Textarea
                    id="productSpec"
                    value={formData.productSpec}
                    onChange={(e) => setFormData({ ...formData, productSpec: e.target.value })}
                    placeholder="例如：A5尺寸、100页、线圈装订"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productUsage">商品用途</Label>
                  <Textarea
                    id="productUsage"
                    value={formData.productUsage}
                    onChange={(e) => setFormData({ ...formData, productUsage: e.target.value })}
                    placeholder="例如：学习笔记、工作记录、日程规划"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme" className="flex items-center gap-1">
                    主题
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">推荐填写</span>
                  </Label>
                  <Textarea
                    id="theme"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    placeholder="例如：简约风格、卡通图案、复古风"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500">描述产品的风格或主题特点</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="festivalKeywords" className="flex items-center gap-1">
                    节日场景
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">蹭流量</span>
                  </Label>
                  <Textarea
                    id="festivalKeywords"
                    value={formData.festivalKeywords}
                    onChange={(e) => setFormData({ ...formData, festivalKeywords: e.target.value })}
                    placeholder="例如：Christmas, Valentine's Day, Birthday"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500">提前1-2个月布局季节性关键词</p>
                </div>
              </div>
            </div>

            {/* 标题限制 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">标题限制</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLengthZh">中文最大长度</Label>
                  <Input
                    id="maxLengthZh"
                    type="number"
                    value={formData.maxLengthZh}
                    onChange={(e) => setFormData({ ...formData, maxLengthZh: parseInt(e.target.value) || 127 })}
                    min={1}
                    max={500}
                  />
                  <p className="text-xs text-gray-500">默认 127 字</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLengthEn">英文最大长度</Label>
                  <Input
                    id="maxLengthEn"
                    type="number"
                    value={formData.maxLengthEn}
                    onChange={(e) => setFormData({ ...formData, maxLengthEn: parseInt(e.target.value) || 255 })}
                    min={1}
                    max={1000}
                  />
                  <p className="text-xs text-gray-500">默认 255 字符</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forbiddenWords">禁用词</Label>
                  <Input
                    id="forbiddenWords"
                    value={formData.forbiddenWords}
                    onChange={(e) => setFormData({ ...formData, forbiddenWords: e.target.value })}
                    placeholder="用逗号分隔，如：儿童, kids"
                  />
                  <p className="text-xs text-gray-500">多个词用逗号分隔</p>
                </div>
              </div>
            </div>

            {/* 效果预览区 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">效果预览</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={previewing}
                >
                  {previewing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      预览标题效果
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sampleScene">模拟场景描述（可选）</Label>
                  <Input
                    id="sampleScene"
                    value={sampleScene}
                    onChange={(e) => setSampleScene(e.target.value)}
                    placeholder="例如：红色圣诞树图案、粉色樱花图案"
                  />
                  <p className="text-xs text-gray-500">输入场景描述可生成更具体的标题预览</p>
                </div>

                {previewResult && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    {/* 中文标题预览 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">中文标题预览</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {previewResult.lengthZh} / {formData.maxLengthZh} 字
                          </span>
                          {previewResult.isValidZh ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className={`p-3 rounded border ${previewResult.isValidZh ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-sm text-gray-800 break-all">{previewResult.titleZh}</p>
                      </div>
                    </div>

                    {/* 英文标题预览 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">英文标题预览</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {previewResult.lengthEn} / {formData.maxLengthEn} 字符
                          </span>
                          {previewResult.isValidEn ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className={`p-3 rounded border ${previewResult.isValidEn ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-sm text-gray-800 break-all">{previewResult.titleEn}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模板 "{deletingTemplate?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
