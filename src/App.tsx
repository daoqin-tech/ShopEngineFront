import { BrowserRouter as Router, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { WorkspaceLayout } from "@/components/WorkspaceLayout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AuthProvider } from "@/contexts/AuthContext"
import { Home } from "@/pages/Home"
import { Login } from "@/pages/Login"
import { WechatCallback } from "@/pages/WechatCallback"
import { NotFound } from "@/pages/NotFound"
import { AIImageProjects } from "@/pages/AIImageProjects"
import { AIImageGenerator } from "@/pages/AIImageGenerator"
import { ImageEditor } from "@/pages/ImageEditor"
import { Toaster } from "sonner"

// 工作区路由组件 - 默认工作区为 "default"
function WorkspaceRoutes() {
  const { workspaceId = "default" } = useParams<{ workspaceId: string }>()
  const location = useLocation()

  // Check if current route is AIImageGenerator - render without sidebar
  if (location.pathname.includes('/project/') && location.pathname.endsWith('/edit')) {
    return (
      <Routes>
        <Route path="project/:projectId/edit" element={<AIImageGenerator />} />
      </Routes>
    )
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <Routes>
        <Route path="" element={<AIImageProjects />} />
        <Route path="materials" element={<AIImageProjects />} />
        <Route path="materials/product-images" element={<AIImageProjects />} />
        <Route path="materials/project/:projectId/edit" element={<AIImageGenerator />} />
        <Route path="materials/image-editor" element={<ImageEditor />} />
      </Routes>
    </WorkspaceLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 登录相关路由 - 优先级最高 */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/wechat/callback" element={<WechatCallback />} />
          
          {/* 公共路由 */}
          <Route path="/" element={<Home />} />
          
          {/* 工作区路由 - 直接进入默认工作区 */}
          <Route path="/workspace/*" element={
            <ProtectedRoute>
              <WorkspaceRoutes />
            </ProtectedRoute>
          } />
          
          {/* 404 页面 - 必须放在最后 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </Router>
    </AuthProvider>
  )
}

export default App