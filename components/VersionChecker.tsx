'use client'
import { useEffect, useState } from 'react'

const CURRENT = process.env.NEXT_PUBLIC_BUILD_VERSION ?? 'dev'
const POLL_MS = 5 * 60 * 1000

export default function VersionChecker() {
  const [outdated, setOutdated] = useState(false)

  useEffect(() => {
    if (CURRENT === 'dev') return

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        const { version } = await res.json()
        if (version && version !== CURRENT) setOutdated(true)
      } catch {
        // ignore network errors
      }
    }

    const timer = setInterval(check, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  if (!outdated) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm w-[calc(100%-2rem)] max-w-sm">
      <span className="flex-1">🔄 系統已更新，建議重新整理</span>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-lg font-medium shrink-0"
      >
        重新整理
      </button>
      <button
        onClick={() => setOutdated(false)}
        className="text-gray-400 hover:text-white text-xl leading-none shrink-0"
        aria-label="關閉"
      >
        ×
      </button>
    </div>
  )
}
