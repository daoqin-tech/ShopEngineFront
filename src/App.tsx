import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
import { AIImageProjects } from "@/pages/AIImageProjects"
import { AIImageGenerator } from "@/pages/AIImageGenerator"
import { ImageEditor } from "@/pages/ImageEditor"
import { Toaster } from "sonner"

function AppContent() {
  const location = useLocation()
  
  const getBreadcrumbItems = () => {
    const path = location.pathname
    
    if (path === '/materials/product-images') {
      return {
        parent: { name: '图片素材制作', href: '/materials' },
        current: 'AI商品制图'
      }
    } else if (path.startsWith('/materials/project/')) {
      return {
        parent: { name: 'AI商品制图', href: '/materials/product-images' },
        current: 'AI生图'
      }
    } else if (path === '/materials/image-editor') {
      return {
        parent: { name: '图片素材制作', href: '/materials' },
        current: '商品图优化'
      }
    } else if (path === '/materials') {
      return {
        parent: null,
        current: '图片素材制作'
      }
    }
    
    return {
      parent: null,
      current: '首页'
    }
  }

  const breadcrumb = getBreadcrumbItems()

  return (
    <SidebarProvider>
      <AppSidebar />
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
          <Routes>
            <Route path="/" element={<AIImageProjects />} />
            <Route path="/materials" element={<AIImageProjects />} />
            <Route path="/materials/product-images" element={<AIImageProjects />} />
            <Route path="/materials/project/:projectId/edit" element={<AIImageGenerator />} />
            <Route path="/materials/image-editor" element={<ImageEditor />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
      <Toaster position="top-right" richColors />
    </Router>
  )
}

export default App