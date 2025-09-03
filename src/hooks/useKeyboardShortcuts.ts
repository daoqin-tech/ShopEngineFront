import { useEffect, useCallback } from 'react'

interface KeyboardShortcuts {
  [key: string]: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // 忽略在输入框中的快捷键
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return
    }

    const key = getShortcutKey(event)
    if (shortcuts[key]) {
      event.preventDefault()
      shortcuts[key]()
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

function getShortcutKey(event: KeyboardEvent): string {
  const parts: string[] = []
  
  if (event.ctrlKey || event.metaKey) parts.push('cmd')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey) parts.push('shift')
  
  parts.push(event.key.toLowerCase())
  
  return parts.join('+')
}

// 预定义的快捷键组合
export const SHORTCUTS = {
  SAVE: 'cmd+s',
  UNDO: 'cmd+z',
  REDO: 'cmd+shift+z',
  COPY: 'cmd+c',
  PASTE: 'cmd+v',
  DELETE: 'backspace',
  DUPLICATE: 'cmd+d',
  SELECT_ALL: 'cmd+a',
  ZOOM_IN: 'cmd+=',
  ZOOM_OUT: 'cmd+-',
  ZOOM_RESET: 'cmd+0',
  ESCAPE: 'escape'
} as const