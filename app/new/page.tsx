'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BUILDING_TYPES, BuildingType, APPRAISAL_RESULTS, GENUINE_PRESETS } from '@/lib/formData'
import SearchableSelect from '@/components/SearchableSelect'
import CategoryFields from '@/components/CategoryFields'
import PhotoUpload, { PhotoItem } from '@/components/PhotoUpload'
import BarcodeScanner from '@/components/BarcodeScanner'
import OperatorManager from '@/components/OperatorManager'

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

// 單位：古銅器/瓷器 → cm，其餘 → mm
const CM_TYPES: string[] = ['古銅器', '瓷器']

export default function NewIntakePage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  // 草稿追蹤
  const [draftId,    setDraftId]    = useState<number | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftSaving,setDraftSaving]= useState(false)
  const [existingPhotoData, setExistingPhotoData] = useState<{ category: string; path: string }[]>([])

  // 操作人員（動態從 API 載入）
  const [operators, setOperators] = useState<string[]>([])
  const [operator, setOperator] = useState('')
  const [showOperatorManager, setShowOperatorManager] = useState(false)

  useEffect(() => {
    fetch('/api/operators')
      .then(r => r.json())
      .then((list: string[]) => {
        setOperators(list)
        setOperator(prev => prev || list[0] || '')
      })
  }, [])

  // 客戶（含當月自動完成）
  const [customerName, setCustomerName] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])

  useEffect(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    fetch(`/api/customers?ym=${ym}`)
      .then(r => r.json())
      .then((list: string[]) => setCustomerSuggestions(list))
  }, [])

  // 客戶名稱變動時拉取下一個自動編碼預覽
  useEffect(() => {
    if (!customerName.trim()) { setItemCode(''); return }
    fetch(`/api/next-code?customerName=${encodeURIComponent(customerName)}`)
      .then(r => r.json())
      .then(d => { if (d.code) setItemCode(d.code) })
      .catch(() => {})
  }, [customerName])

  // 編碼：自動生成（字母+序號）
  const [itemCode, setItemCode] = useState('')
  const [, setItemBracket] = useState('')

  // 送檢日
  const [submissionDate, setSubmissionDate] = useState('')

  // 鑑定卡號：前綴字母（預設 C）+ 6 位數字
  const [cardPrefix, setCardPrefix] = useState('C')
  const [cardDigits, setCardDigits] = useState('')
  const cardNumber = cardPrefix + cardDigits

  const [cardStatus, setCardStatus] = useState('')
  const [cardInfo,   setCardInfo]   = useState<Record<string, string> | null>(null)
  const [cardLoading,setCardLoading]= useState(false)

  // 鑑定
  const [buildingType,    setBuildingType]    = useState<BuildingType | ''>('')
  const [appraisalResult, setAppraisalResult] = useState('')
  const [size,   setSize]   = useState('')
  const [weight, setWeight] = useState('')
  const [reportDate] = useState(today)
  const [note,   setNote]   = useState('')
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>({})
  const [genuinePreset, setGenuinePreset] = useState('')

  // 照片 / XRF
  const [photos,       setPhotos]       = useState<PhotoItem[]>([])
  const [xrfPdfUrl,    setXrfPdfUrl]    = useState('')
  const [xrfChartUrl,  setXrfChartUrl]  = useState('')
  const [xrfUploading, setXrfUploading] = useState(false)
  const [xrfCropping,  setXrfCropping]  = useState(false)
  const xrfFileRef = useRef<HTMLInputElement>(null)
  const [xrfDragging, setXrfDragging] = useState(false)
  const [folderName,   setFolderName]   = useState('')

  // UI
  const [showScanner, setShowScanner] = useState(false)
  const [barcode,     setBarcode]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  // 尺寸單位
  const sizeUnit = CM_TYPES.includes(buildingType) ? 'cm' : 'mm'

  // 真品模組：依鑑定結果過濾
  const activeResultType = appraisalResult.startsWith('C.C.') ? 'CC'
    : appraisalResult.startsWith('R.C.') ? 'RC' : null
  const isIC = appraisalResult.startsWith('I.C.')
  const filteredPresets = Object.entries(GENUINE_PRESETS).filter(
    ([, p]) => !activeResultType || p.resultType === activeResultType
  )

  // 切換鑑定結果時，若模組不符則清除
  useEffect(() => {
    if (!genuinePreset || !activeResultType) return
    const p = GENUINE_PRESETS[genuinePreset]
    if (p && p.resultType !== activeResultType) setGenuinePreset('')
  }, [appraisalResult])

  // 每種建檔類型對應的兩個來源欄位
  const BRACKET_KEYS: Record<string, [string, string]> = {
    '古玉器':   ['形制_朝代', '形制_器形'],
    '古銅器':   ['形制_年代', '形制_器形'],
    '瓷器':     ['形制_朝代', '形制_器形'],
    '粉質佛牌': ['師父出處',  '形制'],
    '金屬佛牌': ['師傅出處',  '形制'],
  }
  const [_k1, _k2] = BRACKET_KEYS[buildingType] ?? ['', '']
  const _bracketSrc1 = (_k1 ? (categoryData[_k1] || '') : '') as string
  const _bracketSrc2 = (_k2 ? (categoryData[_k2] || '') : '') as string

  useEffect(() => {
    const makeAbbrev = (s: string): string => {
      if (!s) return ''
      // 有中括號：直接取括號內英文字母，最多4碼
      const bm = s.match(/\[([^\]]+)\]/)
      if (bm) return bm[1].replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()
      // 無中括號：從英文部分自動縮寫
      const skip = new Set(['to', 'of', 'and', 'the', 'a', 'an', 'in', 'at', 'by'])
      const english = s.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
      const words = english.split(/[\s\-&\/]+/).filter(w => w.length > 0 && !skip.has(w.toLowerCase()))
      if (words.length === 0) return ''
      if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
      return words.map(w => w[0]).join('').slice(0, 4).toUpperCase()
    }
    const b1raw = makeAbbrev(_bracketSrc1)
    const b2raw = makeAbbrev(_bracketSrc2)
    // 兩個來源都有值：各取最多 2 碼（平均分配 4 碼額度）
    // 只有一個來源：最多取 4 碼
    const combined = (b1raw && b2raw)
      ? b1raw.slice(0, 2) + b2raw.slice(0, 2)
      : (b1raw || b2raw).slice(0, 4)
    setItemBracket(combined.slice(0, 4))
  }, [_bracketSrc1, _bracketSrc2])

  // 預填客戶名（URL ?customer=NAME）
  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get('customer')
    if (name) setCustomerName(decodeURIComponent(name))
  }, [])

  // 載入草稿（URL ?edit=ID）
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit')
    if (!editId) return
    fetch(`/api/intakes/${editId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return
        setDraftId(data.id)
        setCustomerName(data.customer_name || '')
        if (data.operator) setOperator(data.operator)

        // 解析編碼
        const code = data.item_code || ''
        const m = code.match(/^([A-Z]\d+)([A-Z]{3}\d{2})-?(.*)$/)
        if (m) {
          setItemPrefix(m[1] || 'C26')
          const rest = m[3] || ''
          const parts = rest.split('-')
          if (parts.length >= 2) {
            setItemBracket(parts[0])
            setItemSequence(parts.slice(1).join('-'))
          } else {
            setItemBracket('')
            setItemSequence(rest)
          }
        } else {
          setItemSequence(code)
        }

        // 解析鑑定卡號
        const cn = data.card_number || ''
        if (cn && /^[A-Za-z]/.test(cn)) {
          setCardPrefix(cn[0].toUpperCase())
          setCardDigits(cn.slice(1))
        } else {
          setCardDigits(cn)
        }

        setCardStatus(data.card_status || '')
        setBuildingType((data.building_type as BuildingType) || '')
        setAppraisalResult(data.appraisal_result || '')
        setSize(data.size || '')
        setWeight(data.weight || '')
        setSubmissionDate(data.submission_date || '')
        setNote(data.note || '')
        setGenuinePreset(data.genuine_preset || '')
        setFolderName(data.folder_name || '')
        try { setCategoryData(JSON.parse(data.category_data || '{}')) } catch { /* noop */ }
        try {
          const saved: { category: string; path: string }[] = JSON.parse(data.photos || '[]')
          setExistingPhotoData(saved)
          // 將已存照片還原到 PhotoUpload 顯示（用 Blob URL 作為 preview）
          setPhotos(saved.map(p => ({
            category: p.category as '主體照' | '顯微照' | '360照',
            preview: p.path,
            file: new File([], p.path.split('/').pop() || 'photo'),
            uploaded: true,
            savedPath: p.path,
          })))
        } catch { /* noop */ }
        setXrfPdfUrl(data.xrf_pdf_url || '')
        setXrfChartUrl(data.xrf_chart_url || '')
      })
  }, [])

  const uploadXrf = async (file: File) => {
    if (!file || file.type !== 'application/pdf') return
    setXrfUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folderName || 'xrf')
    fd.append('category', 'xrf')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { setXrfUploading(false); return }
    const { path } = await res.json()
    setXrfPdfUrl(path)
    setXrfUploading(false)

    // 自動裁切 XRF 圖表（背景執行，Render 冷啟動可能需要 30-60 秒）
    setXrfCropping(true)
    try {
      const cr = await fetch('/api/crop-xrf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: path }),
      })
      if (cr.ok) {
        const { chartUrl } = await cr.json()
        setXrfChartUrl(chartUrl)
        // 裁切完立刻回存 DB（不需用戶手動暫存）
        if (draftId && chartUrl) {
          fetch(`/api/intakes/${draftId}/xrf-chart`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xrfChartUrl: chartUrl }),
          }).catch(() => {/* ignore */})
        }
      }
    } catch { /* 裁切失敗不影響主流程 */ }
    setXrfCropping(false)
  }

  const buildPayload = (status = 'draft') => ({
    customerName,
    itemCode,
    barcode,
    cardNumber,
    cardStatus,
    buildingType,
    appraisalResult,
    size,
    weight,
    submissionDate,
    reportDate,
    note,
    categoryData,
    genuinePreset,
    photos: photos.filter(p => p.savedPath).map(p => ({ category: p.category, path: p.savedPath! })),
    xrfPdfUrl,
    xrfChartUrl,
    operator,
    status,
  })

  const lookupCard = async () => {
    if (!cardDigits) return
    setCardLoading(true)
    try {
      const res = await fetch(`/api/card?number=${encodeURIComponent(cardNumber.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setCardInfo(data)
        setCardStatus(data.status)
      } else {
        setCardInfo(null)
        setCardStatus('查無此卡號')
      }
    } finally {
      setCardLoading(false)
    }
  }

  const applyGenuinePreset = (preset: string) => {
    setGenuinePreset(preset)
    if (!preset) return
    const p = GENUINE_PRESETS[preset]
    if (p?.buildingType) setBuildingType(p.buildingType)
  }

  const saveDraft = async () => {
    setDraftSaving(true)
    try {
      let currentDraftId = draftId
      let currentFolderName = folderName

      if (!currentDraftId) {
        // 先建立草稿取得 folderName
        const res = await fetch('/api/intakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
        const data = await res.json()
        currentDraftId = data.id
        currentFolderName = data.folderPath?.split('/').pop() || ''
        setDraftId(currentDraftId)
        setFolderName(currentFolderName)
        window.history.replaceState({}, '', `/new?edit=${currentDraftId}`)
      }

      // 上傳尚未存入 Blob 的照片
      const updatedPhotos = [...photos]
      if (currentFolderName) {
        for (let i = 0; i < updatedPhotos.length; i++) {
          const p = updatedPhotos[i]
          if (!p.savedPath && p.file.size > 0) {
            const fd = new FormData()
            fd.append('file', p.file)
            fd.append('folder', currentFolderName)
            fd.append('category', p.category)
            const r = await fetch('/api/upload', { method: 'POST', body: fd })
            if (r.ok) {
              const { path } = await r.json()
              updatedPhotos[i] = { ...p, savedPath: path, uploaded: true }
            }
          }
        }
        setPhotos(updatedPhotos)
      }

      // PATCH 儲存（含完整照片清單）
      await fetch(`/api/intakes/${currentDraftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildPayload(),
          photos: updatedPhotos.filter(p => p.savedPath).map(p => ({ category: p.category, path: p.savedPath! })),
        }),
      })

      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch {
      setError('暫存失敗，請再試一次')
    } finally {
      setDraftSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName || !itemSequence || !buildingType || !appraisalResult || !submissionDate || !operator) {
      setError('請填寫所有必填欄位（*）')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (draftId) {
        await fetch(`/api/intakes/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload('submitted')),
        })
      } else {
        await fetch('/api/intakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload('submitted')),
        })
      }
      router.push('/')
    } catch {
      setError('送出失敗，請再試一次')
    } finally {
      setSubmitting(false)
    }
  }

  const cardStatusColor = cardInfo?.status === '正常' ? 'text-green-600 bg-green-50'
    : cardInfo?.status === '作廢' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導覽 */}
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600">←</button>
            <h1 className="font-bold text-gray-900 whitespace-nowrap">{draftId ? `編輯草稿 #${draftId}` : '新增建單'}</h1>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-900"
            >
              {operators.map(o => <option key={o} value={o} className="text-gray-900">{o}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setShowOperatorManager(true)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              title="管理人員"
            >
              ⚙️
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={saveDraft}
            disabled={draftSaving}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {draftSaving ? '暫存中...' : draftSaved ? '✓ 已暫存' : '暫存草稿'}
          </button>
          <button
            form="intake-form"
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? '送出中...' : '送出建單'}
          </button>
        </div>
      </div>

      <form id="intake-form" onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

        {/* 真品模組（可搜尋，CC/RC 連動） */}
        {!isIC && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <span>⭐</span> 真品模組（快速填寫）
              {activeResultType && (
                <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  {activeResultType} 模組
                </span>
              )}
            </h2>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <SearchableSelect
                  options={filteredPresets.map(([name]) => name)}
                  value={genuinePreset}
                  onChange={applyGenuinePreset}
                  placeholder={activeResultType ? `搜尋 ${activeResultType} 真品模組...` : '請先選擇鑑定結果'}
                />
              </div>
              {genuinePreset && (
                <button
                  type="button"
                  onClick={() => setGenuinePreset('')}
                  className="mt-0.5 text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
                >
                  ×
                </button>
              )}
            </div>
            {genuinePreset && (
              <p className="text-xs text-amber-600 mt-2">已套用「{genuinePreset}」— 仍需填寫尺寸、重量、照片</p>
            )}
            {!activeResultType && (
              <p className="text-xs text-amber-500 mt-2">選定鑑定結果（CC 或 RC）後，對應模組才會出現</p>
            )}
          </section>
        )}

        {/* 基本資料 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-800">基本資料</h2>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              掃描標籤
            </button>
          </div>

          {/* 已掃描標籤碼 */}
          {barcode && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-700 font-medium">標籤碼</span>
              <span className="font-mono text-sm text-amber-900 flex-1">{barcode}</span>
              <button type="button" onClick={() => setBarcode('')} className="text-amber-400 hover:text-amber-600 text-lg leading-none">×</button>
            </div>
          )}

          {/* 客戶名稱（含當月已有客戶自動完成） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客戶名稱 *</label>
            <input
              type="text"
              list="customer-suggestions"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
              placeholder={customerSuggestions.length > 0 ? '輸入或選擇當月客戶...' : '輸入客戶姓名'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
            />
            {customerSuggestions.length > 0 && (
              <datalist id="customer-suggestions">
                {customerSuggestions.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
            {customerSuggestions.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">↑ 選擇當月已有客戶可合入同一資料夾</p>
            )}
          </div>

          {/* 編碼（自動生成） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品項編碼</label>
            <div className="border border-dashed border-gray-300 rounded-xl px-3 py-2 bg-gray-50 font-mono text-sm text-gray-700 min-h-[38px] flex items-center">
              {itemCode
                ? <span className="text-amber-700 font-bold text-base">{itemCode}</span>
                : <span className="text-gray-300 text-xs">填入客戶名稱後自動產生</span>
              }
            </div>
            <p className="text-xs text-gray-400 mt-1">依資料夾字母（A→Z 循環）+ 件序自動分配，送出時確認</p>
          </div>

          {/* 鑑定卡號 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">鑑定卡號</label>
            <div className="flex gap-2">
              {/* 字母前綴，預設 C */}
              <input
                type="text"
                value={cardPrefix}
                onChange={e => setCardPrefix(e.target.value.toUpperCase().slice(0, 1) || 'C')}
                maxLength={1}
                placeholder="C"
                className="w-12 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 text-center font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              {/* 數字 */}
              <input
                type="text"
                value={cardDigits}
                onChange={e => setCardDigits(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && lookupCard()}
                maxLength={6}
                placeholder="5XXXXX"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={lookupCard}
                disabled={cardLoading || !cardDigits}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700 disabled:opacity-40"
              >
                {cardLoading ? '…' : '查詢'}
              </button>
            </div>
            {cardInfo && (
              <div className={`mt-2 rounded-xl p-3 text-sm ${cardStatusColor}`}>
                <span className="font-medium">{cardInfo.status}</span>
                {cardInfo.holder   && <span className="ml-2 text-gray-600">持有人：{cardInfo.holder}</span>}
                {cardInfo.category && <span className="ml-2 text-gray-600">品項：{cardInfo.category}</span>}
              </div>
            )}
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">送檢日 *</label>
              <input
                type="date"
                value={submissionDate}
                onChange={e => setSubmissionDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報告日（預設今日）</label>
              <input
                type="date"
                value={reportDate}
                readOnly
                className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          {/* 尺寸/重量（單位依建檔類型） */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                尺寸 ({sizeUnit})
              </label>
              <input
                type="text"
                value={size}
                onChange={e => setSize(e.target.value)}
                placeholder={sizeUnit === 'mm' ? '例：29.6*14.7*8.6' : '例：8.5*5.2*3.1'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重量 (gram)</label>
              <input
                type="text"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="例：3.2"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 鑑定結果（下拉） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">鑑定結果 *</label>
            <select
              value={appraisalResult}
              onChange={e => setAppraisalResult(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="" className="text-gray-400">— 選擇鑑定結果 —</option>
              {APPRAISAL_RESULTS.map(r => (
                <option key={r} value={r} className="text-gray-900">{r}</option>
              ))}
            </select>
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </section>

        {/* 建檔類型 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">建檔類型 *</h2>
          <div className="grid grid-cols-2 gap-2">
            {BUILDING_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setBuildingType(t); setCategoryData({}) }}
                className={`py-2 text-sm rounded-xl border transition-colors font-medium ${
                  buildingType === t
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-amber-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {buildingType && (
            <CategoryFields buildingType={buildingType} data={categoryData} onChange={setCategoryData} />
          )}
        </section>

        {/* 照片 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800 border-b pb-2">照片上傳</h2>
          <PhotoUpload photos={photos} onChange={setPhotos} folderName={folderName || undefined} />
        </section>

        {/* XRF PDF */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800 border-b pb-2">XRF 分析報告（PDF）</h2>
          <p className="text-xs text-gray-400">上傳儀器產出的 XRF PDF，系統會自動截取定量結果表格嵌入鑑定報告</p>
          <div className="flex items-center gap-3">
            <div
              onDragOver={e => { e.preventDefault(); setXrfDragging(true) }}
              onDragLeave={() => setXrfDragging(false)}
              onDrop={async e => {
                e.preventDefault(); setXrfDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) await uploadXrf(file)
              }}
              onClick={() => xrfFileRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl py-4 cursor-pointer transition-colors ${
                xrfDragging ? 'border-amber-400 bg-amber-50' :
                xrfPdfUrl   ? 'border-green-400 bg-green-50' :
                              'border-gray-200 hover:border-amber-400 bg-gray-50'
              }`}
            >
              <input
                ref={xrfFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={xrfUploading}
                onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadXrf(f) }}
              />
              {xrfUploading ? (
                <span className="text-sm text-gray-400">上傳中...</span>
              ) : xrfCropping ? (
                <span className="text-sm text-amber-600">截取 XRF 圖表中...</span>
              ) : xrfPdfUrl ? (
                <span className="text-sm text-green-600">{xrfChartUrl ? '✓ PDF 已上傳・圖表已截取' : '✓ PDF 已上傳（圖表截取中）'}</span>
              ) : (
                <>
                  <span className="text-sm text-gray-400">拖拉 PDF 至此，或點擊選擇檔案</span>
                  <span className="text-xs text-gray-300">僅接受 .pdf 格式</span>
                </>
              )}
            </div>
            {xrfPdfUrl && (
              <button type="button" onClick={() => setXrfPdfUrl('')} className="text-red-400 hover:text-red-600 text-sm px-2">
                移除
              </button>
            )}
          </div>
        </section>

        {/* 掃描器 */}
        {showScanner && (
          <BarcodeScanner onScan={text => { setBarcode(text); setShowScanner(false) }} onClose={() => setShowScanner(false)} />
        )}
      </form>

      {/* 人員管理 Modal */}
      {showOperatorManager && (
        <OperatorManager
          operators={operators}
          onUpdate={list => { setOperators(list); if (!list.includes(operator)) setOperator(list[0] || '') }}
          onClose={() => setShowOperatorManager(false)}
        />
      )}
    </div>
  )
}
