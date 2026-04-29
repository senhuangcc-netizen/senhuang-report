'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  allowCustom?: boolean
  label?: string
  onDeleteOption?: (v: string) => void  // if provided, all options show delete button
  onAddCustom?: (v: string) => void
}

export default function SearchableSelect({ options, value, onChange, placeholder = '搜尋或選擇...', allowCustom, label, onDeleteOption, onAddCustom }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // reset pendingDelete when dropdown closes
  useEffect(() => {
    if (!open) { setPendingDelete(null); if (pendingTimer.current) clearTimeout(pendingTimer.current) }
  }, [open])

  const handleDeleteClick = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation()
    if (pendingDelete === opt) {
      onDeleteOption!(opt)
      setPendingDelete(null)
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
    } else {
      setPendingDelete(opt)
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      pendingTimer.current = setTimeout(() => setPendingDelete(null), 2500)
    }
  }

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full text-left border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white hover:border-amber-500 focus:outline-none focus:border-amber-500 truncate"
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              type="text"
              placeholder="搜尋..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-amber-500 text-gray-900"
            />
          </div>
          <ul className="overflow-y-auto max-h-48">
            {filtered.map(opt => {
              const isPending = pendingDelete === opt
              return (
                <li key={opt} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false) }}
                    className={`flex-1 text-left px-3 py-2 text-sm text-gray-900 hover:bg-amber-50 ${value === opt ? 'bg-amber-100 font-medium' : ''}`}
                  >
                    {opt}
                  </button>
                  {onDeleteOption && (
                    <button
                      type="button"
                      onClick={e => handleDeleteClick(e, opt)}
                      className={`px-2 py-2 text-base leading-none shrink-0 transition-colors ${
                        isPending ? 'text-red-500 font-bold' : 'text-gray-300 hover:text-red-400'
                      }`}
                      title={isPending ? '再按一次確認刪除' : '刪除此選項'}
                    >
                      {isPending ? '確認？' : '×'}
                    </button>
                  )}
                </li>
              )
            })}
            {allowCustom && search && !options.includes(search) && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onAddCustom) onAddCustom(search)
                    else onChange(search)
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-700"
                >
                  + 新增「{search}」
                </button>
              </li>
            )}
            {filtered.length === 0 && !allowCustom && (
              <li className="px-3 py-2 text-sm text-gray-400">無符合項目</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
