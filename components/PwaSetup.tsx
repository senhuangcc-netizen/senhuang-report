'use client'
import { useEffect, useState } from 'react'

// Captures browser's install prompt and shows a one-time install banner.
// After install or dismissal, won't appear again (localStorage flag).

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaSetup() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed,     setDismissed]     = useState(true) // start hidden until we know

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {/* ignore */})
    }
  }, [])

  // Capture install prompt
  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setDismissed(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-install-dismissed', '1')
    }
    setDismissed(true)
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || !installPrompt) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm w-[calc(100%-2rem)] max-w-sm">
      <span className="text-xl shrink-0">📲</span>
      <span className="flex-1">安裝到桌面，離線也能開啟</span>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-lg font-medium shrink-0"
      >
        安裝
      </button>
      <button
        onClick={handleDismiss}
        className="text-gray-400 hover:text-white text-xl leading-none shrink-0"
        aria-label="關閉"
      >
        ×
      </button>
    </div>
  )
}
