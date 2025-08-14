import * as React from "react"
import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspaceId?: string
}

// This is sample data.
const userData = {
  name: "shadcn",
  email: "m@example.com",
  avatar: "/avatars/shadcn.jpg",
}

const teams = [
  {
    name: "电商引擎",
    logo: GalleryVerticalEnd,
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: AudioWaveform,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: Command,
    plan: "Free",
  },
]

export function AppSidebar({ workspaceId, ...props }: AppSidebarProps) {
  // 根据是否在工作区中动态生成导航菜单
  const getNavItems = () => {
    if (!workspaceId) return []
    
    const basePath = `/workspace/${workspaceId}`
    
    return [
      {
        title: "图片素材制作",
        url: `${basePath}/materials`,
        icon: SquareTerminal,
        isActive: true,
        items: [
          {
            title: "AI商品制图",
            url: `${basePath}/materials/product-images`,
          },
          {
            title: "商品图优化",
            url: `${basePath}/materials/image-editor`,
          },
        ],
      },
    ]
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavItems()} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
