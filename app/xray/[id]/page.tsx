'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SimplePhotoUpload from '@/components/SimplePhotoUpload'

type XrayRecord = {
  id: number
  customer_name: string
  barcode: string | null
  xray_code: string
  item_type: string
  item_type_custom: string | null
  angle: string | null
  angle_custom: string | null
  main_photos: string
  xray_photos: string
  operator: string | null
  note: string | null
  doc_url: string | null
  created_at: string
}

const ITEM_OPTIONS = ['金屬','木質','陶瓷','泥質','礦物玉石','塑料','其他']
const ITEM_EN: Record<string,string> = {
  '金屬':'Metal','木質':'Wood','陶瓷':'Ceramic','泥質':'Clay',
  '礦物玉石':'Mineral Stone','塑料':'Plastic','其他':'Other',
}
const ANGLE_OPTIONS = ['正面','頂部','底部','側面','俯/仰角','其他']
const ANGLE_EN: Record<string,string> = {
  '正面':'Front','頂部':'Top','底部':'Bottom','側面':'Side',
  '俯/仰角':'High/Low Angle','其他':'Other',
}

function checkLine(
  options: string[],
  enMap: Record<string,string>,
  selected: string | null,
  custom: string | null
) {
  return options.map(o => {
    const checked = o === selected
    const mark = checked ? '☑' : '□'
    const label = o === '其他' && checked && custom
      ? `其他 Other: ${custom}`
      : `${o} ${enMap[o] ?? ''}`
    return `${mark}${label}`
  }).join('  ')
}

function fmtDate(s: string) {
  const d = new Date(s)
  const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2,'0')}/${mn[d.getMonth()]}/${d.getFullYear()}`
}

export default function XrayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [rec, setRec] = useState<XrayRecord | null>(null)
  const [generating, setGenerating] = useState(false)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const resolvedId = useRef<string>('')

  // X光照管理狀態
  const [editPhotos, setEditPhotos] = useState(false)
  const [editXrayPhotos, setEditXrayPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [photoSaved, setPhotoSaved] = useState(false)
  // 收件照管理狀態
  const [editMain, setEditMain] = useState(false)
  const [editMainPhotos, setEditMainPhotos] = useState<string[]>([])
  const [uploadingMain, setUploadingMain] = useState(false)
  const [savingMain, setSavingMain] = useState(false)
  const [mainSaved, setMainSaved] = useState(false)

  useEffect(() => {
    params.then(p => {
      resolvedId.current = p.id
      fetch(`/api/xray/${p.id}`)
        .then(r => r.json())
        .then((data: XrayRecord) => {
          setRec(data)
          setDocUrl(data.doc_url)
          setEditXrayPhotos(JSON.parse(data.xray_photos || '[]'))
          setEditMainPhotos(JSON.parse(data.main_photos || '[]'))
        })
    })
  }, [params])

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/xray/${resolvedId.current}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成失敗')
      setDocUrl(data.doc_url)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  const savePhotos = async () => {
    if (!rec) return
    setSavingPhotos(true)
    try {
      await fetch(`/api/xray/${resolvedId.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: rec.item_type,
          itemTypeCustom: rec.item_type_custom,
          angle: rec.angle,
          angleCustom: rec.angle_custom,
          mainPhotos: JSON.parse(rec.main_photos || '[]'),
          xrayPhotos: editXrayPhotos,
          operator: rec.operator,
          note: rec.note,
        }),
      })
      setRec(prev => prev ? { ...prev, xray_photos: JSON.stringify(editXrayPhotos) } : prev)
      setEditPhotos(false)
      setPhotoSaved(true)
      setTimeout(() => setPhotoSaved(false), 2000)
    } finally {
      setSavingPhotos(false)
    }
  }

  const saveMainPhotos = async () => {
    if (!rec) return
    setSavingMain(true)
    try {
      await fetch(`/api/xray/${resolvedId.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: rec.item_type,
          itemTypeCustom: rec.item_type_custom,
          angle: rec.angle,
          angleCustom: rec.angle_custom,
          mainPhotos: editMainPhotos,
          xrayPhotos: JSON.parse(rec.xray_photos || '[]'),
          operator: rec.operator,
          note: rec.note,
        }),
      })
      setRec(prev => prev ? { ...prev, main_photos: JSON.stringify(editMainPhotos) } : prev)
      setEditMain(false)
      setMainSaved(true)
      setTimeout(() => setMainSaved(false), 2000)
    } finally {
      setSavingMain(false)
    }
  }

  if (!rec) return <div className="flex items-center justify-center min-h-screen text-gray-500">載入中…</div>

  const xrayPhotos: string[] = JSON.parse(rec.xray_photos || '[]')
  const mainPhotos: string[] = JSON.parse(rec.main_photos || '[]')
  const xrayImgUrl = xrayPhotos[0] ?? null

  const itemLine  = checkLine(ITEM_OPTIONS,  ITEM_EN,  rec.item_type, rec.item_type_custom)
  const angleLine = checkLine(ANGLE_OPTIONS, ANGLE_EN, rec.angle,     rec.angle_custom)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 操作列 */}
      <header className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm z-40">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">X光顯影報告</h1>
          <p className="text-xs text-gray-500">{rec.customer_name}｜{rec.xray_code}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/xray/new?edit=${resolvedId.current}`)}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 font-medium">
            編輯
          </button>
          {docUrl && (
            <a href={docUrl} download
              className="px-3 py-1.5 border border-green-400 text-green-700 text-sm rounded-lg hover:bg-green-50 font-medium">
              下載 .docx
            </a>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium">
            {generating ? '生成中…' : docUrl ? '重新生成' : '生成報告 .docx'}
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-3xl mx-auto mt-3 px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        </div>
      )}

      {/* 報告預覽（A4 比例） */}
      <div className="flex justify-center p-4 pb-4">
        <div className="bg-white shadow-md"
          style={{ width: 794, fontFamily: 'PMingLiU, "Microsoft JhengHei", serif', color: '#111' }}>
          <div style={{ padding: '48px 60px' }}>

            {/* 標題 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', textDecoration: 'underline', color: '#111' }}>
                東方森煌古物鑑定所 X-RAY 顯影圖
              </div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                Asia SenHuang Authentication X-ray Radiograph
              </div>
            </div>

            {/* 編號 + 日期 */}
            <div style={{ fontSize: 13, marginBottom: 12, display: 'flex', gap: 48 }}>
              <span style={{ color: '#111' }}>
                編號NO：<span style={{ fontFamily: 'monospace' }}>{rec.xray_code}</span>
              </span>
              <span style={{ color: '#111' }}>
                日期<span style={{ color: '#888' }}>S Date</span>：{fmtDate(rec.created_at)}
              </span>
            </div>

            {/* 品項 + 角度 */}
            <div style={{ border: '1px solid #ccc', marginBottom: 12 }}>
              <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e5e5', fontSize: 13 }}>
                <span style={{ color: '#888' }}>Item: </span>
                <span style={{ color: '#111' }}>{itemLine}</span>
              </div>
              <div style={{ padding: '6px 12px', fontSize: 13 }}>
                <span style={{ color: '#888' }}>Angle: </span>
                <span style={{ color: '#111' }}>{angleLine}</span>
              </div>
            </div>

            {/* 顯影圖標籤 */}
            <div style={{ fontSize: 13, marginBottom: 6, color: '#111' }}>
              顯影圖 <span style={{ color: '#888' }}>Item Radiograph</span>：
            </div>

            {/* X 光照：填滿框架，高度限 360 保持 A4 版面 */}
            <div style={{
              border: '1px solid #ccc',
              height: 360,
              overflow: 'hidden',
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {xrayImgUrl
                ? <img
                    src={xrayImgUrl}
                    alt="X光顯影"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                : <span style={{ color: '#666', fontSize: 13 }}>尚無 X 光照片</span>
              }
            </div>

            {/* 備註 */}
            <div style={{ border: '1px solid #ccc', borderTop: 'none', padding: '6px 12px', fontSize: 13, marginBottom: 16 }}>
              <span style={{ color: '#111' }}>備註</span><span style={{ color: '#888' }}>Note</span>：
              <span style={{ color: '#111' }}>{rec.note || ''}</span>
            </div>

            {/* 主體照（參考，不進報告） */}
            {mainPhotos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>主體照（參考，不含在報告內）</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {mainPhotos.map((p, i) => (
                    <img key={i} src={p} alt=""
                      style={{ height: 96, width: 96, objectFit: 'cover', border: '1px solid #e5e5e5', borderRadius: 4 }} />
                  ))}
                </div>
              </div>
            )}

            {/* 頁腳 */}
            <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 10, textAlign: 'center', fontSize: 11, color: '#aaa' }}>
              TEL: +8862-82602664 ｜ Web: www.senhuang.org ｜ Email: info@senhuang.org
            </div>

          </div>
        </div>
      </div>

      {/* 照片管理區 */}
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">X光照管理</h2>
            <div className="flex gap-2 items-center">
              {photoSaved && <span className="text-xs text-green-600">✓ 已儲存</span>}
              {editPhotos ? (
                <>
                  <button
                    onClick={() => { setEditPhotos(false); setEditXrayPhotos(xrayPhotos) }}
                    className="text-xs px-2.5 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >取消</button>
                  <button
                    onClick={savePhotos}
                    disabled={savingPhotos || uploadingPhotos}
                    className="text-xs px-2.5 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >{savingPhotos ? '儲存中…' : uploadingPhotos ? '上傳中…' : '儲存照片'}</button>
                </>
              ) : (
                <button
                  onClick={() => { setEditPhotos(true); setEditXrayPhotos(xrayPhotos) }}
                  className="text-xs px-2.5 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50"
                >
                  {xrayPhotos.length > 0 ? '編輯／補充照片' : '＋ 上傳 X光照'}
                </button>
              )}
            </div>
          </div>

          {!editPhotos && xrayPhotos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {xrayPhotos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={p} alt={`X光照 ${i+1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-center py-0.5 text-xs">主照</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!editPhotos && xrayPhotos.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">尚未上傳 X光照片，點「上傳 X光照」新增</p>
          )}

          {editPhotos && (
            <SimplePhotoUpload
              paths={editXrayPhotos}
              onChange={setEditXrayPhotos}
              onUploadingChange={setUploadingPhotos}
              folder={`xray_${rec.customer_name.replace(/[/\\:*?"<>|]/g, '_')}`}
              category="X光照"
            />
          )}
        </div>

        {/* 收件照（主體照）管理 — 只供確認，不含在生成報告中 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">收件照（主體照）</h2>
              <p className="text-xs text-gray-400">只供確認，不含在生成的報告中</p>
            </div>
            <div className="flex gap-2 items-center">
              {mainSaved && <span className="text-xs text-green-600">✓ 已儲存</span>}
              {editMain ? (
                <>
                  <button
                    onClick={() => { setEditMain(false); setEditMainPhotos(mainPhotos) }}
                    className="text-xs px-2.5 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >取消</button>
                  <button
                    onClick={saveMainPhotos}
                    disabled={savingMain || uploadingMain}
                    className="text-xs px-2.5 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >{savingMain ? '儲存中…' : uploadingMain ? '上傳中…' : '儲存照片'}</button>
                </>
              ) : (
                <button
                  onClick={() => { setEditMain(true); setEditMainPhotos(mainPhotos) }}
                  className="text-xs px-2.5 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  {mainPhotos.length > 0 ? '編輯' : '＋ 上傳'}
                </button>
              )}
            </div>
          </div>

          {!editMain && mainPhotos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {mainPhotos.map((p, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={p} alt={`收件照 ${i+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {!editMain && mainPhotos.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">尚未上傳收件照</p>
          )}

          {editMain && (
            <SimplePhotoUpload
              paths={editMainPhotos}
              onChange={setEditMainPhotos}
              onUploadingChange={setUploadingMain}
              folder={`xray_${rec.customer_name.replace(/[/\\:*?"<>|]/g, '_')}`}
              category="收件照"
            />
          )}
        </div>
      </div>
    </div>
  )
}
