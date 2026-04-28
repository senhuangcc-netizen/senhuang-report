'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'
import { CASE_STAGES } from '@/lib/formData'

interface Intake {
  id: number
  customer_name: string
  folder_name?: string
  letter?: string
  item_code: string
  building_type: string
  appraisal_result: string
  genuine_preset?: string
  status: string
  operator: string
  created_at: string
  submission_date?: string
  report_path?: string
  case_stage?: string
  photo_stages?: string
  inspection_unit?: string
  size?: string
  weight?: string
  photos?: string
}

interface XrayRecord {
  id: number
  customer_name: string
  xray_code: string
  item_type: string
  item_type_custom: string | null
  angle: string | null
  created_at: string
  doc_url: string | null
}

function parseCompletedStages(cs: string | null | undefined): string[] {
  if (!cs) return []
  try {
    const parsed = JSON.parse(cs)
    return Array.isArray(parsed) ? parsed : [cs]
  } catch {
    return cs ? [cs] : []
  }
}

const BUILDING_TYPES = ['古玉器', '古銅器', '瓷器', '粉質佛牌', '金屬佛牌'] as const
const RESULT_TAGS = [
  { label: 'CC', value: 'C.C. (Clearly-Consistent)，與該年代真品特徵吻合', color: 'bg-green-600 text-white border-green-600' },
  { label: 'RC', value: 'R.C.(Roughly-Consistent)，與該年代真品特徵大致吻合', color: 'bg-amber-500 text-white border-amber-500' },
  { label: 'IC', value: 'I.C.(In-Consistent)，與該年代真品特徵不吻合', color: 'bg-red-600 text-white border-red-600' },
] as const

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: '草稿',     color: 'bg-gray-100 text-gray-500' },
  submitted: { label: '送出建單', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成',   color: 'bg-green-100 text-green-700' },
}

export default function HomePage() {
  const router = useRouter()
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [xrays,   setXrays]   = useState<XrayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  // 新建資料夾 Modal
  const [newFolderOpen,      setNewFolderOpen]      = useState(false)
  const [newFolderName,      setNewFolderName]      = useState('')
  const [customerMenuOpen,   setCustomerMenuOpen]   = useState(false)
  const [customerList,       setCustomerList]       = useState<string[]>([])
  const [searchScanner,      setSearchScanner]      = useState(false)
  // 新增報告 Modal
  const [addReportOpen,      setAddReportOpen]      = useState(false)
  const [addReportCustomer,  setAddReportCustomer]  = useState('')
  const [addReportSearch,    setAddReportSearch]    = useState('')
  const [addReportScanner,   setAddReportScanner]   = useState(false)

  // 送檢單位管理
  const [inspectionUnits,  setInspectionUnits]  = useState<string[]>([])
  const [addingUnitFor,    setAddingUnitFor]     = useState<number | null>(null)
  const [pickingUnitFor,   setPickingUnitFor]    = useState<number | null>(null)
  const [newUnitName,      setNewUnitName]       = useState('')
  // 快速儲存狀態
  const [quickSaved,       setQuickSaved]        = useState<number | null>(null)
  // 進度取消確認：點第一下記錄，3秒內點第二下才真正取消
  const [pendingRemove,    setPendingRemove]      = useState<{id: number; stage: string} | null>(null)
  // 尺寸/重量本地暫存（輸入中但未送出）
  const [quickEditMap,     setQuickEditMap]      = useState<Record<number, { size?: string; weight?: string }>>({})

  const openNewFolder = () => {
    setNewFolderName('')
    setNewFolderOpen(true)
  }

  const openAddReport = () => {
    setAddReportCustomer('')
    setAddReportSearch('')
    setAddReportOpen(true)
    fetch('/api/customers')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((list: any[]) => setCustomerList(Array.isArray(list) ? list.map((c: any) => c.name) : []))
  }

  const handleAddReportScan = async (scanned: string) => {
    setAddReportScanner(false)
    const suffix = scanned.slice(-3)
    try {
      const res = await fetch(`/api/intakes?barcode=${encodeURIComponent(scanned)}`)
      const data = await res.json()
      if (data?.id) {
        setAddReportOpen(false)
        router.push(`/new?edit=${data.id}`)
        return
      }
    } catch { /* noop */ }
    setAddReportSearch(suffix)
  }

  const handleSearchScan = async (scanned: string) => {
    setSearchScanner(false)
    const suffix = scanned.slice(-3)
    // 1. 以完整條碼查詢 DB
    try {
      const res = await fetch(`/api/intakes?barcode=${encodeURIComponent(scanned)}`)
      const data = await res.json()
      if (data?.id) {
        router.push(`/new?edit=${data.id}`)
        return
      }
    } catch { /* noop */ }
    // 2. 以後三碼比對 item_code 前三碼（item_code 格式：後三碼+資料夾字母，如 K06A）
    const byCode = intakes.find(i => i.item_code?.startsWith(suffix))
    if (byCode) {
      router.push(`/new?edit=${byCode.id}`)
      return
    }
    // 3. 找不到：用後三碼塞進搜尋欄
    setSearch(suffix)
  }

  // 刪除確認 Modal
  type DeleteTarget =
    | { type: 'folder'; customerName: string }
    | { type: 'item'; id: number; itemCode: string; customerName: string }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const deleteKey = deleteTarget?.type === 'folder'
    ? deleteTarget.customerName
    : deleteTarget?.type === 'item' ? deleteTarget.customerName : ''
  const confirmReady = confirmInput === deleteKey

  const toggleFolder = (name: string) =>
    setOpenFolders(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })

  const toggleItem = (id: number) =>
    setOpenItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const deleteItem = async (id: number) => {
    setDeleting(id)
    await fetch(`/api/intakes/${id}`, { method: 'DELETE' })
    setIntakes(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  const execDelete = async () => {
    if (!deleteTarget || !confirmReady) return
    setDeleting(-1)
    const name = deleteTarget.customerName
    await Promise.all([
      fetch(`/api/intakes?customerName=${encodeURIComponent(name)}`, { method: 'DELETE' }),
      fetch(`/api/xray?customerName=${encodeURIComponent(name)}`, { method: 'DELETE' }),
    ])
    setIntakes(prev => prev.filter(i => i.customer_name !== name))
    setXrays(prev => prev.filter(x => x.customer_name !== name))
    setDeleting(null)
    setDeleteTarget(null)
    setConfirmInput('')
  }

  const todayYear  = new Date().getFullYear().toString()
  const todayMonth = new Date().getMonth() + 1
  const [selectedYear,  setSelectedYear]  = useState(todayYear)
  const [selectedMonth, setSelectedMonth] = useState(todayMonth)

  useEffect(() => {
    const fetchXrays = () =>
      fetch('/api/xray').then(r => r.json()).then(data => { if (Array.isArray(data)) setXrays(data) })

    fetch('/api/intakes')
      .then(r => r.json())
      .then(data => { setIntakes(Array.isArray(data) ? data : []); setLoading(false) })
    fetchXrays()
    fetch('/api/inspection-units')
      .then(r => r.json())
      .then(list => { if (Array.isArray(list)) setInspectionUnits(list) })

    // 從其他頁面返回時重新拉 xray（避免快取舊資料）
    const onVisible = () => { if (document.visibilityState === 'visible') fetchXrays() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const quickPatch = async (id: number, field: Record<string, string | null | string[]>) => {
    await fetch(`/api/intakes/${id}/quick`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    })
    const key = Object.keys(field)[0]
    const val = Object.values(field)[0]
    setIntakes(prev => prev.map(i => {
      if (i.id !== id) return i
      if (key === 'buildingType')    return { ...i, building_type:    val as string ?? '' }
      if (key === 'appraisalResult') return { ...i, appraisal_result: val as string ?? '' }
      if (key === 'inspectionUnit')  return { ...i, inspection_unit:  val as string ?? '' }
      if (key === 'size')            return { ...i, size:             val as string ?? '' }
      if (key === 'weight')          return { ...i, weight:           val as string ?? '' }
      if (key === 'caseStage')       return { ...i, case_stage:       val as string ?? '收件' }
      if (key === 'completedStages') return { ...i, case_stage:       JSON.stringify(val as string[]) }
      return i
    }))
    // 清掉該欄位的暫存
    if (key === 'size' || key === 'weight') {
      setQuickEditMap(prev => {
        const copy = { ...prev }
        if (copy[id]) { delete copy[id][key as 'size' | 'weight']; if (!Object.keys(copy[id]).length) delete copy[id] }
        return copy
      })
    }
    setQuickSaved(id)
    setTimeout(() => setQuickSaved(s => s === id ? null : s), 1500)
  }

  const addInspectionUnit = async () => {
    if (!newUnitName.trim()) return
    const name = newUnitName.trim()
    const res = await fetch('/api/inspection-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setInspectionUnits(await res.json())
    // 新增後自動幫當前品項打上這個標籤
    if (addingUnitFor !== null) await quickPatch(addingUnitFor, { inspectionUnit: name })
    setNewUnitName('')
    setAddingUnitFor(null)
  }

  const removeInspectionUnit = async (name: string) => {
    const res = await fetch('/api/inspection-units', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setInspectionUnits(await res.json())
  }

  const years = useMemo(() => {
    const ys = new Set(
      intakes.map(i => (i.submission_date || i.created_at)?.slice(0, 4)).filter(Boolean) as string[]
    )
    const arr = Array.from(ys).sort().reverse()
    if (!arr.includes(todayYear)) arr.unshift(todayYear)
    return arr
  }, [intakes])

  const monthsWithData = useMemo(() => {
    const ms = new Set<number>()
    for (const i of intakes) {
      const d = i.submission_date || i.created_at || ''
      if (d.startsWith(selectedYear)) { const m = parseInt(d.slice(5, 7)); if (m > 0) ms.add(m) }
    }
    for (const x of xrays) {
      const d = x.created_at || ''
      if (d.startsWith(selectedYear)) { const m = parseInt(d.slice(5, 7)); if (m > 0) ms.add(m) }
    }
    return ms
  }, [intakes, xrays, selectedYear])

  const filtered = useMemo(() => {
    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    return intakes.filter(i => {
      const d = i.submission_date || i.created_at || ''
      if (!d.startsWith(ym)) return false
      if (!search) return true
      const s = search.toLowerCase()
      return i.customer_name?.toLowerCase().includes(s) ||
             i.item_code?.toLowerCase().includes(s) ||
             i.building_type?.includes(search)
    })
  }, [intakes, selectedYear, selectedMonth, search])

  // 本月 xray（篩月份 + 搜尋）
  const filteredXrays = useMemo(() => {
    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    return xrays.filter(x => {
      if (!x.created_at?.startsWith(ym)) return false
      if (!search) return true
      const s = search.toLowerCase()
      return x.customer_name?.toLowerCase().includes(s) || x.xray_code?.toLowerCase().includes(s)
    })
  }, [xrays, selectedYear, selectedMonth, search])

  // 依客戶名稱分組（intake + xray 合併）
  const customerGroups = useMemo(() => {
    const intakeMap = new Map<string, Intake[]>()
    for (const i of filtered) {
      const key = i.customer_name || '（未填客戶）'
      if (!intakeMap.has(key)) intakeMap.set(key, [])
      intakeMap.get(key)!.push(i)
    }
    const xrayMap = new Map<string, XrayRecord[]>()
    for (const x of filteredXrays) {
      const key = x.customer_name || '（未填客戶）'
      if (!xrayMap.has(key)) xrayMap.set(key, [])
      xrayMap.get(key)!.push(x)
    }
    // 合併所有客戶 key
    const allKeys = new Set([...intakeMap.keys(), ...xrayMap.keys()])
    return Array.from(allKeys).map(k => ({
      customerName: k,
      intakes: intakeMap.get(k) ?? [],
      xrays: xrayMap.get(k) ?? [],
    }))
  }, [filtered, filteredXrays])

  const generateReport = async (intake: Intake) => {
    setGenerating(intake.id)
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intakeId: intake.id, operator: '所長' }),
    })
    const data = await res.json()
    if (data.success) {
      setIntakes(prev => prev.map(i => i.id === intake.id ? { ...i, status: 'completed' } : i))
      alert('報告生成完成！')
    } else {
      alert('生成失敗：' + (data.error || '未知錯誤'))
    }
    setGenerating(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 新建資料夾 Modal */}
      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3">
            <h2 className="font-bold text-base text-gray-900">新建客戶資料夾</h2>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">輸入新客戶姓名</label>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="客戶姓名"
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-xs text-gray-500">建立後選擇建檔類型進入掃描頁</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (newFolderName.trim()) { setNewFolderOpen(false); router.push(`/xray/new?customer=${encodeURIComponent(newFolderName.trim())}`) } }}
                disabled={!newFolderName.trim()}
                className="py-2.5 border border-purple-300 text-purple-700 text-sm rounded-xl font-medium hover:bg-purple-50 disabled:opacity-40"
              >X光照建檔</button>
              <button
                onClick={() => { if (newFolderName.trim()) { setNewFolderOpen(false); router.push(`/scan?customer=${encodeURIComponent(newFolderName.trim())}`) } }}
                disabled={!newFolderName.trim()}
                className="py-2.5 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700 disabled:opacity-40"
              >鑑定報告</button>
            </div>
            <button
              onClick={() => setNewFolderOpen(false)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
            >取消</button>
          </div>
        </div>
      )}

      {/* 新增報告 Modal */}
      {addReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3">
            <h2 className="font-bold text-base text-gray-900">新增報告</h2>
            <div>
              <p className="text-xs text-gray-600 mb-1.5">選擇現有客戶</p>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={addReportSearch}
                  onChange={e => setAddReportSearch(e.target.value)}
                  placeholder="搜尋客戶姓名…"
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => setAddReportScanner(true)}
                  className="px-3 py-2 border border-amber-300 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 shrink-0"
                >掃描</button>
              </div>
              {(() => {
                const suggestions = customerList.filter(n =>
                  !addReportSearch || n.toLowerCase().includes(addReportSearch.toLowerCase())
                )
                return suggestions.length > 0 ? (
                  <div className="mt-1.5 max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                    {suggestions.map(n => (
                      <button
                        key={n}
                        onClick={() => { setAddReportCustomer(n); setAddReportSearch('') }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                          addReportCustomer === n ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                        {addReportCustomer === n && <span className="ml-2 text-amber-600 text-xs">✓ 已選</span>}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
              {addReportCustomer && !addReportSearch && (
                <p className="text-xs text-amber-700 mt-1.5 font-medium">已選：{addReportCustomer}</p>
              )}
            </div>
            <p className="text-xs text-gray-500">選擇建檔類型</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (addReportCustomer) { setAddReportOpen(false); router.push(`/xray/new?customer=${encodeURIComponent(addReportCustomer)}`) } }}
                disabled={!addReportCustomer}
                className="py-2.5 border border-purple-300 text-purple-700 text-sm rounded-xl font-medium hover:bg-purple-50 disabled:opacity-40"
              >X光照建檔</button>
              <button
                onClick={() => { if (addReportCustomer) { setAddReportOpen(false); router.push(`/scan?customer=${encodeURIComponent(addReportCustomer)}`) } }}
                disabled={!addReportCustomer}
                className="py-2.5 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700 disabled:opacity-40"
              >鑑定報告</button>
            </div>
            <button
              onClick={() => setAddReportOpen(false)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
            >取消</button>
          </div>
        </div>
      )}

      {/* 新增報告掃描器 */}
      {addReportScanner && (
        <BarcodeScanner onScan={handleAddReportScan} onClose={() => setAddReportScanner(false)} keepOpen={false} />
      )}
      {/* 主搜尋掃描器 */}
      {searchScanner && (
        <BarcodeScanner onScan={handleSearchScan} onClose={() => setSearchScanner(false)} keepOpen={false} />
      )}

      {/* 刪除確認 Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-xl">🗑</span>
              <h2 className="font-bold text-base">刪除整個客戶資料夾</h2>
            </div>
            <p className="text-sm text-gray-600">
              此操作將刪除 <span className="font-semibold text-gray-900">「{deleteTarget.customerName}」</span> 資料夾內的所有建單，無法復原。
            </p>
            <div>
              <p className="text-xs text-gray-700 mb-1">請輸入客戶名稱確認：<span className="font-semibold text-gray-800">{deleteKey}</span></p>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmReady && execDelete()}
                placeholder={deleteKey}
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setConfirmInput('') }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={execDelete}
                disabled={!confirmReady || deleting !== null}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting !== null ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">東方森煌建單系統</h1>
            <p className="text-xs text-gray-600">Oriental Senhuang Intake System</p>
          </div>
          <Link href="/labels" className="px-3 py-2 border border-gray-200 text-gray-500 text-sm rounded-xl font-medium hover:bg-gray-50">
            列印標籤
          </Link>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="flex">
              <Link
                href="/customers/new"
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-l-xl font-semibold hover:bg-gray-50 border-r-0 text-center"
              >
                新增客戶
              </Link>
              <button
                onClick={() => setCustomerMenuOpen(v => !v)}
                className="px-2.5 py-2.5 border border-gray-200 text-gray-400 text-xs rounded-r-xl hover:bg-gray-50"
              >▾</button>
            </div>
            {customerMenuOpen && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <Link
                  href="/customers"
                  onClick={() => setCustomerMenuOpen(false)}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 border-b border-gray-50"
                >客戶名單</Link>
              </div>
            )}
          </div>
          <button
            onClick={openNewFolder}
            className="flex-1 py-2.5 border border-amber-300 text-amber-700 text-sm rounded-xl font-semibold hover:bg-amber-50"
          >
            新資料夾
          </button>
          <button
            onClick={openAddReport}
            className="flex-1 py-2.5 bg-amber-600 text-white text-sm rounded-xl font-semibold hover:bg-amber-700"
          >
            新增報告
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-3">

        {/* 年份 + 搜尋 */}
        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); setSelectedMonth(1) }}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white shadow-sm focus:outline-none focus:border-amber-500"
          >
            {years.map(y => <option key={y} value={y} className="text-gray-900">{y} 年</option>)}
          </select>
          <div className="flex-1 flex gap-1.5">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋客戶、編碼、類型..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 bg-white shadow-sm"
            />
            <button
              onClick={() => setSearchScanner(true)}
              className="px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-amber-700 hover:border-amber-300 shadow-sm text-base"
              title="掃描條碼搜尋"
            >⌖</button>
          </div>
        </div>

        {/* 月份 tabs（橫向可捲動） */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4">
          <div className="flex gap-1.5 min-w-max">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const has = monthsWithData.has(m)
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`shrink-0 px-3 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                    selectedMonth === m
                      ? 'bg-amber-600 text-white'
                      : has
                      ? 'bg-white text-gray-700 border border-gray-200 hover:border-amber-400 shadow-sm'
                      : 'text-gray-300 bg-white border border-gray-100'
                  }`}
                >
                  {m}月
                </button>
              )
            })}
          </div>
        </div>

        {/* 筆數 */}
        {!loading && (
          <p className="text-xs text-gray-600">
            {selectedYear} 年 {selectedMonth} 月 · {customerGroups.length} 位客戶 · 建單 {filtered.length} 筆 · X光 {filteredXrays.length} 筆
          </p>
        )}

        {loading && <div className="text-center text-gray-400 py-12">載入中...</div>}

        {!loading && filtered.length === 0 && filteredXrays.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">📋</div>
            <p>{selectedYear} 年 {selectedMonth} 月 尚無建單</p>
            <Link href="/new" className="mt-3 inline-block text-amber-600 text-sm hover:underline">建立新建單 →</Link>
          </div>
        )}

        {/* 客戶資料夾分組（兩層折疊） */}
        <div className="space-y-2">
          {customerGroups.map(({ customerName: cname, intakes: items, xrays: cxrays }) => {
            const folderOpen = openFolders.has(cname)
            const submittedCount = items.filter(i => i.status === 'submitted').length
            const completedCount = items.filter(i => i.status === 'completed').length
            // 資料夾進度：全部 items 進度相同才顯示
            const folderStage = (() => {
              const all = items.flatMap(it => parseCompletedStages(it.case_stage))
              return all.length > 0 ? all[all.length - 1] : null
            })()
            const folderLetter = items[0]?.letter
            return (
              <div key={cname} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* 第一層：資料夾標題（預設收合） */}
                <div
                  className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-amber-50 transition-colors select-none group"
                  onClick={() => toggleFolder(cname)}
                >
                  <span className="text-base">{folderOpen ? '📂' : '📁'}</span>
                  <span className="font-semibold text-gray-900">
                    {cname}{folderLetter ? <span className="text-amber-600">-{folderLetter}</span> : null}
                  </span>
                  <span className="text-xs text-gray-600 ml-1">
                    {items.length} 件{cxrays.length > 0 ? ` · ${cxrays.length} X光` : ''}
                  </span>
                  {folderStage && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      folderStage === '完成' ? 'bg-green-50 text-green-600' :
                      folderStage === '收件' ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-50 text-amber-700'
                    }`}>{folderStage}</span>
                  )}
                  {submittedCount > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{submittedCount} 送出</span>
                  )}
                  {completedCount > 0 && (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{completedCount} 完成</span>
                  )}
                  <span className="ml-auto text-gray-300 text-sm">{folderOpen ? '▾' : '▸'}</span>
                </div>

                {/* 第二層：資料夾內的建單列表 */}
                {folderOpen && (
                  <div className="border-t border-gray-50 divide-y divide-gray-50">
                    {items.map(intake => {
                      const itemOpen = openItems.has(intake.id)
                      const status = STATUS_LABELS[intake.status] || STATUS_LABELS.draft
                      const resultShort = intake.appraisal_result?.split('，')[0] || ''
                      const resultColor = resultShort.includes('C.C.') ? 'text-green-600'
                        : resultShort.includes('I.C.') ? 'text-red-600' : 'text-orange-600'
                      const itemName = intake.genuine_preset || intake.building_type || '—'

                      return (
                        <div key={intake.id}>
                          {/* 建單列：編碼 + 品名（預設收合） */}
                          <div
                            className="pl-8 pr-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 cursor-pointer select-none"
                            onClick={() => toggleItem(intake.id)}
                          >
                            <span className="text-gray-300 text-xs w-3 shrink-0">{itemOpen ? '▾' : '▸'}</span>
                            <span className="font-mono text-xs text-gray-700 shrink-0">{intake.item_code}</span>
                            <span className="text-sm text-gray-800 truncate flex-1">{itemName}</span>
                            {(() => {
                              const cs = parseCompletedStages(intake.case_stage)
                              const lastStage = [...cs].reverse().find(s => s !== '收件')
                              if (!lastStage) return null
                              return (
                                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                                  lastStage === '完成' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700'
                                }`}>{lastStage}</span>
                              )
                            })()}
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.color}`}>{status.label}</span>
                          </div>

                          {/* 展開後：詳情 + 操作按鈕 */}
                          {itemOpen && (
                            <div className="pl-8 pr-4 pb-3 bg-gray-50 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-600 pt-1 flex-wrap">
                                {intake.building_type && (
                                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">{intake.building_type}</span>
                                )}
                                {resultShort && <span className={`font-medium ${resultColor}`}>{resultShort}</span>}
                                {intake.inspection_unit && <span className="text-gray-500">🔬 {intake.inspection_unit}</span>}
                                <span>📅 {intake.submission_date || intake.created_at?.slice(0, 10)}</span>
                                <span>👤 {intake.operator}</span>
                              </div>

                              {/* 快速編輯列 */}
                              {(() => {
                                let intakePhoto: string | null = null
                                try {
                                  const ps = JSON.parse(intake.photos || '[]') as { category: string; path: string }[]
                                  intakePhoto = ps.find(p => p.category === '收件照')?.path ?? null
                                } catch { /* noop */ }
                                return (
                                  <div className="border border-gray-100 rounded-xl bg-gray-50 p-2.5">
                                    <div className="flex gap-2">
                                      {/* 左欄：欄位 */}
                                      <div className="flex-1 space-y-1.5 min-w-0">
                                        {/* 建單類型 + 鑑定結果 下拉 */}
                                        <div className="flex gap-1.5">
                                          <select
                                            value={intake.building_type || ''}
                                            onChange={e => quickPatch(intake.id, { buildingType: e.target.value || null })}
                                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-amber-400 min-w-0"
                                          >
                                            <option value="">建單類型</option>
                                            {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                          </select>
                                          <select
                                            value={intake.appraisal_result || ''}
                                            onChange={e => quickPatch(intake.id, { appraisalResult: e.target.value || null })}
                                            className="w-24 shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-amber-400"
                                          >
                                            <option value="">鑑定結果</option>
                                            {RESULT_TAGS.map(r => <option key={r.label} value={r.value}>{r.label}</option>)}
                                          </select>
                                        </div>

                                        {/* 進度 toggle */}
                                        {(() => {
                                          const completedStages = parseCompletedStages(intake.case_stage)
                                          return (
                                            <div className="flex flex-wrap gap-1">
                                              {CASE_STAGES.map(stage => {
                                                const done = completedStages.includes(stage)
                                                const isPR = pendingRemove?.id === intake.id && pendingRemove?.stage === stage
                                                return (
                                                  <button
                                                    key={stage}
                                                    type="button"
                                                    onClick={() => {
                                                      if (!done) {
                                                        quickPatch(intake.id, { completedStages: [...completedStages, stage] })
                                                      } else if (isPR) {
                                                        quickPatch(intake.id, { completedStages: completedStages.filter(s => s !== stage) })
                                                        setPendingRemove(null)
                                                      } else {
                                                        setPendingRemove({ id: intake.id, stage })
                                                        setTimeout(() => setPendingRemove(prev =>
                                                          prev?.id === intake.id && prev?.stage === stage ? null : prev
                                                        ), 3000)
                                                      }
                                                    }}
                                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                                      isPR
                                                        ? 'bg-red-50 text-red-600 border-red-300'
                                                        : done
                                                        ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                                                        : 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                                                    }`}
                                                  >
                                                    {isPR ? `✕ 確認取消？` : done ? `✓ ${stage}` : stage}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          )
                                        })()}

                                        {/* 送檢單位：預設只顯示已選取標籤，點按才展開選擇器 */}
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {intake.inspection_unit && (
                                            <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-lg bg-blue-600 text-white border border-blue-600">
                                              🔬 {intake.inspection_unit}
                                              <button onClick={() => quickPatch(intake.id, { inspectionUnit: null })}
                                                className="ml-1 opacity-70 hover:opacity-100">×</button>
                                            </span>
                                          )}
                                          {pickingUnitFor === intake.id ? (
                                            <div className="flex items-center gap-1 flex-wrap border border-blue-200 rounded-lg px-2 py-1 bg-blue-50">
                                              {inspectionUnits.map(u => (
                                                <button key={u} onClick={() => { quickPatch(intake.id, { inspectionUnit: u }); setPickingUnitFor(null) }}
                                                  className="text-xs px-2 py-0.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 group/unit relative">
                                                  {u}
                                                  <span onClick={e => { e.stopPropagation(); removeInspectionUnit(u) }}
                                                    className="hidden group-hover/unit:inline ml-1 opacity-60 hover:opacity-100">×</span>
                                                </button>
                                              ))}
                                              {addingUnitFor === intake.id ? (
                                                <div className="flex items-center gap-1">
                                                  <input autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') addInspectionUnit(); if (e.key === 'Escape') { setAddingUnitFor(null); setNewUnitName('') } }}
                                                    className="text-xs border border-gray-300 rounded-lg px-2 py-0.5 w-20 focus:outline-none focus:border-blue-400" placeholder="單位名稱" />
                                                  <button onClick={addInspectionUnit} className="text-xs text-blue-600 hover:text-blue-800">確認</button>
                                                  <button onClick={() => { setAddingUnitFor(null); setNewUnitName('') }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                                                </div>
                                              ) : (
                                                <button onClick={() => { setAddingUnitFor(intake.id); setNewUnitName('') }}
                                                  className="text-xs px-2 py-0.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500">+ 新增</button>
                                              )}
                                              <button onClick={() => { setPickingUnitFor(null); setAddingUnitFor(null) }}
                                                className="text-xs text-gray-400 hover:text-gray-600 ml-1">收合</button>
                                            </div>
                                          ) : (
                                            <button onClick={() => setPickingUnitFor(intake.id)}
                                              className="text-xs px-2 py-0.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500">
                                              {intake.inspection_unit ? '更改' : '🔬 設定送檢單位'}
                                            </button>
                                          )}
                                        </div>

                                        {/* 尺寸 + 重量 */}
                                        <div className="flex gap-1.5">
                                          <input
                                            type="text"
                                            value={quickEditMap[intake.id]?.size ?? intake.size ?? ''}
                                            onChange={e => setQuickEditMap(prev => ({ ...prev, [intake.id]: { ...prev[intake.id], size: e.target.value } }))}
                                            onBlur={() => {
                                              const val = quickEditMap[intake.id]?.size
                                              if (val !== undefined) quickPatch(intake.id, { size: val || null })
                                            }}
                                            placeholder="尺寸"
                                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-amber-400 placeholder-gray-300 min-w-0"
                                          />
                                          <input
                                            type="text"
                                            value={quickEditMap[intake.id]?.weight ?? intake.weight ?? ''}
                                            onChange={e => setQuickEditMap(prev => ({ ...prev, [intake.id]: { ...prev[intake.id], weight: e.target.value } }))}
                                            onBlur={() => {
                                              const val = quickEditMap[intake.id]?.weight
                                              if (val !== undefined) quickPatch(intake.id, { weight: val || null })
                                            }}
                                            placeholder="重量"
                                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-amber-400 placeholder-gray-300 min-w-0"
                                          />
                                        </div>
                                      </div>

                                      {/* 右欄：收件照縮圖 */}
                                      {intakePhoto && (
                                        <img src={intakePhoto} alt="收件照"
                                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100 self-start" />
                                      )}
                                    </div>
                                    {quickSaved === intake.id && (
                                      <p className="text-xs text-green-600 mt-1.5">✓ 已儲存</p>
                                    )}
                                  </div>
                                )
                              })()}
                              <div className="flex gap-1.5 flex-wrap items-center">
                                <Link
                                  href={`/new?edit=${intake.id}`}
                                  className="text-xs px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
                                >
                                  編輯
                                </Link>
                                <Link
                                  href={`/intake/${intake.id}/report`}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                                    intake.status === 'completed'
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                                  }`}
                                >
                                  {intake.status === 'completed' ? '查看報告' : '報告預覽'}
                                </Link>
                                {intake.status !== 'completed' && (
                                  <button
                                    onClick={() => generateReport(intake)}
                                    disabled={generating === intake.id}
                                    className="text-xs px-2.5 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                                  >
                                    {generating === intake.id ? '生成中...' : '生成報告'}
                                  </button>
                                )}
                                {intake.status === 'completed' && intake.report_path && (
                                  <a
                                    href={intake.report_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                  >
                                    下載 .docx
                                  </a>
                                )}
                                <button
                                  onClick={() => deleteItem(intake.id)}
                                  disabled={deleting === intake.id}
                                  className="text-xs px-2.5 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto disabled:opacity-40"
                                >
                                  {deleting === intake.id ? '刪除中…' : '🗑 刪除'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* X 光記錄 */}
                    {cxrays.map(xr => (
                      <Link
                        key={`xray-${xr.id}`}
                        href={`/xray/${xr.id}`}
                        className="pl-8 pr-4 py-2.5 flex items-center gap-3 hover:bg-purple-50 transition-colors"
                      >
                        <span className="text-xs text-purple-400 w-3 shrink-0">🔬</span>
                        <span className="font-mono text-xs text-purple-700 shrink-0">{xr.xray_code}</span>
                        <span className="text-sm text-gray-700 truncate flex-1">
                          {xr.item_type === '其他' && xr.item_type_custom ? xr.item_type_custom : xr.item_type}
                          {xr.angle ? <span className="text-gray-400 ml-1">· {xr.angle}</span> : null}
                        </span>
                        <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full shrink-0">X光</span>
                        {xr.doc_url && <span className="text-xs text-green-600 shrink-0">✓ 報告</span>}
                      </Link>
                    ))}

                    {/* 刪除整個資料夾（放在展開區底部，避免誤按） */}
                    <div className="px-4 py-2.5 flex justify-end border-t border-gray-50">
                      <button
                        onClick={() => { setConfirmInput(''); setDeleteTarget({ type: 'folder', customerName: cname }) }}
                        className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >🗑 刪除整個資料夾</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
