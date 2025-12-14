import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { systemConfigService } from '@/services/systemConfigService';
import type { SystemConfig, CreateSystemConfigRequest, UpdateSystemConfigRequest } from '@/types/systemConfig';
import { toast } from 'sonner';

// 敏感配置键列表（显示为 ****** ，编辑时不显示原值）
const SENSITIVE_KEYS = [
  'temu_api_app_key',
  'temu_api_app_secret',
  'temu_api_access_token',
];

// 检测是否是敏感配置
const isSensitiveKey = (key: string): boolean => {
  return SENSITIVE_KEYS.includes(key);
};

// 检测字符串是否是有效的 JSON
const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// 格式化 JSON 字符串
const formatJson = (str: string): string => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

// JSON 值预览组件
const JsonValuePreview = ({ value }: { value: string }) => {
  const [expanded, setExpanded] = useState(false);

  const isJson = useMemo(() => isValidJson(value), [value]);
  const formattedJson = useMemo(() => isJson ? formatJson(value) : value, [value, isJson]);

  if (!isJson) {
    return <span className="font-mono text-sm">{value}</span>;
  }

  // 计算预览信息
  const parsed = JSON.parse(value);
  const isArray = Array.isArray(parsed);
  const count = isArray ? parsed.length : Object.keys(parsed).length;
  const previewText = isArray ? `Array[${count}]` : `Object{${count}}`;

  return (
    <div className="font-mono text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span>{previewText}</span>
      </button>
      {expanded && (
        <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
          {formattedJson}
        </pre>
      )}
    </div>
  );
};

export function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [formData, setFormData] = useState({
    configKey: '',
    configValue: '',
    configType: '',
    description: '',
  });

  // 加载配置列表
  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await systemConfigService.getAllConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to load configs:', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 打开新增对话框
  const handleAdd = () => {
    setEditingConfig(null);
    setFormData({
      configKey: '',
      configValue: '',
      configType: 'temu',
      description: '',
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    setFormData({
      configKey: config.configKey,
      // 敏感配置不显示原值，需要用户重新输入
      configValue: isSensitiveKey(config.configKey) ? '' : config.configValue,
      configType: config.configType || '',
      description: config.description || '',
    });
    setIsDialogOpen(true);
  };

  // 保存配置
  const handleSave = async () => {
    if (!formData.configKey.trim()) {
      toast.error('请输入配置键名');
      return;
    }

    // 对于敏感配置，如果编辑时值为空，表示不修改
    const isSensitive = isSensitiveKey(formData.configKey);
    const isEditing = !!editingConfig;

    if (!formData.configValue.trim() && !(isSensitive && isEditing)) {
      toast.error('请输入配置值');
      return;
    }

    try {
      if (editingConfig) {
        // 更新 - 敏感配置如果值为空则不更新 configValue
        if (isSensitive && !formData.configValue.trim()) {
          // 只更新描述和类型，不更新值
          const updateData: UpdateSystemConfigRequest = {
            configValue: editingConfig.configValue, // 保持原值
            configType: formData.configType.trim() || undefined,
            description: formData.description.trim() || undefined,
          };
          await systemConfigService.updateConfig(editingConfig.id, updateData);
          toast.success('更新成功（值未修改）');
        } else {
          const updateData: UpdateSystemConfigRequest = {
            configValue: formData.configValue.trim(),
            configType: formData.configType.trim() || undefined,
            description: formData.description.trim() || undefined,
          };
          await systemConfigService.updateConfig(editingConfig.id, updateData);
          toast.success('更新成功');
        }
      } else {
        // 新增
        const createData: CreateSystemConfigRequest = {
          configKey: formData.configKey.trim(),
          configValue: formData.configValue.trim(),
          configType: formData.configType.trim() || undefined,
          description: formData.description.trim() || undefined,
        };
        await systemConfigService.createConfig(createData);
        toast.success('创建成功');
      }
      setIsDialogOpen(false);
      loadConfigs();
    } catch (error: any) {
      console.error('Failed to save config:', error);
      toast.error(error.response?.data?.error || '操作失败');
    }
  };

  // 删除配置
  const handleDelete = async (id: string, key: string) => {
    if (!confirm(`确定要删除配置"${key}"吗？`)) {
      return;
    }

    try {
      await systemConfigService.deleteConfig(id);
      toast.success('删除成功');
      loadConfigs();
    } catch (error) {
      console.error('Failed to delete config:', error);
      toast.error('删除失败');
    }
  };

  // 按类型分组配置
  const groupedConfigs = configs.reduce((groups, config) => {
    const type = config.configType || '其他';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(config);
    return groups;
  }, {} as Record<string, SystemConfig[]>);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">系统配置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理系统配置项，如Temu平台固定参数等
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          新增配置
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">暂无配置，点击"新增配置"开始添加</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedConfigs).map(([type, typeConfigs]) => (
            <div key={type} className="bg-card rounded-lg border">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="font-medium">
                  {type === 'temu' ? 'Temu平台配置' : type}
                </h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left p-3 font-medium">配置键</th>
                    <th className="text-left p-3 font-medium">配置值</th>
                    <th className="text-left p-3 font-medium">描述</th>
                    <th className="text-center p-3 font-medium w-32">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {typeConfigs.map((config) => (
                    <tr key={config.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {config.configKey}
                        </code>
                      </td>
                      <td className="p-3">
                        {isSensitiveKey(config.configKey) ? (
                          <span className="font-mono text-sm text-muted-foreground">••••••••••••</span>
                        ) : (
                          <JsonValuePreview value={config.configValue} />
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-sm">
                        {config.description || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(config)}
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(config.id, config.configKey)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig ? '编辑配置' : '新增配置'}</DialogTitle>
            <DialogDescription>
              {editingConfig ? '修改系统配置项' : '添加新的系统配置项'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="configKey">配置键名 *</Label>
              <Input
                id="configKey"
                value={formData.configKey}
                onChange={(e) => setFormData({ ...formData, configKey: e.target.value })}
                placeholder="如: temu_variant_name"
                disabled={!!editingConfig}
              />
              {editingConfig && (
                <p className="text-xs text-muted-foreground">配置键名不可修改</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="configValue">
                  配置值 {editingConfig && isSensitiveKey(formData.configKey) ? '' : '*'}
                </Label>
                {isValidJson(formData.configValue) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, configValue: formatJson(formData.configValue) })}
                  >
                    格式化 JSON
                  </Button>
                )}
              </div>
              <Textarea
                id="configValue"
                value={formData.configValue}
                onChange={(e) => setFormData({ ...formData, configValue: e.target.value })}
                placeholder={
                  editingConfig && isSensitiveKey(formData.configKey)
                    ? "留空表示保持原值不变，输入新值则更新"
                    : "请输入配置值（支持 JSON 格式）"
                }
                className="font-mono text-sm min-h-[120px]"
              />
              {editingConfig && isSensitiveKey(formData.configKey) && (
                <p className="text-xs text-amber-600">
                  🔒 敏感配置：原值已隐藏。留空将保持原值，输入新值将覆盖原值。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="configType">配置类型</Label>
              <Input
                id="configType"
                value={formData.configType}
                onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                placeholder="如: temu, general"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="配置项的用途说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
