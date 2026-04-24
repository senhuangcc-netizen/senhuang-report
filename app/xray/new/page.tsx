'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BUILDING_TYPES } from '@/lib/formData'
import SimplePhotoUpload from '@/components/SimplePhotoUpload'

const ITEM_TYPES = [...BUILDING_TYPES, '其他'] as const
type ItemType = (typeof ITEM_TYPES)[number]

function genXrayCode(barcode: string): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const prefix = barcode.replace(/\s/g, '').slice(0, 3).toUpperCase() || 'XXX'
  return `${date}-${prefix}`
}

export default function XrayNewPage() {
  const router = useRouter()

  const [customerName, setCustomerName] = useState('')
  const [barcode,      setBarcode]      = useState('')
  const [xrayCode,     setXrayCode]     = useState('')
  const [itemType,     setItemType]     = useState<ItemType | ''>('')
  const [itemCustom,   setItemCustom]   = useState('')
  const [mainPhotos,   setMainPhotos]   = useState<string[]>([])
  const [xrayPhotos,   setXrayPhotos]   = useState<string[]>([])
  const [operators,    setOperators]    = useState<string[]>([])
  const [operator,     setOperator]     = useState('')
  const [note,         setNote]         = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  // 從 URL 預填
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const cn = p.get('customer') || ''
    const bc = p.get('barcode') || ''
    if (cn) setCustomerName(decodeURIComponent(cn))
    if (bc) {
      setBarcode(decodeURIComponent(bc))
      setXrayCode(genXrayCode(decodeURIComponent(bc)))
    }
  }, [])

  // 操作員
  useEffect(() => {
    fetch('/api/operators').then(r => r.json()).then((list: string[]) => {
      setOperators(list)
      setOperator(prev => prev || list[0] || '')
    })
  }, [])

  // 條碼改動時同步更新編碼
  const barcodeChanged = (v: string) => {
    setBarcode(v)
    setXrayCode(genXrayCode(v))
  }

  const folderKey = customerName
    ? `xray_${customerName.replace(/[/\\:*?"<>|]/g, '_')}_${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}`
    : 'xray_unknown'

  const handleSave = async () => {
    if (!customerName || !itemType || (itemType === '其他' && !itemCustom)) {
      setError('請填寫客戶名稱與拍攝品項')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/xray', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          barcode,
          xrayCode,
          itemType,
          itemTypeCustom: itemType === '其他' ? itemCustom : null,
          mainPhotos,
          xrayPhotos,
          operator,
          note,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      // 回到掃描頁繼續下一件
      const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/scan'
      router.push(`${returnTo}?customer=${encodeURIComponent(customerName)}&mode=xray`)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm z-40">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">X光照建檔</h1>
          {customerName && <p className="text-xs text-gray-400">{customerName}</p>}
        </div>
        {operators.length > 0 && (
          <select
            value={operator}
            onChange={e => setOperator(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-900"
          >
            {operators.map(o => <option key={o}>{o}</option>)}
          </select>
        )}
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

        {/* 基本資料 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">基本資料</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">客戶名稱 *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="客戶姓名"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">條碼（QR）</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:border-amber-500"
              value={barcode}
              onChange={e => barcodeChanged(e.target.value)}
              placeholder="掃描或手動輸入"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">編碼（建檔日期 + QR前三碼，自動生成）</label>
            <input
              className="w-full border border-dashed border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-600 bg-gray-50 focus:outline-none focus:border-amber-400"
              value={xrayCode}
              onChange={e => setXrayCode(e.target.value)}
            />
          </div>
        </section>

        {/* 拍攝品項 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800 border-b pb-2">拍攝品項 *</h2>
          <div className="grid grid-cols-3 gap-2">
            {ITEM_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setItemType(t)}
                className={`py-2 text-sm rounded-xl border font-medium transition-colors ${
                  itemType === t
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-amber-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {itemType === '其他' && (
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              value={itemCustom}
              onChange={e => setItemCustom(e.target.value)}
              placeholder="手動輸入品項名稱…"
              autoFocus
            />
          )}
        </section>

        {/* 主體照 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 border-b pb-3 mb-3">主體照</h2>
          <SimplePhotoUpload
            paths={mainPhotos}
            onChange={setMainPhotos}
            folder={folderKey}
            category="主體照"
          />
        </section>

        {/* X光照 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 border-b pb-3 mb-3">X光照</h2>
          <SimplePhotoUpload
            paths={xrayPhotos}
            onChange={setXrayPhotos}
            folder={folderKey}
            category="X光照"
          />
        </section>

        {/* 備註 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">備註</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500 resize-none"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </section>

        {/* 儲存 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-50 text-base"
        >
          {saving ? '儲存中…' : '儲存 X光照紀錄'}
        </button>
      </div>
    </div>
  )
}
