import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WorkspaceLayout } from "@/components/WorkspaceLayout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AuthProvider } from "@/contexts/AuthContext"
import { Home } from "@/pages/Home"
import { Login } from "@/pages/Login"
import { WechatCallback } from "@/pages/WechatCallback"
import { NotFound } from "@/pages/NotFound"
import { AIImageProjects } from "@/pages/AIImageProjects"
import { AIImageGenerator } from "@/pages/AIImageGenerator"
import { OCRRecognition } from "@/pages/OCRRecognition"
import { Toaster } from "sonner"

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/wechat/callback" element={<WechatCallback />} />
          <Route path="/" element={<Home />} />
          
          <Route path="/workspace" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <AIImageProjects />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/product-images" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <AIImageProjects />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/project/:projectId/edit" element={
            <ProtectedRoute>
              <AIImageGenerator />
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/ocr-recognition" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <OCRRecognition />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </Router>
    </AuthProvider>
  )
}

export default App