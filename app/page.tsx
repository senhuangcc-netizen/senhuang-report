'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
}

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

  const toggleFolder = (name: string) =>
    setOpenFolders(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })

  const toggleItem = (id: number) =>
    setOpenItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const deleteIntake = async (id: number) => {
    if (!confirm('確定要刪除這份建單嗎？此動作無法復原。')) return
    setDeleting(id)
    await fetch(`/api/intakes/${id}`, { method: 'DELETE' })
    setIntakes(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  const todayYear  = new Date().getFullYear().toString()
  const todayMonth = new Date().getMonth() + 1
  const [selectedYear,  setSelectedYear]  = useState(todayYear)
  const [selectedMonth, setSelectedMonth] = useState(todayMonth)

  useEffect(() => {
    fetch('/api/intakes')
      .then(r => r.json())
      .then(data => { setIntakes(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

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
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold text-gray-900 text-lg">東方森煌建單系統</h1>
          <p className="text-xs text-gray-400">Oriental Senhuang Intake System</p>
        </div>
        <div className="flex gap-2">
          <Link href="/labels" className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl font-medium hover:bg-gray-50">
            列印標籤
          </Link>
          <Link href="/new" className="px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700 shadow-sm">
            + 新增建單
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
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋客戶、編碼、類型..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 bg-white shadow-sm"
          />
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
          <p className="text-xs text-gray-400">
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
            return (
              <div key={cname} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* 第一層：資料夾標題（預設收合） */}
                <div
                  className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-amber-50 transition-colors select-none"
                  onClick={() => toggleFolder(cname)}
                >
                  <span className="text-base">{folderOpen ? '📂' : '📁'}</span>
                  <span className="font-semibold text-gray-900">{cname}</span>
                  <span className="text-xs text-gray-400 ml-1">{items.length} 件</span>
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
                            <span className="font-mono text-xs text-gray-500 shrink-0">{intake.item_code}</span>
                            <span className="text-sm text-gray-800 truncate flex-1">{itemName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.color}`}>{status.label}</span>
                          </div>

                          {/* 展開後：詳情 + 操作按鈕 */}
                          {itemOpen && (
                            <div className="pl-8 pr-4 pb-3 bg-gray-50 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 flex-wrap">
                                {intake.building_type && (
                                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">{intake.building_type}</span>
                                )}
                                {resultShort && <span className={`font-medium ${resultColor}`}>{resultShort}</span>}
                                <span>📅 {intake.submission_date || intake.created_at?.slice(0, 10)}</span>
                                <span>👤 {intake.operator}</span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap items-center">
                                <button
                                  onClick={() => router.push(`/new?edit=${intake.id}`)}
                                  className="text-xs px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white"
                                >
                                  編輯
                                </button>
                                <button
                                  onClick={() => router.push(`/intake/${intake.id}/report`)}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                                    intake.status === 'completed'
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                                  }`}
                                >
                                  {intake.status === 'completed' ? '查看報告' : '報告預覽'}
                                </button>
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
                                  onClick={() => deleteIntake(intake.id)}
                                  disabled={deleting === intake.id}
                                  className="text-xs px-2.5 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto disabled:opacity-40"
                                >
                                  {deleting === intake.id ? '刪除中...' : '🗑 刪除'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
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
