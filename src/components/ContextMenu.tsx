import { useEffect, useRef } from 'react'
import { Copy, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ContextMenuProps {
  isOpen: boolean
  x: number
  y: number
  onClose: () => void
  items: ContextMenuItem[]
}

interface ContextMenuItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
  separator?: boolean
}

export function ContextMenu({ isOpen, x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-48"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.separator ? (
            <Separator className="my-1" />
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 h-auto text-left rounded-none"
              onClick={() => {
                item.onClick()
                onClose()
              }}
              disabled={item.disabled}
            >
              {item.icon && <item.icon className="w-4 h-4 mr-3" />}
              {item.label}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

// 预定义的菜单项
export const createLayerContextMenu = (
  onEdit: () => void,
  onDuplicate: () => void,
  onDelete: () => void
): ContextMenuItem[] => [
  {
    label: '编辑',
    icon: Edit,
    onClick: onEdit
  },
  {
    label: '复制',
    icon: Copy,
    onClick: onDuplicate
  },
  {
    separator: true,
    label: '',
    onClick: () => {}
  },
  {
    label: '删除',
    icon: Trash2,
    onClick: onDelete
  }
]