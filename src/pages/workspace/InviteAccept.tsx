import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { workspaceService, InvitationInfo } from '@/services/workspaceService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Building2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export function InviteAccept() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { switchWorkspace } = useWorkspace();

  const [inviteInfo, setInviteInfo] = useState<InvitationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      loadInviteInfo();
    }
  }, [inviteCode]);

  const loadInviteInfo = async () => {
    if (!inviteCode) return;

    setIsLoading(true);
    setError(null);
    try {
      const info = await workspaceService.getInvitationInfo(inviteCode);
      setInviteInfo(info);
    } catch (error: any) {
      console.error('获取邀请信息失败:', error);
      if (error.response?.status === 404) {
        setError('邀请链接无效或已过期');
      } else {
        setError(error.response?.data?.error || '获取邀请信息失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!inviteCode) return;

    setIsAccepting(true);
    try {
      const result = await workspaceService.acceptInvitation(inviteCode);
      setIsAccepted(true);

      // 切换到新加入的工作空间
      setTimeout(async () => {
        await switchWorkspace(result.workspaceId);
        navigate('/workspace');
      }, 1500);
    } catch (error: any) {
      console.error('接受邀请失败:', error);
      setError(error.response?.data?.error || '接受邀请失败');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = () => {
    // 保存当前邀请链接，登录后返回
    const returnUrl = `/invite/${inviteCode}`;
    navigate(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  // 等待认证状态加载
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 加载邀请信息中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">正在加载邀请信息...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 邀请失败或过期
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center">邀请无效</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 接受成功
  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">加入成功</CardTitle>
            <CardDescription className="text-center">
              您已成功加入 {inviteInfo?.workspaceName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在跳转...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 邀请信息展示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {inviteInfo?.workspaceLogo ? (
              <Avatar className="h-16 w-16">
                <AvatarImage src={inviteInfo.workspaceLogo} />
                <AvatarFallback>
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <CardTitle className="text-center">邀请加入工作空间</CardTitle>
          <CardDescription className="text-center">
            {inviteInfo?.inviterName} 邀请您加入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold">{inviteInfo?.workspaceName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              您将以 <span className="font-medium">{inviteInfo?.roleName}</span> 角色加入
            </p>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            邀请有效期至：{new Date(inviteInfo?.expiresAt || '').toLocaleString()}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {isAuthenticated ? (
            <Button onClick={handleAccept} disabled={isAccepting} className="w-full">
              {isAccepting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              接受邀请
            </Button>
          ) : (
            <>
              <Button onClick={handleLogin} className="w-full">
                登录后加入
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                您需要先登录才能加入工作空间
              </p>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
