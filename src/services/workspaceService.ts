import { apiClient } from '@/lib/api';

// 类型定义
export interface Workspace {
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

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'invited' | 'disabled';
  joinedAt: string;
  invitedBy: string;
}

export interface WorkspaceRole {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  isSystem: boolean;
  dataScope: 'all' | 'workspace' | 'self';
  permissionIds: string[];
  sortOrder: number;
  createdAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'menu' | 'operation';
  resource: string;
  action: string;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  inviteCode: string;
  roleId: string;
  roleName: string;
  inviterName: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
}

export interface InvitationInfo {
  workspaceId: string;
  workspaceName: string;
  workspaceLogo: string;
  roleName: string;
  inviterName: string;
  expiresAt: string;
}

// 工作空间 API
export const workspaceService = {
  // 获取工作空间列表
  async getWorkspaces(): Promise<{ workspaces: Workspace[] }> {
    return apiClient.get('/workspaces');
  },

  // 获取工作空间详情
  async getWorkspace(id: string): Promise<Workspace> {
    return apiClient.get(`/workspaces/${id}`);
  },

  // 创建工作空间
  async createWorkspace(data: { name: string; description?: string }): Promise<Workspace> {
    return apiClient.post('/workspaces', data);
  },

  // 更新工作空间
  async updateWorkspace(id: string, data: { name?: string; description?: string; logoUrl?: string }): Promise<Workspace> {
    return apiClient.put(`/workspaces/${id}`, data);
  },

  // 删除工作空间
  async deleteWorkspace(id: string): Promise<void> {
    return apiClient.delete(`/workspaces/${id}`);
  },

  // 获取成员列表
  async getMembers(workspaceId: string): Promise<{ members: WorkspaceMember[] }> {
    const response: any = await apiClient.get(`/workspaces/${workspaceId}/members`);
    return response.data || { members: [] };
  },

  // 更新成员角色
  async updateMemberRole(workspaceId: string, userId: string, roleId: string): Promise<void> {
    return apiClient.put(`/workspaces/${workspaceId}/members/${userId}/role`, { roleId });
  },

  // 移除成员
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    return apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  // 退出工作空间（自己退出）
  async leaveWorkspace(workspaceId: string): Promise<void> {
    return apiClient.post(`/workspaces/${workspaceId}/leave`);
  },

  // 获取角色列表
  async getRoles(workspaceId: string): Promise<{ roles: WorkspaceRole[] }> {
    const response: any = await apiClient.get(`/workspaces/${workspaceId}/roles`);
    return response.data || { roles: [] };
  },

  // 创建角色
  async createRole(workspaceId: string, data: {
    name: string;
    description?: string;
    dataScope: 'all' | 'workspace' | 'self';
    permissionIds: string[];
  }): Promise<WorkspaceRole> {
    return apiClient.post(`/workspaces/${workspaceId}/roles`, data);
  },

  // 更新角色
  async updateRole(workspaceId: string, roleId: string, data: {
    name?: string;
    description?: string;
    dataScope?: 'all' | 'workspace' | 'self';
    permissionIds?: string[];
  }): Promise<WorkspaceRole> {
    return apiClient.put(`/workspaces/${workspaceId}/roles/${roleId}`, data);
  },

  // 删除角色
  async deleteRole(workspaceId: string, roleId: string): Promise<void> {
    return apiClient.delete(`/workspaces/${workspaceId}/roles/${roleId}`);
  },

  // 生成邀请链接
  async createInvitation(workspaceId: string, roleId: string, expiresInDays: number = 7): Promise<{ inviteCode: string; inviteUrl: string }> {
    const response: any = await apiClient.post(`/workspaces/${workspaceId}/invite`, { roleId, expiresInDays });
    return response.data || {};
  },

  // 获取邀请信息
  async getInvitationInfo(inviteCode: string): Promise<InvitationInfo> {
    const response: any = await apiClient.get(`/invitations/${inviteCode}`);
    return response.data || {};
  },

  // 接受邀请
  async acceptInvitation(inviteCode: string): Promise<{ workspaceId: string }> {
    const response: any = await apiClient.post(`/invitations/${inviteCode}/accept`);
    return response.data || {};
  },

  // 获取所有权限点
  async getAllPermissions(): Promise<{ permissions: Permission[] }> {
    const response: any = await apiClient.get('/permissions');
    return response.data || { permissions: [] };
  },

  // 获取当前用户权限
  async getMyPermissions(): Promise<{ permissions: string[]; dataScope: string }> {
    return apiClient.get('/permissions/me');
  },
};
