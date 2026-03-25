import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ShortcutOptions {
  onSearch: () => void
  onNewTicket?: () => void
  onHelp: () => void
}

const NAV_KEYS: Record<string, string> = {
  d: '/dashboard',
  w: '/dashboard/weekly',
  s: '/dashboard/sprint',
  a: '/dashboard/analytics',
}

export function useKeyboardShortcuts({ onSearch, onNewTicket, onHelp }: ShortcutOptions) {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Cmd/Ctrl+K → search (fires even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onSearch()
        return
      }

      if (typing) return

      // ? → help
      if (e.key === '?') {
        e.preventDefault()
        onHelp()
        return
      }

      // n → new ticket
      if (e.key === 'n' && onNewTicket) {
        e.preventDefault()
        onNewTicket()
        return
      }

      // d/w/s/a → navigation
      if (NAV_KEYS[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        router.push(NAV_KEYS[e.key])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, onSearch, onNewTicket, onHelp])
}

export const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['D'], description: 'Go to Daily view' },
      { keys: ['W'], description: 'Go to Weekly view' },
      { keys: ['S'], description: 'Go to Sprint view' },
      { keys: ['A'], description: 'Go to Analytics' },
    ],
  },
  {
    label: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open search' },
      { keys: ['N'], description: 'New ticket (Sprint view)' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
]
