import * as React from "react"
import { ChevronsUpDown, Plus, Building2, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspace } from "@/contexts/WorkspaceContext"

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    createWorkspace,
    isLoading
  } = useWorkspace()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      await createWorkspace(newWorkspaceName.trim(), newWorkspaceDescription.trim())
      setIsCreateDialogOpen(false)
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
    } catch (error) {
      console.error("创建工作空间失败:", error)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading || !currentWorkspace) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">加载中...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {currentWorkspace.logoUrl ? (
                    <img
                      src={currentWorkspace.logoUrl}
                      alt=""
                      className="size-4 rounded"
                    />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {currentWorkspace.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentWorkspace.roleName}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                工作空间
              </DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => switchWorkspace(workspace.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {workspace.logoUrl ? (
                      <img
                        src={workspace.logoUrl}
                        alt=""
                        className="size-4 rounded"
                      />
                    ) : (
                      <Building2 className="size-3.5 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{workspace.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {workspace.roleName}
                    </div>
                  </div>
                  {workspace.id === currentWorkspace.id && (
                    <Check className="size-4 text-green-500" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  创建工作空间
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* 创建工作空间对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>创建工作空间</DialogTitle>
            <DialogDescription>
              创建一个新的工作空间来组织你的团队和项目
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="输入工作空间名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Textarea
                id="description"
                value={newWorkspaceDescription}
                onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                placeholder="输入工作空间描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim() || isCreating}
            >
              {isCreating ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
