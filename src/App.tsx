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
import { ImageEditor } from "@/pages/ImageEdit"
import { ImageEditProjects } from "@/pages/ImageEditProjects"
import { OcrEditor } from "@/pages/Ocr"
import { TemplateManagement } from "@/pages/TemplateManagement"
import { CoverGeneration } from "@/pages/CoverGeneration"
import { CoverTaskCreator } from "@/pages/CoverTaskCreator"
import { TemplateEditor } from "@/pages/TemplateEditor"
import { ProductListing } from "@/pages/ProductListing"
import { BatchProductCreator } from "@/pages/BatchProductCreator"
import { Toaster } from "sonner"


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

          <Route path="/workspace/ocr" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <OcrEditor />
              </WorkspaceLayout>
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
          
          <Route path="/workspace/cover-generation" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <CoverGeneration />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />

          <Route path="/workspace/cover-generation/create" element={
            <ProtectedRoute>
              <CoverTaskCreator />
            </ProtectedRoute>
          } />

          <Route path="/workspace/template/:templateId" element={
            <ProtectedRoute>
              <TemplateEditorWrapper />
            </ProtectedRoute>
          } />

          <Route path="/workspace/batch-upload" element={
            <ProtectedRoute>
              <WorkspaceLayout>
                <ProductListing />
              </WorkspaceLayout>
            </ProtectedRoute>
          } />

          <Route path="/workspace/batch-upload/create" element={
            <ProtectedRoute>
              <BatchProductCreator />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" richColors duration={2000} />
      </Router>
    </AuthProvider>
  )
}

export default App