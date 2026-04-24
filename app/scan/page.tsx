'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'

interface ScannedItem {
  tempId: number
  barcode: string
  itemCode: string
  intakeId: number | null
  status: 'saving' | 'saved' | 'error'
}

export default function ScanPage() {
  const router = useRouter()

  const [customerName, setCustomerName] = useState('')
  const [operators, setOperators] = useState<string[]>([])
  const [operator, setOperator] = useState('')
  const [items, setItems] = useState<ScannedItem[]>([])
  const [scanning, setScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  // 從 URL ?customer= 預填
  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get('customer')
    if (name) setCustomerName(decodeURIComponent(name))
  }, [])

  // 載入操作人員
  useEffect(() => {
    fetch('/api/operators')
      .then(r => r.json())
      .then((list: string[]) => {
        setOperators(list)
        setOperator(prev => prev || list[0] || '')
      })
  }, [])

  const createDraft = useCallback(async (barcode: string) => {
    if (!customerName.trim()) return
    const tempId = Date.now() + Math.random()
    setItems(prev => [...prev, { tempId, barcode, itemCode: '…', intakeId: null, status: 'saving' }])

    try {
      const res = await fetch('/api/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          barcode,
          operator: operator || '—',
          buildingType: '',
          appraisalResult: '',
          submissionDate: new Date().toISOString().slice(0, 10),
        }),
      })
      const data = await res.json()
      setItems(prev => prev.map(it =>
        it.tempId === tempId
          ? { ...it, itemCode: data.itemCode || '?', intakeId: data.id, status: 'saved' }
          : it
      ))
    } catch {
      setItems(prev => prev.map(it =>
        it.tempId === tempId ? { ...it, status: 'error' } : it
      ))
    }
  }, [customerName, operator])

  const handleManualAdd = () => {
    if (!manualBarcode.trim() || !customerName.trim()) return
    createDraft(manualBarcode.trim())
    setManualBarcode('')
  }

  const savedCount = items.filter(it => it.status === 'saved').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</button>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">批次收件掃描</h1>
          <p className="text-xs text-gray-400">掃描條碼後自動建立草稿，之後再填寫細節</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* 客戶名稱 + 操作員 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">客戶名稱 *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="輸入客戶姓名…"
            />
          </div>
          {operators.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">操作員</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-amber-500"
                value={operator}
                onChange={e => setOperator(e.target.value)}
              >
                {operators.map(op => <option key={op}>{op}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* 掃描按鈕 */}
        <button
          onClick={() => { if (customerName.trim()) setScanning(true) }}
          disabled={!customerName.trim()}
          className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-40 text-base"
        >
          📷 掃描條碼
        </button>

        {/* 手動輸入 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">手動輸入條碼</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
              placeholder="輸入條碼後按 Enter…"
            />
            <button
              onClick={handleManualAdd}
              disabled={!customerName.trim() || !manualBarcode.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-200"
            >
              新增
            </button>
          </div>
        </div>

        {/* 掃描清單 */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              已建立 {savedCount} 份草稿
              {items.some(it => it.status === 'saving') && <span className="text-gray-400 font-normal"> （儲存中…）</span>}
            </p>
            <div className="divide-y divide-gray-50">
              {items.map((it, i) => (
                <div key={it.tempId} className="flex items-center gap-3 py-2.5">
                  <span className="text-gray-300 text-sm w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-mono text-sm truncate">{it.barcode}</p>
                    <p className="text-gray-400 text-xs">代碼：{it.itemCode}</p>
                  </div>
                  <div className="shrink-0 text-sm">
                    {it.status === 'saving' && <span className="text-gray-400">⋯</span>}
                    {it.status === 'saved' && <span className="text-green-500">✓</span>}
                    {it.status === 'error' && <span className="text-red-500">✕</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 完成按鈕 */}
        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-800 text-white font-bold py-3 rounded-2xl shadow-sm text-base"
        >
          完成，返回列表
        </button>

      </div>

      {scanning && (
        <BarcodeScanner
          onScan={createDraft}
          onClose={() => setScanning(false)}
          keepOpen
        />
      )}
    </div>
  )
}
