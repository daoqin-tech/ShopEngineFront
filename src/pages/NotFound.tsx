import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export function NotFound() {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate('/workspace')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            404
          </h1>
          <h2 className="text-xl font-semibold text-foreground">
            页面未找到
          </h2>
          <p className="text-muted-foreground max-w-md">
            抱歉，您访问的页面不存在
          </p>
        </div>
        <Button onClick={handleGoBack} className="mt-6">
          返回工作区
        </Button>
      </div>
    </div>
  )
}