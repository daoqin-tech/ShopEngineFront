import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { workspaceService, WorkspaceMember, WorkspaceRole } from '@/services/workspaceService';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Link2, Copy, Trash2, Loader2 } from 'lucide-react';

export function Members() {
  const { currentWorkspace, hasPermission } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const canManageMembers = hasPermission('workspace:member:invite') || currentWorkspace?.isOwner;

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace?.id]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        workspaceService.getMembers(currentWorkspace.id),
        workspaceService.getRoles(currentWorkspace.id),
      ]);
      setMembers(membersRes.members || []);
      setRoles(rolesRes.roles || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (member: WorkspaceMember, newRoleId: string) => {
    if (!currentWorkspace) return;

    try {
      await workspaceService.updateMemberRole(currentWorkspace.id, member.userId, newRoleId);
      toast.success('角色已更新');
      loadData();
    } catch (error: any) {
      console.error('更新角色失败:', error);
      toast.error(error.response?.data?.error || '更新角色失败');
    }
  };

  const handleGenerateInviteLink = async () => {
    if (!currentWorkspace || !inviteRoleId) return;

    setIsGeneratingLink(true);
    try {
      const result = await workspaceService.createInvitation(currentWorkspace.id, inviteRoleId);
      // 始终使用完整 URL（包含域名）
      setInviteLink(`${window.location.origin}/invite/${result.inviteCode}`);
    } catch (error: any) {
      console.error('生成邀请链接失败:', error);
      toast.error(error.response?.data?.error || '生成邀请链接失败');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleRemoveMember = async () => {
    if (!currentWorkspace || !memberToRemove) return;

    setIsRemoving(true);
    try {
      await workspaceService.removeMember(currentWorkspace.id, memberToRemove.userId);
      toast.success('成员已移除');
      setMemberToRemove(null);
      loadData();
    } catch (error: any) {
      console.error('移除成员失败:', error);
      toast.error(error.response?.data?.error || '移除成员失败');
    } finally {
      setIsRemoving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">活跃</Badge>;
      case 'invited':
        return <Badge variant="secondary">已邀请</Badge>;
      case 'disabled':
        return <Badge variant="destructive">已禁用</Badge>;
      default:
        return null;
    }
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
        <h1 className="text-xl font-semibold">成员管理</h1>
        {canManageMembers && (
          <Button onClick={() => {
            setInviteLink('');
            setInviteRoleId('');
            setIsInviteDialogOpen(true);
          }}>
            <UserPlus className="h-4 w-4 mr-2" />
            邀请成员
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>成员</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>加入时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  暂无成员
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.userAvatar} />
                        <AvatarFallback>{member.userName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.userName}</span>
                      {member.userId === currentWorkspace.ownerId && (
                        <Badge variant="secondary">所有者</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManageMembers && member.userId !== currentWorkspace.ownerId ? (
                      <Select
                        value={member.roleId}
                        onValueChange={(value) => handleRoleChange(member, value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{member.roleName}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageMembers && member.userId !== currentWorkspace.ownerId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 邀请对话框 */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
            <DialogDescription>
              生成邀请链接，分享给想要加入的成员
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择角色</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择邀请成员的角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => !r.isSystem || r.name !== '所有者').map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!inviteLink ? (
              <Button
                onClick={handleGenerateInviteLink}
                disabled={!inviteRoleId || isGeneratingLink}
                className="w-full"
              >
                {isGeneratingLink ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                生成邀请链接
              </Button>
            ) : (
              <div className="space-y-2">
                <Label>邀请链接（7天有效）</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly />
                  <Button variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除成员确认 */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除成员？</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将 "{memberToRemove?.userName}" 从工作空间中移除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? '移除中...' : '确认移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
