import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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

// 应用内容组件
function AppContent() {
  const location = useLocation()

  // 检查是否为AI图片生成器页面 - 不显示侧边栏
  if (location.pathname.includes('/project/') && location.pathname.endsWith('/edit')) {
    return (
      <Routes>
        <Route path="/materials/project/:projectId/edit" element={<AIImageGenerator />} />
      </Routes>
    )
  }

  // 其他页面显示侧边栏
  return (
    <WorkspaceLayout>
      <Routes>
        <Route path="/materials" element={<AIImageProjects />} />
        <Route path="/materials/product-images" element={<AIImageProjects />} />
        <Route path="/materials/image-editor" element={<ImageEditor />} />
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
          
          {/* 受保护的应用路由 */}
          <Route path="/materials/*" element={
            <ProtectedRoute>
              <AppContent />
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