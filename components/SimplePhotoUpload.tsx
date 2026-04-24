'use client'
import { useCallback, useRef, useState } from 'react'
import { compressImage } from '@/lib/compressImage'

interface InProgress {
  id: number
  preview: string
  uploading: boolean
}

interface Props {
  label?: string
  paths: string[]
  onChange: (paths: string[]) => void
  folder: string
  category: string
  accept?: string
  showCamera?: boolean
  collapseWhenFilled?: boolean
}

export default function SimplePhotoUpload({ label, paths, onChange, folder, category, accept = 'image/*', showCamera = true, collapseWhenFilled = false }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [inProgress, setInProgress] = useState<InProgress[]>([])

  const isFilled = collapseWhenFilled && (paths.length > 0 || inProgress.length > 0)

  const uploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return
    const arr = await Promise.all(Array.from(files).map(compressImage))

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

      {/* 操作列：拍照 + 選檔（有照片且 collapseWhenFilled 時隱藏）*/}
      {!isFilled && (
        <div className="flex gap-2">
          {showCamera && (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl py-3 text-sm font-medium transition-colors"
            >
              <span className="text-lg">📷</span> 拍照
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => uploadFiles(e.target.files)}
              />
            </button>
          )}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl py-3 text-center cursor-pointer transition-colors select-none flex flex-col items-center justify-center ${
              dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg mb-0.5">📎</p>
            <p className="text-sm text-gray-400">選擇檔案</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={accept}
              className="hidden"
              onChange={e => uploadFiles(e.target.files)}
            />
          </div>
        </div>
      )}

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
          {/* collapsed 模式下補拍按鈕 */}
          {isFilled && (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-300 text-gray-400 hover:text-amber-600 flex items-center justify-center text-2xl transition-colors bg-white"
              title="補拍照片"
            >
              +
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => uploadFiles(e.target.files)}
              />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
