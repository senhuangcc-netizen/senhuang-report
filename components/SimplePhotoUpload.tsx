'use client'
import { useCallback, useRef, useState } from 'react'

interface InProgress {
  id: number
  preview: string
  uploading: boolean
}

interface Props {
  label?: string
  paths: string[]           // saved paths from parent
  onChange: (paths: string[]) => void
  folder: string
  category: string
  accept?: string
}

export default function SimplePhotoUpload({ label, paths, onChange, folder, category, accept = 'image/*' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [inProgress, setInProgress] = useState<InProgress[]>([])

  const uploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return
    const arr = Array.from(files)

    const pending: InProgress[] = arr.map(f => ({
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(f),
      uploading: true,
    }))
    setInProgress(prev => [...prev, ...pending])

    const newPaths: string[] = []
    for (let i = 0; i < arr.length; i++) {
      const fd = new FormData()
      fd.append('file', arr[i])
      fd.append('folder', folder)
      fd.append('category', category)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const { path } = await res.json()
        newPaths.push(path)
      } catch { /* skip failed */ }
      setInProgress(prev => prev.map(p => p.id === pending[i].id ? { ...p, uploading: false } : p))
    }

    // 上傳完畢：移入 paths，清掉 in-progress
    onChange([...paths, ...newPaths])
    setInProgress(prev => prev.filter(p => !pending.find(x => x.id === p.id)))
  }, [paths, folder, category, onChange])

  const removeSaved = (idx: number) => onChange(paths.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {/* 拖拉區 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors select-none ${
          dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
        }`}
      >
        <p className="text-2xl mb-1">📎</p>
        <p className="text-sm text-gray-400">點擊或拖曳照片到此處</p>
        <p className="text-xs text-gray-300 mt-1">支援多張同時上傳</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />
      </div>

      {/* 已上傳 + 上傳中的縮圖 */}
      {(paths.length > 0 || inProgress.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {paths.map((p, i) => (
            <div key={p} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => removeSaved(i)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center transition-opacity hover:bg-red-500"
              >×</button>
            </div>
          ))}
          {inProgress.map(p => (
            <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={p.preview} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-lg">上傳中…</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
