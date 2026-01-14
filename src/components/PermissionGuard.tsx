import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  /** 单个权限码 */
  permission?: string;
  /** 多个权限码 */
  permissions?: string[];
  /** 是否需要满足所有权限（默认 false，即满足任一即可） */
  requireAll?: boolean;
  /** 无权限时显示的内容 */
  fallback?: ReactNode;
  /** 有权限时显示的内容 */
  children: ReactNode;
}

/**
 * 权限守卫组件
 * 根据用户权限决定是否渲染子组件
 */
export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useWorkspace();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // 没有指定权限要求，默认允许
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 权限按钮 Hook
 * 返回是否有权限，用于控制按钮显示
 */
export function usePermission(permissionCode: string): boolean {
  const { hasPermission } = useWorkspace();
  return hasPermission(permissionCode);
}

/**
 * 多权限检查 Hook
 */
export function usePermissions(permissionCodes: string[], requireAll = false): boolean {
  const { hasAnyPermission, hasAllPermissions } = useWorkspace();
  return requireAll ? hasAllPermissions(permissionCodes) : hasAnyPermission(permissionCodes);
}
