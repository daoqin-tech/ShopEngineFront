import * as React from "react"
import {
  Package,
  ShoppingCart,
  Wrench,
  Layers,
  Settings,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/contexts/AuthContext"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar>

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { user } = useAuth()

  // 导航菜单 - 按工作流程排序
  const getNavItems = () => {
    return [
      {
        title: "产品制作",
        url: "/workspace",
        icon: Package,
        isActive: true,
        items: [
          {
            title: "生成产品图",
            url: "/workspace/product-images",
          },
          {
            title: "生成商品图",
            url: "/workspace/cover-generation",
          },
        ],
      },
      {
        title: "Temu",
        url: "/workspace/product-management",
        icon: ShoppingCart,
        isActive: false,
        items: [
          {
            title: "批量上架",
            url: "/workspace/batch-upload/create",
          },
          {
            title: "上架记录",
            url: "/workspace/batch-upload",
          },
          {
            title: "销量分析",
            url: "/workspace/order-stats",
          },
          {
            title: "店铺管理",
            url: "/workspace/settings/temu-shops",
          },
          {
            title: "上架类目",
            url: "/workspace/settings/temu-templates",
          },
          {
            title: "标题模板",
            url: "/workspace/settings/temu-title-templates",
          },
        ],
      },
      {
        title: "辅助工具",
        url: "/workspace/tools",
        icon: Wrench,
        isActive: false,
        items: [
          {
            title: "智能识图",
            url: "/workspace/ocr",
          },
          {
            title: "AI编辑图片",
            url: "/workspace/image-edit-projects",
          },
        ],
      },
      {
        title: "模板管理",
        url: "/workspace/template-management",
        icon: Layers,
        isActive: false,
        items: [
          {
            title: "套图模板",
            url: "/workspace/template-management",
          },
          {
            title: "图片模板",
            url: "/workspace/image-templates",
          },
        ],
      },
      {
        title: "系统设置",
        url: "/workspace/settings",
        icon: Settings,
        isActive: false,
        items: [
          {
            title: "产品分类",
            url: "/workspace/settings/categories",
          },
          {
            title: "系统参数",
            url: "/workspace/settings/system-config",
          },
        ],
      },
    ]
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-3 py-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">ShopEngine</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavItems()} />
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
