'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'

interface Intake {
  id: number
  customer_name: string
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  // 新建資料夾 Modal
  const [newFolderOpen,    setNewFolderOpen]    = useState(false)
  const [newFolderName,    setNewFolderName]    = useState('')
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)
  const [customerList,     setCustomerList]     = useState<string[]>([])
  const [folderSearch,     setFolderSearch]     = useState('')
  const [folderScanner,    setFolderScanner]    = useState(false)
  const [searchScanner,    setSearchScanner]    = useState(false)

  // 送檢單位管理
  const [inspectionUnits,  setInspectionUnits]  = useState<string[]>([])
  const [addingUnit,       setAddingUnit]        = useState(false)
  const [newUnitName,      setNewUnitName]       = useState('')
  // 快速儲存狀態
  const [quickSaved,       setQuickSaved]        = useState<number | null>(null)

  const openNewFolder = () => {
    setNewFolderName('')
    setFolderSearch('')
    setNewFolderOpen(true)
    fetch('/api/customers')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((list: any[]) => setCustomerList(Array.isArray(list) ? list.map((c: any) => c.name) : []))
  }

  const submitNewFolder = () => {
    if (!newFolderName.trim()) return
    setNewFolderOpen(false)
    router.push(`/scan?customer=${encodeURIComponent(newFolderName.trim())}`)
  }

  const handleFolderScan = async (scanned: string) => {
    setFolderScanner(false)
    // 先嘗試用條碼查詢對應客戶
    try {
      const res = await fetch(`/api/intakes?barcode=${encodeURIComponent(scanned)}`)
      const data = await res.json()
      if (data?.customer_name) {
        setNewFolderName(data.customer_name)
        setFolderSearch('')
        return
      }
    } catch { /* noop */ }
    // 查無結果：用掃描內容作為搜尋詞
    setFolderSearch(scanned)
  }

  const folderSuggestions = customerList.filter(n =>
    !folderSearch || n.toLowerCase().includes(folderSearch.toLowerCase())
  )

  const handleSearchScan = async (scanned: string) => {
    setSearchScanner(false)
    try {
      const res = await fetch(`/api/intakes?barcode=${encodeURIComponent(scanned)}`)
      const data = await res.json()
      if (data?.id) {
        router.push(`/new?edit=${data.id}`)
        return
      }
    } catch { /* noop */ }
    setSearch(scanned)
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

  const execDelete = async () => {
    if (!deleteTarget || !confirmReady) return
    if (deleteTarget.type === 'folder') {
      setDeleting(-1)
      await fetch(`/api/intakes?customerName=${encodeURIComponent(deleteTarget.customerName)}`, { method: 'DELETE' })
      setIntakes(prev => prev.filter(i => i.customer_name !== deleteTarget.customerName))
    } else {
      setDeleting(deleteTarget.id)
      await fetch(`/api/intakes/${deleteTarget.id}`, { method: 'DELETE' })
      setIntakes(prev => prev.filter(i => i.id !== deleteTarget.id))
    }
    setDeleting(null)
    setDeleteTarget(null)
    setConfirmInput('')
  }

  const todayYear  = new Date().getFullYear().toString()
  const todayMonth = new Date().getMonth() + 1
  const [selectedYear,  setSelectedYear]  = useState(todayYear)
  const [selectedMonth, setSelectedMonth] = useState(todayMonth)

  useEffect(() => {
    fetch('/api/intakes')
      .then(r => r.json())
      .then(data => { setIntakes(Array.isArray(data) ? data : []); setLoading(false) })
    fetch('/api/inspection-units')
      .then(r => r.json())
      .then(list => { if (Array.isArray(list)) setInspectionUnits(list) })
  }, [])

  const quickPatch = async (id: number, field: Record<string, string | null>) => {
    await fetch(`/api/intakes/${id}/quick`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    })
    const key = Object.keys(field)[0]
    const val = Object.values(field)[0]
    setIntakes(prev => prev.map(i => {
      if (i.id !== id) return i
      if (key === 'buildingType')    return { ...i, building_type:    val ?? '' }
      if (key === 'appraisalResult') return { ...i, appraisal_result: val ?? '' }
      if (key === 'inspectionUnit')  return { ...i, inspection_unit:  val ?? '' }
      return i
    }))
    setQuickSaved(id)
    setTimeout(() => setQuickSaved(s => s === id ? null : s), 1500)
  }

  const addInspectionUnit = async () => {
    if (!newUnitName.trim()) return
    const res = await fetch('/api/inspection-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUnitName.trim() }),
    })
    setInspectionUnits(await res.json())
    setNewUnitName('')
    setAddingUnit(false)
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
    const ms = new Set(
      intakes
        .filter(i => (i.submission_date || i.created_at)?.startsWith(selectedYear))
        .map(i => parseInt((i.submission_date || i.created_at)?.slice(5, 7) || '0'))
        .filter(m => m > 0)
    )
    return ms
  }, [intakes, selectedYear])

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

  // 依客戶名稱分組
  const customerGroups = useMemo(() => {
    const map = new Map<string, Intake[]>()
    for (const i of filtered) {
      const key = i.customer_name || '（未填客戶）'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    }
    return Array.from(map.entries())
  }, [filtered])

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

            {/* 搜尋現有客戶 */}
            {customerList.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-1.5">從現有客戶選擇</p>
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={folderSearch}
                    onChange={e => setFolderSearch(e.target.value)}
                    placeholder="搜尋客戶姓名…"
                    autoFocus
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => setFolderScanner(true)}
                    className="px-3 py-2 border border-amber-300 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 shrink-0"
                    title="掃描條碼查詢客戶"
                  >掃描</button>
                </div>
                {folderSuggestions.length > 0 && (
                  <div className="mt-1.5 max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                    {folderSuggestions.map(n => (
                      <button
                        key={n}
                        onClick={() => { setNewFolderName(n); setFolderSearch('') }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                          newFolderName === n
                            ? 'bg-amber-50 text-amber-800 font-semibold'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                        {newFolderName === n && <span className="ml-2 text-amber-600 text-xs">✓ 已選</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 分隔線 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-500">或輸入新客戶姓名</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* 手動輸入 / 已選顯示 */}
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitNewFolder()}
              placeholder="輸入客戶姓名"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-gray-600">建立後進入掃描頁，可批次掃描多件條碼</p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setNewFolderOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
              >取消</button>
              <button
                onClick={submitNewFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700 disabled:opacity-40"
              >建立 → 掃描</button>
            </div>
          </div>
        </div>
      )}

      {/* 資料夾搜尋掃描器 */}
      {folderScanner && (
        <BarcodeScanner onScan={handleFolderScan} onClose={() => setFolderScanner(false)} keepOpen={false} />
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
              <h2 className="font-bold text-base">
                {deleteTarget.type === 'folder' ? '刪除整個客戶資料夾' : '刪除此建單'}
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              {deleteTarget.type === 'folder'
                ? <>此操作將刪除 <span className="font-semibold text-gray-900">「{deleteTarget.customerName}」</span> 資料夾內的所有建單，無法復原。</>
                : <>此操作將刪除建單 <span className="font-mono font-semibold text-gray-900">{deleteTarget.itemCode}</span>（客戶：{deleteTarget.customerName}），無法復原。</>
              }
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
          <Link href="/new" className="flex-1 py-2.5 bg-amber-600 text-white text-sm rounded-xl font-semibold hover:bg-amber-700 text-center">
            新增報告
          </Link>
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
            {selectedYear} 年 {selectedMonth} 月 · {customerGroups.length} 位客戶 · 共 {filtered.length} 筆
          </p>
        )}

        {loading && <div className="text-center text-gray-400 py-12">載入中...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">📋</div>
            <p>{selectedYear} 年 {selectedMonth} 月 尚無建單</p>
            <Link href="/new" className="mt-3 inline-block text-amber-600 text-sm hover:underline">建立新建單 →</Link>
          </div>
        )}

        {/* 客戶資料夾分組（兩層折疊） */}
        <div className="space-y-2">
          {customerGroups.map(([cname, items]) => {
            const folderOpen = openFolders.has(cname)
            const submittedCount = items.filter(i => i.status === 'submitted').length
            const completedCount = items.filter(i => i.status === 'completed').length
            // 資料夾進度：全部 items 進度相同才顯示
            const stages = items.map(i => i.case_stage || '收件')
            const folderStage = stages.every(s => s === stages[0]) ? stages[0] : null
            return (
              <div key={cname} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* 第一層：資料夾標題（預設收合） */}
                <div
                  className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-amber-50 transition-colors select-none group"
                  onClick={() => toggleFolder(cname)}
                >
                  <span className="text-base">{folderOpen ? '📂' : '📁'}</span>
                  <span className="font-semibold text-gray-900">{cname}</span>
                  <span className="text-xs text-gray-600 ml-1">{items.length} 件</span>
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
                            {intake.case_stage && intake.case_stage !== '收件' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                                intake.case_stage === '完成' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700'
                              }`}>{intake.case_stage}</span>
                            )}
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
                              <div className="border border-gray-200 rounded-xl bg-white p-2.5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500 font-medium">快速編輯</span>
                                  {quickSaved === intake.id && <span className="text-xs text-green-600">✓ 已儲存</span>}
                                </div>

                                {/* 建單類型 */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs text-gray-400 w-12 shrink-0">類型</span>
                                  {BUILDING_TYPES.map(t => (
                                    <button key={t} onClick={() => quickPatch(intake.id, { buildingType: intake.building_type === t ? null : t })}
                                      className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${
                                        intake.building_type === t
                                          ? 'bg-amber-600 text-white border-amber-600'
                                          : 'border-gray-200 text-gray-600 hover:border-amber-400'
                                      }`}>{t}</button>
                                  ))}
                                </div>

                                {/* 鑑定結果 */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs text-gray-400 w-12 shrink-0">結果</span>
                                  {RESULT_TAGS.map(r => {
                                    const active = intake.appraisal_result === r.value
                                    return (
                                      <button key={r.label} onClick={() => quickPatch(intake.id, { appraisalResult: active ? null : r.value })}
                                        className={`text-xs px-2.5 py-0.5 rounded-lg border font-bold transition-colors ${
                                          active ? r.color : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                        }`}>{r.label}</button>
                                    )
                                  })}
                                </div>

                                {/* 送檢單位 */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs text-gray-400 w-12 shrink-0">送檢</span>
                                  {inspectionUnits.map(u => (
                                    <button key={u} onClick={() => quickPatch(intake.id, { inspectionUnit: intake.inspection_unit === u ? null : u })}
                                      className={`text-xs px-2 py-0.5 rounded-lg border transition-colors group/unit relative ${
                                        intake.inspection_unit === u
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'border-gray-200 text-gray-600 hover:border-blue-400'
                                      }`}>
                                      {u}
                                      <span onClick={e => { e.stopPropagation(); removeInspectionUnit(u) }}
                                        className="hidden group-hover/unit:inline ml-1 text-xs opacity-60 hover:opacity-100">×</span>
                                    </button>
                                  ))}
                                  {addingUnit ? (
                                    <div className="flex items-center gap-1">
                                      <input autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') addInspectionUnit(); if (e.key === 'Escape') setAddingUnit(false) }}
                                        className="text-xs border border-gray-300 rounded-lg px-2 py-0.5 w-20 focus:outline-none focus:border-blue-400" placeholder="單位名稱" />
                                      <button onClick={addInspectionUnit} className="text-xs text-blue-600 hover:text-blue-800">確認</button>
                                      <button onClick={() => { setAddingUnit(false); setNewUnitName('') }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setAddingUnit(true)}
                                      className="text-xs px-2 py-0.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500">+ 新增</button>
                                  )}
                                </div>
                              </div>
                              {/* 拍照子進度 */}
                              {intake.case_stage === '拍照' && (() => {
                                let ps: string[] = []
                                try { ps = JSON.parse(intake.photo_stages || '[]') } catch { /* noop */ }
                                return (
                                  <div className="flex gap-2">
                                    {(['主體照', '顯微照', '360'] as const).map(s => (
                                      <span key={s} className={`text-xs px-2 py-0.5 rounded-lg border ${
                                        ps.includes(s) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-gray-300 border-gray-100'
                                      }`}>
                                        {ps.includes(s) ? '✓ ' : ''}{s}
                                      </span>
                                    ))}
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
                                  onClick={() => { setConfirmInput(''); setDeleteTarget({ type: 'item', id: intake.id, itemCode: intake.item_code, customerName: intake.customer_name }) }}
                                  className="text-xs px-2.5 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto"
                                >
                                  🗑 刪除
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
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
