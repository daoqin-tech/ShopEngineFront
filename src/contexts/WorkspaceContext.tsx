import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

// 类型定义
interface Workspace {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  ownerId: string;
  isOwner: boolean;
  roleId: string;
  roleName: string;
  dataScope: 'all' | 'workspace' | 'self';
  createdAt: string;
}

interface MenuItem {
  id: string;
  code: string;
  name: string;
  path: string;
  icon: string;
  parentId: string | null;
  children?: MenuItem[];
}

interface WorkspaceContextType {
  // 工作空间状态
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;

  // 权限状态
  permissions: string[];
  dataScope: 'all' | 'workspace' | 'self';
  menus: MenuItem[];

  // 方法
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  hasAllPermissions: (permissionCodes: string[]) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState<'all' | 'workspace' | 'self'>('self');
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取工作空间列表
  const refreshWorkspaces = useCallback(async () => {
    try {
      const response = await apiClient.get('/workspaces');
      const list = response.data?.workspaces || [];
      setWorkspaces(list);
      return list;
    } catch (error) {
      console.error('获取工作空间列表失败:', error);
      return [];
    }
  }, []);

  // 获取当前工作空间的权限
  const fetchPermissions = useCallback(async (workspaceId: string) => {
    try {
      const response = await apiClient.get('/permissions/me', {
        headers: { 'X-Workspace-ID': workspaceId }
      });
      const data = response.data;
      setPermissions(data.permissions || []);
      setDataScope(data.dataScope || 'self');
    } catch (error) {
      console.error('获取权限失败:', error);
      setPermissions([]);
    }
  }, []);

  // 获取菜单
  const fetchMenus = useCallback(async (workspaceId: string) => {
    try {
      const response = await apiClient.get('/permissions/menus', {
        headers: { 'X-Workspace-ID': workspaceId }
      });
      setMenus(response.data?.menus || []);
    } catch (error) {
      console.error('获取菜单失败:', error);
      setMenus([]);
    }
  }, []);

  // 切换工作空间
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    setIsLoading(true);
    try {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
        localStorage.setItem('currentWorkspaceId', workspaceId);

        // 更新 API 客户端的默认 header
        apiClient.defaults.headers.common['X-Workspace-ID'] = workspaceId;

        // 获取权限和菜单
        await Promise.all([
          fetchPermissions(workspaceId),
          fetchMenus(workspaceId)
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspaces, fetchPermissions, fetchMenus]);

  // 创建工作空间
  const createWorkspace = useCallback(async (name: string, description?: string): Promise<Workspace> => {
    const response = await apiClient.post('/workspaces', { name, description });
    const newWorkspace = response.data;

    // 刷新工作空间列表
    await refreshWorkspaces();

    // 切换到新创建的工作空间
    await switchWorkspace(newWorkspace.id);

    return newWorkspace;
  }, [refreshWorkspaces, switchWorkspace]);

  // 权限检查方法
  const hasPermission = useCallback((permissionCode: string) => {
    return permissions.includes(permissionCode);
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionCodes: string[]) => {
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions]);

  const hasAllPermissions = useCallback((permissionCodes: string[]) => {
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions]);

  // 初始化
  useEffect(() => {
    const init = async () => {
      // 检查是否有 token
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const list = await refreshWorkspaces();

        if (list.length > 0) {
          // 尝试从 localStorage 恢复上次选择的工作空间
          const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
          const targetWorkspace = list.find((w: Workspace) => w.id === savedWorkspaceId) || list[0];

          setCurrentWorkspace(targetWorkspace);
          localStorage.setItem('currentWorkspaceId', targetWorkspace.id);
          apiClient.defaults.headers.common['X-Workspace-ID'] = targetWorkspace.id;

          // 获取权限和菜单
          await Promise.all([
            fetchPermissions(targetWorkspace.id),
            fetchMenus(targetWorkspace.id)
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [refreshWorkspaces, fetchPermissions, fetchMenus]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      isLoading,
      permissions,
      dataScope,
      menus,
      switchWorkspace,
      refreshWorkspaces,
      createWorkspace,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
