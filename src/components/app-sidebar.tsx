import * as React from "react"
import {
  SquareTerminal,
  Layers,
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
  
  // 导航菜单
  const getNavItems = () => {
    return [
      {
        title: "图片素材制作",
        url: "/workspace",
        icon: SquareTerminal,
        isActive: true,
        items: [
          {
            title: "图像生成",
            url: "/workspace/product-images",
          },
          {
            title: "以图识文",
            url: "/workspace/ocr-projects",
          },
          {
            title: "AI编辑图片",
            url: "/workspace/image-edit-projects",
          },
        ],
      },
      {
        title: "模板套图",
        url: "/workspace/template-management",
        icon: Layers,
        isActive: false,
        items: [
          {
            title: "模板管理",
            url: "/workspace/template-management",
          },
          {
            title: "套图项目",
            url: "/workspace/cover-projects",
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
