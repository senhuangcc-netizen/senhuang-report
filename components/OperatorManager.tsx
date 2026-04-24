'use client'
import { useState } from 'react'

interface Props {
  operators: string[]
  onUpdate: (list: string[]) => void
  onClose: () => void
}

export default function OperatorManager({ operators, onUpdate, onClose }: Props) {
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  const add = async () => {
    if (!newName.trim()) return
    setLoading(true)
    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) { onUpdate(await res.json()); setNewName('') }
    setLoading(false)
  }

  const remove = async (name: string) => {
    setLoading(true)
    const res = await fetch(`/api/operators/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) onUpdate(await res.json())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">人員管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-2">
          {operators.map(name => (
            <div key={name} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-800">{name}</span>
              <button
                onClick={() => remove(name)}
                disabled={loading}
                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
              >
                刪除
              </button>
            </div>
          ))}
          {operators.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">尚無人員</p>
          )}
        </div>

        <div className="flex gap-2 pt-1 border-t">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="輸入姓名或暱稱"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={add}
            disabled={loading || !newName.trim()}
            className="px-3 py-2 bg-amber-600 text-white text-sm rounded-xl hover:bg-amber-700 disabled:opacity-40"
          >
            新增
          </button>
        </div>
      </div>
    </div>
  )
}
