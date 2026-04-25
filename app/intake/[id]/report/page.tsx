'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Intake {
  id: number
  customer_name: string
  item_code: string
  building_type?: string
  appraisal_result?: string
  size?: string
  weight?: string
  submission_date?: string
  report_date?: string
  note?: string
  category_data?: string
  genuine_preset?: string
  photos?: string
  xrf_pdf_url?: string
  xrf_chart_url?: string
  operator?: string
  status?: string
  report_path?: string
}

type CD = Record<string, string | string[]>
type Photo = { category: string; path: string }

function cdVal(cd: CD, key: string): string {
  const v = cd[key]
  if (Array.isArray(v)) return v.join('、')
  return typeof v === 'string' ? v : ''
}

function materialField(cd: CD): string {
  const final = cdVal(cd, '材質_final')
  if (final) return final
  const v = cd['材質']
  const items: string[] = Array.isArray(v) ? v as string[] : (v ? [v as string] : [])
  if (!items.length) return ''
  const zh: string[] = []; const en: string[] = []
  for (const item of items) {
    const cleaned = item.replace(/_/g, ' ').trim()
    for (const token of cleaned.split(/\s+/)) {
      if (!token) continue
      if (/[一-鿿]/.test(token)) zh.push(token)
      else en.push(token)
    }
  }
  return [zh.join(''), en.join(' ')].filter(Boolean).join(' ')
}

function categoryField(cd: CD): string {
  const final = cdVal(cd, '形制_final')
  if (final) return final
  const order = ['師父出處', '師傅出處', '形制', '形制_器形', '形制_年代', '形制_朝代', '形制_紋飾', '形制_材質', '期數', '期數紀年']
  const values = order.map(k => cdVal(cd, k)).filter(Boolean)
  const zhParts: string[] = []
  const enParts: string[] = []
  for (const val of values) {
    const cleaned = val.replace(/\s*\[.*?\]/g, '').trim()
    for (const token of cleaned.split(/\s+/)) {
      if (!token) continue
      if (/[一-鿿]/.test(token)) zhParts.push(token)
      else enParts.push(token)
    }
  }
  return [zhParts.join(''), enParts.join(' ')].filter(Boolean).join(' ')
}

function description(cd: CD): string {
  const final = cdVal(cd, '鑑定說明_final')
  if (final) return final
  const parts: string[] = []
  ;['說明A', '說明B', '說明C'].forEach(k => {
    const v = cd[k]
    if (Array.isArray(v) && v.length) parts.push(...v)
    else if (typeof v === 'string' && v) parts.push(v)
  })
  return parts.join('，')
}

function microscopic(cd: CD): string { return cdVal(cd, '顯微特徵') }

// ── docx-preview 渲染元件（僅在有 report_path 時使用）──
function DocxViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!containerRef.current) return
    import('docx-preview').then(({ renderAsync }) => {
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => renderAsync(buf, containerRef.current!, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderChanges: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        }))
        .catch(() => setErr('無法載入 .docx 檔案'))
    })
  }, [url])

  if (err) return <p className="text-center text-red-400 text-sm py-8">{err}</p>
  return <div ref={containerRef} className="docx-wrapper" />
}

// ── HTML 草稿預覽（沒有 report_path 時的備用方案）──
function DraftPreview({ intake }: { intake: Intake }) {
  let cd: CD = {}
  try { cd = JSON.parse(intake.category_data || '{}') } catch { /* noop */ }

  let photos: Photo[] = []
  try { photos = JSON.parse(intake.photos || '[]') } catch { /* noop */ }

  const front  = photos.find(p => p.category === '主體照')?.path
  const micro1 = photos.filter(p => p.category === '顯微照')[0]?.path
  const micro2 = photos.filter(p => p.category === '顯微照')[1]?.path

  const desc   = description(cd)
  const mat    = materialField(cd)
  const cat    = categoryField(cd)
  const micro  = microscopic(cd)
  const result = intake.appraisal_result || ''
  const resultShort = result.split('，')[0] || ''
  const presumed = cat || intake.genuine_preset || ''

  const isCC = resultShort.includes('C.C.')
  const isIC = resultShort.includes('I.C.')
  const resultBg     = isCC ? '#dcfce7' : isIC ? '#fee2e2' : '#fff7ed'
  const resultBorder = isCC ? '#16a34a' : isIC ? '#dc2626' : '#ea580c'

  const sizeLabel = ['古銅器', '瓷器'].includes(intake.building_type || '') ? 'cm' : 'mm'

  const fmtDate = (s?: string) => {
    if (!s) return ''
    const [y, m, d] = s.split('-')
    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${d}/${mn[parseInt(m)-1]}/${y}`
  }

  const FONT = '"PMingLiU", "新細明體", "MingLiU", "細明體", "SimSun", serif'
  const PT12: React.CSSProperties = { fontSize: '12pt', lineHeight: '1.6', color: '#111' }

  const td: React.CSSProperties = {
    border: '1px solid #888',
    padding: '2pt 5pt',
    verticalAlign: 'top',
    ...PT12,
  }
  const tdPhoto: React.CSSProperties = {
    border: '1px solid #888',
    padding: 0,
    verticalAlign: 'top',
    overflow: 'hidden',
  }
  const label: React.CSSProperties = {
    ...PT12,
    display: 'block',
    marginBottom: '1pt',
  }

  const PhotoCell = ({ src, alt, placeholder, height }: { src?: string; alt: string; placeholder: string; height: number }) => (
    <div style={{ width: '100%', height, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src
        ? <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ fontSize: '10pt', color: '#bbb' }}>{placeholder}</span>
      }
    </div>
  )

  return (
    <ScaledA4Wrapper>
    <div id="draft-report"
      style={{ width: '794px', minHeight: '1123px', margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', padding: '72px', fontFamily: FONT, position: 'relative', boxSizing: 'border-box', color: '#111' }}>

      {/* 標題 */}
      <div style={{ textAlign: 'center', marginBottom: '6pt', paddingBottom: '4pt' }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#111', textDecoration: 'underline' }}>
          東方森煌古物鑑定所檢驗報告
        </div>
        <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#111', marginTop: '2pt' }}>
          Asia SenHuang Authentication Analysis Report
        </div>
      </div>

      <div style={{ marginBottom: '2pt', ...PT12 }}>
        送驗編號 NO：{intake.item_code}
      </div>

      {/* 送檢日 / 報告日 */}
      <div style={{ marginBottom: '2pt', display: 'flex', gap: '48pt', ...PT12 }}>
        <span>送檢日期 S Date：{fmtDate(intake.submission_date)}</span>
        <span>報告日期 R Date：{fmtDate(intake.report_date)}</span>
      </div>

      {presumed && (
        <div style={{ marginBottom: '2pt', ...PT12 }}>
          顧客推估年代/形制 Presumed by customers：{presumed}
        </div>
      )}
      <div style={{ marginBottom: '2pt', ...PT12 }}>送檢相關圖片 Item Pix：</div>

      {/* 主表格 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '50.5%' }} />
          <col style={{ width: '25.2%' }} />
          <col style={{ width: '24.3%' }} />
        </colgroup>

        {/* 照片行 */}
        <tr>
          <td style={tdPhoto}><PhotoCell src={front} alt="主體照" placeholder="主體照" height={275} /></td>
          <td colSpan={2} style={tdPhoto}>
            {intake.xrf_chart_url ? (
              <div style={{ width: '100%', height: 275, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                <img src={intake.xrf_chart_url} alt="XRF 定量分析" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
            ) : intake.xrf_pdf_url ? (
              <a href={intake.xrf_pdf_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 275, textDecoration: 'none', color: '#2563eb' }}>
                <span style={{ fontSize: '32pt' }}>📄</span>
                <span style={{ fontSize: '10pt', marginTop: '4pt', textAlign: 'center' }}>XRF 定量分析<br/>點擊查看 PDF</span>
              </a>
            ) : (
              <div style={{ height: 275, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10pt', color: '#bbb' }}>XRF 元素分析數據圖</span>
              </div>
            )}
          </td>
        </tr>

        {/* 顯微照行 */}
        <tr>
          <td style={tdPhoto}><PhotoCell src={micro1} alt="顯微照 1" placeholder="顯微照 1" height={255} /></td>
          <td colSpan={2} style={tdPhoto}><PhotoCell src={micro2} alt="顯微照 2" placeholder="顯微照 2" height={255} /></td>
        </tr>

        {/* 尺寸 / 重量 */}
        <tr>
          <td colSpan={2} style={{ ...td, textAlign: 'center' }}>
            <span style={{ ...label, textAlign: 'left' }}>尺寸 Size：{sizeLabel}</span>
            {intake.size || '—'}
          </td>
          <td style={{ ...td, textAlign: 'center' }}>
            <span style={{ ...label, textAlign: 'left' }}>重量 Weight：gram</span>
            {intake.weight || '—'}
          </td>
        </tr>

        {/* 材質 / 形制 */}
        <tr>
          <td style={td}>
            <span style={label}>材質 Material：</span>
            {mat || '—'}
          </td>
          <td colSpan={2} style={td}>
            <span style={label}>形制 Category：</span>
            {cat || '—'}
          </td>
        </tr>

        {/* 鑑定說明 */}
        <tr>
          <td colSpan={3} style={td}>
            <span style={label}>鑑定說明 Description：</span>
            {desc
              ? <span style={{ lineHeight: '1.8' }}>{desc}</span>
              : <span style={{ color: '#bbb', fontStyle: 'italic' }}>（待生成鑑定說明）</span>
            }
          </td>
        </tr>

        {/* 鑑定結果 / 備註 */}
        <tr>
          <td colSpan={2} style={{ ...td, background: resultBg }}>
            <span style={label}>鑑定結果 Result：</span>
            <strong style={{ color: resultBorder, fontSize: '12pt' }}>{result || '—'}</strong>
          </td>
          <td style={td}>
            <span style={label}>備註 Note：</span>
            {intake.note || ''}
          </td>
        </tr>
      </table>

      <div style={{ marginTop: '10pt', textAlign: 'center', fontSize: '10pt', color: '#888', borderTop: '1px solid #ddd', paddingTop: '6pt' }}>
        TEL: +8862-82602664 &nbsp;｜&nbsp; Web: www.senhuang.org &nbsp;｜&nbsp; Email: info@senhuang.org
      </div>

      {/* 草稿浮水印（列印時顯示） */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(-30deg)',
        fontSize: '80pt', color: 'rgba(0,0,0,0.04)',
        fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
      }}>
        草稿預覽
      </div>
    </div>
    </ScaledA4Wrapper>
  )
}

// ── 手機縮放 wrapper：保持 794px 寬度但等比縮小到螢幕寬 ──
function ScaledA4Wrapper({ children }: { children: React.ReactNode }) {
  const REPORT_WIDTH = 794
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const available = el.parentElement?.clientWidth ?? window.innerWidth
      setScale(Math.min(1, available / REPORT_WIDTH))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div className="report-scale-wrapper" style={{ zoom: scale } as React.CSSProperties}>
        {children}
      </div>
    </div>
  )
}

// ── 主頁面 ──
export default function ReportPreviewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [intake, setIntake] = useState<Intake | null>(null)
  const [loading, setLoading] = useState(true)
  const [cropping, setCropping] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    fetch(`/api/intakes/${id}`)
      .then(r => r.json())
      .then(d => { setIntake(d.error ? null : d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const generateReport = async () => {
    if (!intake) return
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeId: intake.id, operator: intake.operator }),
      })
      const data = await res.json()
      if (data.success && data.report_url) {
        setIntake(prev => prev ? { ...prev, report_path: data.report_url } : prev)
      } else {
        setGenError(data.error || '生成失敗，請稍後再試')
      }
    } catch {
      setGenError('生成失敗，請稍後再試')
    } finally {
      setGenerating(false)
    }
  }

  const reCropXrf = async () => {
    if (!intake?.xrf_pdf_url) return
    setCropping(true)
    try {
      const cr = await fetch('/api/crop-xrf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: intake.xrf_pdf_url }),
      })
      if (cr.ok) {
        const { chartUrl } = await cr.json()
        await fetch(`/api/intakes/${id}/xrf-chart`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xrfChartUrl: chartUrl }),
        })
        setIntake(prev => prev ? { ...prev, xrf_chart_url: chartUrl } : prev)
      }
    } catch { /* ignore */ }
    setCropping(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">載入中...</div>
  )
  if (!intake) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
      <p>找不到此建單</p>
      <button onClick={() => router.push('/')} className="text-amber-600 text-sm hover:underline">← 返回</button>
    </div>
  )

  const hasDocx = !!intake.report_path

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          body > div { background: white !important; min-height: auto !important; padding: 0 !important; }
          #draft-report {
            margin: 0 !important;
            padding: 72px !important;
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .report-scale-wrapper { zoom: 1 !important; }
        }
        .docx-wrapper { background: #e5e7eb !important; padding: 24px 0; }
        .docx-wrapper section.docx { box-shadow: 0 2px 12px rgba(0,0,0,0.15); margin: 0 auto; }
      `}</style>
      {/* 工具列 */}
      <div className="print:hidden sticky top-0 z-40 bg-white border-b shadow-sm px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/intake/${id}`)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
            <h1 className="font-bold text-gray-900 text-sm">報告預覽</h1>
            {!hasDocx && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">草稿</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {!hasDocx && intake.xrf_pdf_url && !intake.xrf_chart_url && (
              <button onClick={reCropXrf} disabled={cropping}
                className="px-3 py-1.5 text-sm border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50">
                {cropping ? '截取中...' : '截取 XRF 圖表'}
              </button>
            )}
            {!hasDocx && (
              <button onClick={generateReport} disabled={generating}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium">
                {generating ? '生成中...' : '生成報告 .docx'}
              </button>
            )}
            {hasDocx && (
              <a href={intake.report_path!} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                下載 .docx
              </a>
            )}
            <button onClick={() => window.print()}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              列印
            </button>
            <button onClick={() => {
              const prev = document.title
              document.title = intake.item_code || '鑑定報告'
              window.print()
              document.title = prev
            }}
              className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-900">
              存 PDF
            </button>
          </div>
        </div>
        {genError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{genError}</p>
        )}
      </div>

      {/* 報告內容 */}
      {hasDocx ? (
        // 有正式 .docx → 用 docx-preview 渲染，完全還原
        <div className="py-6 px-4">
          <style>{`
            .docx-wrapper { background: #e5e7eb !important; padding: 24px 0; }
            .docx-wrapper section.docx { box-shadow: 0 2px 12px rgba(0,0,0,0.15); margin: 0 auto; }
          `}</style>
          <DocxViewer url={intake.report_path!} />
        </div>
      ) : (
        // 草稿 → HTML 預覽表格
        <>
          <DraftPreview intake={intake} />
          <p className="print:hidden text-center text-xs text-gray-400 pb-6">
            此為草稿預覽。送出建單後點「生成報告」即可產出正式 Word 文件，預覽將自動切換為完整版面。
          </p>
        </>
      )}
    </div>
  )
}
