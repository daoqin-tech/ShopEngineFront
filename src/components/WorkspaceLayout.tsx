import { useLocation } from 'react-router-dom'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface WorkspaceLayoutProps {
  children: React.ReactNode
  workspaceId: string
}

export function WorkspaceLayout({ children, workspaceId }: WorkspaceLayoutProps) {
  const location = useLocation()
  
  const getBreadcrumbItems = () => {
    const path = location.pathname
    
    // 基础工作区路径
    const basePath = `/workspace/${workspaceId}`
    
    if (path === `${basePath}/materials/product-images`) {
      return {
        parent: { name: '图片素材制作', href: `${basePath}/materials` },
        current: 'AI商品制图'
      }
    } else if (path === `${basePath}/materials/image-editor`) {
      return {
        parent: { name: '图片素材制作', href: `${basePath}/materials` },
        current: '商品图优化'
      }
    } else if (path === `${basePath}/materials`) {
      return {
        parent: null,
        current: '图片素材制作'
      }
    } else if (path === basePath) {
      return {
        parent: null,
        current: '工作台'
      }
    }
    
    return {
      parent: null,
      current: '工作台'
    }
  }

  const breadcrumb = getBreadcrumbItems()

  return (
    <SidebarProvider>
      <AppSidebar workspaceId={workspaceId} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumb.parent && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink href={breadcrumb.parent.href}>
                        {breadcrumb.parent.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumb.current}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}