'use client'
import { useRef, useState } from 'react'

interface Props {
  label: string
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
  allowCustom?: boolean
  onDeleteOption?: (v: string) => void
  onAddPermanent?: (v: string) => void
}

export default function CheckboxGroup({ label, options, values, onChange, onDeleteOption, onAddPermanent }: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [addInput, setAddInput] = useState('')
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt])

  const handleDeleteClick = (e: React.MouseEvent, opt: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (pendingDelete === opt) {
      onDeleteOption!(opt)
      if (values.includes(opt)) onChange(values.filter(v => v !== opt))
      setPendingDelete(null)
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
    } else {
      setPendingDelete(opt)
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      pendingTimer.current = setTimeout(() => setPendingDelete(null), 2500)
    }
  }

  const handleAdd = () => {
    const v = addInput.trim()
    if (!v || options.includes(v)) return
    onAddPermanent!(v)
    setAddInput('')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 space-y-0.5 max-h-52 overflow-y-auto">
        {options.map(opt => {
          const isPending = pendingDelete === opt
          return (
            <div key={opt} className="flex items-center gap-1 hover:bg-white rounded px-1 group">
              <label className="flex items-start gap-2 cursor-pointer flex-1 py-1">
                <input
                  type="checkbox"
                  checked={values.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="mt-0.5 accent-amber-600"
                />
                <span className="text-sm text-gray-700 leading-tight">{opt}</span>
              </label>
              {onDeleteOption && (
                <button
                  type="button"
                  onClick={e => handleDeleteClick(e, opt)}
                  className={`shrink-0 text-xs px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                    isPending
                      ? 'opacity-100 bg-red-50 text-red-500 border border-red-300'
                      : 'text-gray-300 hover:text-red-400'
                  }`}
                  title={isPending ? '再按一次確認刪除' : '刪除此選項'}
                >
                  {isPending ? '確認？' : '×'}
                </button>
              )}
            </div>
          )
        })}

        {/* 永久新增選項 */}
        {onAddPermanent && (
          <div className="flex items-center gap-1 pt-1.5 border-t border-gray-200 mt-1">
            <input
              type="text"
              value={addInput}
              onChange={e => setAddInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
              placeholder="+ 新增選項..."
              className="flex-1 text-sm border border-dashed border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-amber-500 bg-white text-gray-900 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!addInput.trim() || options.includes(addInput.trim())}
              className="text-xs px-2 py-1 bg-amber-50 border border-amber-300 text-amber-700 rounded hover:bg-amber-100 disabled:opacity-40"
            >
              新增
            </button>
          </div>
        )}
      </div>

      {values.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {values.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
              {v}
              <button type="button" onClick={() => toggle(v)} className="hover:text-red-600">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
