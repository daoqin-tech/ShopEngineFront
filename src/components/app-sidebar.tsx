import * as React from "react"
import {
  Package,
  ShoppingCart,
  Wrench,
  Layers,
  Settings,
  Building2,
  Users,
  Shield,
  LucideIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/contexts/AuthContext"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar>

// 图标映射
const iconMap: Record<string, LucideIcon> = {
  'Package': Package,
  'ShoppingCart': ShoppingCart,
  'Wrench': Wrench,
  'Layers': Layers,
  'Settings': Settings,
  'Building2': Building2,
  'Users': Users,
  'Shield': Shield,
}

// 默认菜单（用于没有工作空间或权限系统未启用时）
const defaultNavItems = [
  {
    title: "产品制作",
    url: "/workspace",
    icon: Package,
    isActive: true,
    items: [
      { title: "生成产品图", url: "/workspace/product-images" },
      { title: "生成商品图", url: "/workspace/cover-generation" },
    ],
  },
  {
    title: "商品上架",
    url: "/workspace/product-management",
    icon: ShoppingCart,
    isActive: false,
    items: [
      { title: "创建商品", url: "/workspace/batch-upload/create" },
      { title: "商品列表", url: "/workspace/batch-upload" },
    ],
  },
  {
    title: "辅助工具",
    url: "/workspace/tools",
    icon: Wrench,
    isActive: false,
    items: [
      { title: "智能识图", url: "/workspace/ocr" },
      { title: "AI编辑图片", url: "/workspace/image-edit-projects" },
    ],
  },
  {
    title: "模板管理",
    url: "/workspace/template-management",
    icon: Layers,
    isActive: false,
    items: [
      { title: "套图模板", url: "/workspace/template-management" },
      { title: "图片模板", url: "/workspace/image-templates" },
    ],
  },
  {
    title: "系统设置",
    url: "/workspace/settings",
    icon: Settings,
    isActive: false,
    items: [
      { title: "产品分类", url: "/workspace/settings/categories" },
      { title: "Temu模板", url: "/workspace/settings/temu-templates" },
      { title: "Temu店铺", url: "/workspace/settings/temu-shops" },
      { title: "系统参数", url: "/workspace/settings/system-config" },
    ],
  },
  {
    title: "工作空间",
    url: "/workspace/settings/workspace",
    icon: Building2,
    isActive: false,
    items: [
      { title: "基本设置", url: "/workspace/settings/workspace" },
      { title: "成员管理", url: "/workspace/settings/members" },
      { title: "角色管理", url: "/workspace/settings/roles" },
    ],
  },
]

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { user } = useAuth()
  const { menus, currentWorkspace } = useWorkspace()

  // 将后端菜单数据转换为前端格式
  const navItems = React.useMemo(() => {
    // 如果没有动态菜单数据，使用默认菜单
    if (!menus || menus.length === 0) {
      return defaultNavItems
    }

    // 过滤顶级菜单（parentId 为 null）
    return menus
      .filter(menu => !menu.parentId)
      .map(menu => ({
        title: menu.name,
        url: menu.path,
        icon: iconMap[menu.icon] || Package,
        isActive: false,
        items: menu.children?.map(child => ({
          title: child.name,
          url: child.path,
        })) || [],
      }))
  }, [menus])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {currentWorkspace ? (
          <WorkspaceSwitcher />
        ) : (
          <div className="flex items-center space-x-2 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">ShopEngine</h2>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.name || '未登录',
          avatar: user?.avatar || ''
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
