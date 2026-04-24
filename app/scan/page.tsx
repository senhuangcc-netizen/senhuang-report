'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'

type Mode = 'intake' | 'xray'

interface ScannedItem {
  tempId: number
  barcode: string
  itemCode: string
  intakeId: number | null
  status: 'saving' | 'saved' | 'error'
}

export default function ScanPage() {
  const router = useRouter()

  const [mode,         setMode]         = useState<Mode>('intake')
  const [customerName, setCustomerName] = useState('')
  const [operators,    setOperators]    = useState<string[]>([])
  const [operator,     setOperator]     = useState('')
  const [items,        setItems]        = useState<ScannedItem[]>([])
  const [xrayCount,    setXrayCount]    = useState(0)
  const [scanning,     setScanning]     = useState(false)
  const [manualBarcode,setManualBarcode]= useState('')
  const [customers,    setCustomers]    = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 從 URL ?customer= 和 ?mode= 預填
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const name = p.get('customer')
    const m = p.get('mode')
    if (name) setCustomerName(decodeURIComponent(name))
    if (m === 'xray') setMode('xray')
  }, [])

  // 載入操作人員 + 客戶名單
  useEffect(() => {
    fetch('/api/operators')
      .then(r => r.json())
      .then((list: string[]) => {
        setOperators(list)
        setOperator(prev => prev || list[0] || '')
      })
    fetch('/api/customers')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((list: any[]) => setCustomers(Array.isArray(list) ? list.map((c: any) => c.name) : []))
  }, [])

  const [dupWarning, setDupWarning] = useState('')

  // 建件模式：掃描後自動建草稿
  const createDraft = useCallback(async (barcode: string) => {
    if (!customerName.trim()) return
    // 防重複條碼
    if (items.some(it => it.barcode === barcode)) {
      setDupWarning(`條碼 ${barcode} 已掃描過`)
      setTimeout(() => setDupWarning(''), 2500)
      return
    }
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
      if (data.duplicate) {
        setItems(prev => prev.filter(it => it.tempId !== tempId))
        setDupWarning(`條碼 ${barcode} 已建檔（${data.itemCode}）`)
        setTimeout(() => setDupWarning(''), 3000)
        return
      }
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
  }, [customerName, operator, items])

  // X光模式：掃描後跳轉到 X光照表單
  const openXray = useCallback((barcode: string) => {
    if (!customerName.trim()) return
    setXrayCount(c => c + 1)
    router.push(
      `/xray/new?customer=${encodeURIComponent(customerName.trim())}&barcode=${encodeURIComponent(barcode)}&returnTo=/scan`
    )
  }, [customerName, router])

  const handleScan = mode === 'xray' ? openXray : createDraft

  const handleManualAdd = () => {
    if (!manualBarcode.trim() || !customerName.trim()) return
    handleScan(manualBarcode.trim())
    setManualBarcode('')
  }

  const savedCount = items.filter(it => it.status === 'saved').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-lg">掃描收件</h1>
          <p className="text-xs text-gray-600">{mode === 'intake' ? '批次建件：掃描後自動建立草稿' : 'X光拍攝：掃描後進入X光表單'}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* 模式切換 */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm flex gap-1.5">
          <button
            onClick={() => setMode('intake')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'intake' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 新增建件
          </button>
          <button
            onClick={() => setMode('xray')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'xray' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔬 拍攝X光
          </button>
        </div>

        {/* 客戶名稱 + 操作員 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="relative">
            <label className="block text-xs text-gray-700 mb-1">客戶名稱 *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="輸入客戶姓名…"
            />
            {showSuggestions && customerName && (() => {
              const suggestions = customers.filter(n => n.toLowerCase().includes(customerName.toLowerCase()) && n !== customerName)
              return suggestions.length > 0 ? (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.slice(0, 6).map(n => (
                    <button
                      key={n}
                      className="w-full text-left px-3 py-2.5 text-sm text-gray-800 hover:bg-amber-50 border-b border-gray-50 last:border-0"
                      onMouseDown={() => { setCustomerName(n); setShowSuggestions(false) }}
                    >{n}</button>
                  ))}
                </div>
              ) : null
            })()}
          </div>
          {operators.length > 0 && mode === 'intake' && (
            <div>
              <label className="block text-xs text-gray-700 mb-1">操作員</label>
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
          className={`w-full text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-40 text-base ${
            mode === 'xray' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          {mode === 'xray' ? '🔬 掃描條碼 → X光照表單' : '📷 掃描條碼'}
        </button>

        {/* 重複條碼警告 */}
        {dupWarning && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl text-center">
            {dupWarning}
          </div>
        )}

        {/* 手動輸入 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-700 mb-2">手動輸入條碼</p>
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
              進入
            </button>
          </div>
        </div>

        {/* 建件清單 */}
        {mode === 'intake' && items.length > 0 && (
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
                    {it.status === 'saved'  && <span className="text-green-500">✓</span>}
                    {it.status === 'error'  && <span className="text-red-500">✕</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* X光計數 */}
        {mode === 'xray' && xrayCount > 0 && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
            <p className="text-purple-700 font-semibold">已開啟 {xrayCount} 件X光表單</p>
            <p className="text-purple-400 text-xs mt-1">填寫完成後會自動回到此頁</p>
          </div>
        )}

        {/* 完成 */}
        <button
          onClick={() => { window.location.href = '/' }}
          className="w-full bg-gray-800 text-white font-bold py-3 rounded-2xl shadow-sm text-base"
        >
          完成，返回列表
        </button>
      </div>

      {scanning && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScanning(false)}
          keepOpen={mode === 'intake'}
        />
      )}
    </div>
  )
}
