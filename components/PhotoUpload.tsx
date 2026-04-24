'use client'
import { useCallback, useRef, useState } from 'react'
import { compressImage } from '@/lib/compressImage'

export interface PhotoItem {
  category: '主體照' | '顯微照' | '360照'
  preview: string
  file: File
  uploaded?: boolean
  savedPath?: string
}

interface Props {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  folderName?: string
}

const CATEGORIES = ['主體照', '顯微照', '360照'] as const

export default function PhotoUpload({ photos, onChange, folderName }: Props) {
  const [activeTab, setActiveTab] = useState<typeof CATEGORIES[number]>('主體照')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[], category: typeof CATEGORIES[number]) => {
    const newPhotos: PhotoItem[] = []
    for (const raw of Array.from(files)) {
      if (!raw.type.startsWith('image/')) continue
      const file = await compressImage(raw)
      const preview = URL.createObjectURL(file)
      newPhotos.push({ category, preview, file })

      if (folderName) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', folderName)
        fd.append('category', category)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const data = await res.json()
          newPhotos[newPhotos.length - 1].savedPath = data.path
          newPhotos[newPhotos.length - 1].uploaded = true
        }
      }
    }
    onChange([...photos, ...newPhotos])
  }, [photos, onChange, folderName])

  const categoryPhotos = photos.filter(p => p.category === activeTab)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveTab(cat)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${activeTab === cat ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat} ({photos.filter(p => p.category === cat).length})
          </button>
        ))}
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files, activeTab) }}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}
      >
        <div className="text-gray-400 text-sm mb-3">拖拉照片至此，或</div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:border-amber-500 hover:text-amber-700"
          >
            選擇檔案
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            拍攝照片
          </button>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && addFiles(e.target.files, activeTab)} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files && addFiles(e.target.files, activeTab)} />
      </div>

      {categoryPhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {categoryPhotos.map((p, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg" />
              {p.uploaded && <div className="absolute top-1 right-1 bg-green-500 rounded-full w-3 h-3" title="已儲存" />}
              <button
                type="button"
                onClick={() => onChange(photos.filter(x => x !== p))}
                className="absolute inset-0 bg-black/50 text-white text-xl opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
