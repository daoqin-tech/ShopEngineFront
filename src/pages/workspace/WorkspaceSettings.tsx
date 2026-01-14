import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { workspaceService } from '@/services/workspaceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Settings, LogOut } from 'lucide-react';

export function WorkspaceSettings() {
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('请输入工作空间名称');
      return;
    }
    setIsCreating(true);
    try {
      await workspaceService.createWorkspace({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDesc.trim(),
      });
      await refreshWorkspaces();
      setCreateDialogOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      toast.success('创建成功');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenSettings = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setSelectedWorkspaceId(workspaceId);
      setEditName(workspace.name);
      setEditDesc(workspace.description || '');
      setSettingsDialogOpen(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedWorkspace) return;
    if (!editName.trim()) {
      toast.error('名称不能为空');
      return;
    }
    setIsSaving(true);
    try {
      await workspaceService.updateWorkspace(selectedWorkspace.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      await refreshWorkspaces();
      setSettingsDialogOpen(false);
      toast.success('保存成功');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveWorkspace = async (workspaceId: string) => {
    try {
      await workspaceService.leaveWorkspace(workspaceId);
      await refreshWorkspaces();
      toast.success('已退出工作空间');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '退出失败');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return;
    setIsDeleting(true);
    try {
      await workspaceService.deleteWorkspace(selectedWorkspace.id);
      await refreshWorkspaces();
      setSettingsDialogOpen(false);
      toast.success('已删除');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    toast.success('已切换');
  };

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">工作空间</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建工作空间</DialogTitle>
              <DialogDescription>创建一个新的工作空间来管理你的团队</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="例如：我的团队"
                />
              </div>
              <div className="space-y-2">
                <Label>描述（可选）</Label>
                <Textarea
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  placeholder="简单描述一下"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreateWorkspace} disabled={isCreating}>
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 工作空间表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  暂无工作空间
                </TableCell>
              </TableRow>
            ) : (
              workspaces.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell className="font-medium">{workspace.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {workspace.isOwner ? '所有者' : workspace.roleName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(workspace.createdAt).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    {currentWorkspace?.id === workspace.id ? (
                      <Badge>当前</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {currentWorkspace?.id !== workspace.id && (
                      <Button variant="outline" size="sm" onClick={() => handleSwitchWorkspace(workspace.id)}>
                        切换
                      </Button>
                    )}
                    {workspace.isOwner ? (
                      <Button variant="outline" size="sm" onClick={() => handleOpenSettings(workspace.id)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认退出？</AlertDialogTitle>
                            <AlertDialogDescription>
                              你将退出工作空间「{workspace.name}」，需要重新被邀请才能加入。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleLeaveWorkspace(workspace.id)}>
                              确认退出
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 设置弹窗 */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>工作空间设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-500 hover:text-red-600 sm:mr-auto">
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将永久删除工作空间及其所有数据，无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteWorkspace} disabled={isDeleting}>
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
