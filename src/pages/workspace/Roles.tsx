import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { workspaceService, WorkspaceRole, Permission } from '@/services/workspaceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface RoleFormData {
  name: string;
  description: string;
  dataScope: 'all' | 'workspace' | 'self';
  permissionIds: string[];
}

const initialFormData: RoleFormData = {
  name: '',
  description: '',
  dataScope: 'self',
  permissionIds: [],
};

const dataScopeOptions = [
  { value: 'self', label: '仅自己的数据', description: '只能看到自己创建的数据' },
  { value: 'workspace', label: '工作空间数据', description: '可以看到工作空间内所有成员的数据' },
  { value: 'all', label: '全部数据', description: '可以看到所有数据（跨工作空间）' },
];

export function Roles() {
  const { currentWorkspace, hasPermission } = useWorkspace();
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkspaceRole | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<WorkspaceRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageRoles = hasPermission('workspace:role:manage') || currentWorkspace?.isOwner;

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace?.id]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        workspaceService.getRoles(currentWorkspace.id),
        workspaceService.getAllPermissions(),
      ]);
      setRoles(rolesRes.roles || []);
      setPermissions(permissionsRes.permissions || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 按资源分组权限
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const key = perm.resource;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const resourceLabels: Record<string, string> = {
    'menu': '菜单权限',
    'project': '项目管理',
    'template': '模板管理',
    'product': '产品管理',
    'workspace': '工作空间管理',
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (role: WorkspaceRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      dataScope: role.dataScope,
      permissionIds: role.permissionIds || [],
    });
    setIsDialogOpen(true);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleToggleAllInGroup = (resourcePerms: Permission[]) => {
    const permIds = resourcePerms.map(p => p.id);
    const allSelected = permIds.every(id => formData.permissionIds.includes(id));

    setFormData(prev => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter(id => !permIds.includes(id))
        : [...new Set([...prev.permissionIds, ...permIds])],
    }));
  };

  const handleSave = async () => {
    if (!currentWorkspace) return;
    if (!formData.name.trim()) {
      toast.error('角色名称不能为空');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRole) {
        await workspaceService.updateRole(currentWorkspace.id, editingRole.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          dataScope: formData.dataScope,
          permissionIds: formData.permissionIds,
        });
        toast.success('角色已更新');
      } else {
        await workspaceService.createRole(currentWorkspace.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          dataScope: formData.dataScope,
          permissionIds: formData.permissionIds,
        });
        toast.success('角色已创建');
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('保存失败:', error);
      toast.error(error.response?.data?.error || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace || !roleToDelete) return;

    setIsDeleting(true);
    try {
      await workspaceService.deleteRole(currentWorkspace.id, roleToDelete.id);
      toast.success('角色已删除');
      setRoleToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('删除失败:', error);
      toast.error(error.response?.data?.error || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDataScopeLabel = (scope: string) => {
    const option = dataScopeOptions.find(o => o.value === scope);
    return option?.label || scope;
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">请先选择一个工作空间</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">角色管理</h1>
        {canManageRoles && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新建
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>角色名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>数据范围</TableHead>
              <TableHead>权限数</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无角色
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {role.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getDataScopeLabel(role.dataScope)}</Badge>
                  </TableCell>
                  <TableCell>{role.permissionIds?.length || 0}</TableCell>
                  <TableCell>
                    {role.isSystem ? (
                      <Badge variant="secondary">系统</Badge>
                    ) : (
                      <Badge variant="outline">自定义</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canManageRoles && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRoleToDelete(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 创建/编辑角色对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? '编辑角色' : '创建角色'}
            </DialogTitle>
            <DialogDescription>
              设置角色的基本信息和权限
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">角色名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入角色名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataScope">数据范围</Label>
                <Select
                  value={formData.dataScope}
                  onValueChange={(value: 'all' | 'workspace' | 'self') =>
                    setFormData(prev => ({ ...prev, dataScope: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataScopeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="输入角色描述（可选）"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>权限配置</Label>
              <Accordion type="multiple" className="w-full">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <AccordionItem key={resource} value={resource}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>{resourceLabels[resource] || resource}</span>
                        <Badge variant="secondary">
                          {perms.filter(p => formData.permissionIds.includes(p.id)).length}/{perms.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`select-all-${resource}`}
                            checked={perms.every(p => formData.permissionIds.includes(p.id))}
                            onCheckedChange={() => handleToggleAllInGroup(perms)}
                          />
                          <Label
                            htmlFor={`select-all-${resource}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            全选
                          </Label>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {perms.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-start space-x-2 p-2 border rounded-lg"
                            >
                              <Checkbox
                                id={perm.id}
                                checked={formData.permissionIds.includes(perm.id)}
                                onCheckedChange={() => handlePermissionToggle(perm.id)}
                              />
                              <div className="space-y-1">
                                <Label
                                  htmlFor={perm.id}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {perm.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {perm.code}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingRole ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色？</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除角色 "{roleToDelete?.name}" 吗？使用此角色的成员将需要重新分配角色。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
