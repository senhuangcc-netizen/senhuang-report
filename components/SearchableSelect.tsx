'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  allowCustom?: boolean
  label?: string
}

export default function SearchableSelect({ options, value, onChange, placeholder = '搜尋或選擇...', allowCustom, label }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
              className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-amber-500"
            />
          </div>
          <ul className="overflow-y-auto max-h-48">
            {filtered.map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${value === opt ? 'bg-amber-100 font-medium' : ''}`}
                >
                  {opt}
                </button>
              </li>
            ))}
            {allowCustom && search && !options.includes(search) && (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(search); setOpen(false) }}
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
