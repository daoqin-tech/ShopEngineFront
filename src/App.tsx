import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
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
import { ImageEditor } from "@/pages/ImageEdit"
import { ImageEditProjects } from "@/pages/ImageEditProjects"
import { OcrEditor } from "@/pages/Ocr"
import { OcrProjects } from "@/pages/OcrProjects"
import { TemplateManagement } from "@/pages/TemplateManagement"
import { CoverProjects } from "@/pages/CoverProjects"
import { TemplateSelection } from "@/pages/TemplateSelection"
import { TemplateEditor } from "@/pages/TemplateEditor"
import { CoverEditor } from "@/pages/CoverEditor"
import { Toaster } from "sonner"

// 模板选择页面包装器，用于从路由参数获取projectId
function TemplateSelectionWrapper() {
  const { projectId } = useParams<{ projectId: string }>()
  return <TemplateSelection projectId={projectId || ""} />
}

// 模板编辑器包装器
function TemplateEditorWrapper() {
  return <TemplateEditor />
}

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
          
          <Route path="/workspace/ocr-projects" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <OcrProjects />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/ocr-project/:projectId" element={
            <ProtectedRoute>
              <OcrEditor />
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/image-edit-projects" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <ImageEditProjects />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/image-edit-project/:projectId/edit" element={
            <ProtectedRoute>
              <ImageEditor />
            </ProtectedRoute>
          } />

          <Route path="/workspace/template-management" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <TemplateManagement />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/cover-projects" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <CoverProjects />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/cover-project/:projectId/template-selection" element={
            <ProtectedRoute>
              <TemplateSelectionWrapper />
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/template/:templateId" element={
            <ProtectedRoute>
              <TemplateEditorWrapper />
            </ProtectedRoute>
          } />
          
          <Route path="/workspace/cover-project/:projectId/edit" element={
            <ProtectedRoute>
              <CoverEditor />
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