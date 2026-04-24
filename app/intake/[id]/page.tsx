'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CASE_STAGES } from '@/lib/formData'

interface Intake {
  id: number
  customer_name: string
  item_code: string
  barcode?: string
  card_number?: string
  card_status?: string
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
  operator?: string
  status?: string
  case_stage?: string
  photo_stages?: string
  inspection_unit?: string
  created_at?: string
  updated_at?: string
  report_path?: string
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5 break-words">{value}</dd>
    </div>
  )
}

export default function IntakePreviewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [intake, setIntake] = useState<Intake | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/intakes/${id}`)
      .then(r => r.json())
      .then(data => { setIntake(data.error ? null : data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">載入中...</div>
  }
  if (!intake) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3">
        <p>找不到此建單</p>
        <button onClick={() => router.push('/')} className="text-amber-600 text-sm hover:underline">← 返回列表</button>
      </div>
    )
  }

  const resultShort = intake.appraisal_result?.split('，')[0] || ''
  const resultColor = resultShort.includes('C.C.') ? 'text-green-600 bg-green-50 border-green-200'
    : resultShort.includes('I.C.') ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-orange-600 bg-orange-50 border-orange-200'

  let categoryData: Record<string, unknown> = {}
  try { categoryData = JSON.parse(intake.category_data || '{}') } catch { /* noop */ }

  let photos: Array<{ category: string; path: string }> = []
  try { photos = JSON.parse(intake.photos || '[]') } catch { /* noop */ }

  const statusLabel = intake.status === 'completed' ? '已完成' : '草稿'
  const statusColor = intake.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導覽 */}
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <h1 className="font-bold text-gray-900">建單預覽</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/intake/${id}/report`)}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg font-medium hover:bg-amber-700"
          >
            報告預覽
          </button>
          <button
            onClick={() => router.push(`/new?edit=${id}`)}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-50"
          >
            繼續編輯
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-12">

        {/* 標題卡 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{intake.customer_name}</h2>
              <p className="font-mono text-sm text-gray-400 mt-1">{intake.item_code}</p>
            </div>
            {resultShort && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border shrink-0 ${resultColor}`}>
                {resultShort}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {intake.building_type && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                {intake.building_type}
              </span>
            )}
            {intake.genuine_preset && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                ⭐ {intake.genuine_preset}
              </span>
            )}
            {intake.operator && (
              <span className="text-xs text-gray-400">👤 {intake.operator}</span>
            )}
          </div>
        </section>

        {/* 案件進度 */}
        {intake.case_stage && (
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">案件進度</h3>
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex gap-1.5 min-w-max">
                {CASE_STAGES.map((stage, idx) => {
                  const currentIdx = CASE_STAGES.indexOf(intake.case_stage as typeof CASE_STAGES[number])
                  return (
                    <span
                      key={stage}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                        stage === intake.case_stage
                          ? 'bg-amber-600 text-white border-amber-600'
                          : currentIdx > idx
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-white text-gray-400 border-gray-100'
                      }`}
                    >
                      {idx + 1}. {stage}
                    </span>
                  )
                })}
              </div>
            </div>
            {/* 拍照子進度 */}
            {(() => {
              let ps: string[] = []
              try { ps = JSON.parse(intake.photo_stages || '[]') } catch { /* noop */ }
              if (ps.length === 0) return null
              return (
                <div className="border-t pt-3 flex gap-3">
                  {(['主體照', '顯微照', '360'] as const).map(s => (
                    <span key={s} className={`text-xs px-2 py-1 rounded-lg border ${
                      ps.includes(s) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-gray-300 border-gray-100'
                    }`}>
                      {ps.includes(s) ? '✓ ' : ''}{s}
                    </span>
                  ))}
                </div>
              )
            })()}
          </section>
        )}

        {/* 基本資料 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">基本資料</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="送檢日" value={intake.submission_date} />
            <Field label="報告日" value={intake.report_date} />
            {intake.inspection_unit && <Field label="送檢單位" value={intake.inspection_unit} />}
            <Field label="尺寸 (mm)" value={intake.size} />
            <Field label="重量 (gram)" value={intake.weight} />
            {intake.barcode && <Field label="條碼" value={intake.barcode} />}
            {intake.card_number && (
              <div>
                <dt className="text-xs text-gray-400">鑑定卡號</dt>
                <dd className="text-sm text-gray-800 mt-0.5">
                  {intake.card_number}
                  {intake.card_status && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${intake.card_status === '正常' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {intake.card_status}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          {intake.appraisal_result && (
            <div className="mt-3 pt-3 border-t">
              <dt className="text-xs text-gray-400 mb-0.5">鑑定結果</dt>
              <dd className="text-sm text-gray-800">{intake.appraisal_result}</dd>
            </div>
          )}
          {intake.note && (
            <div className="mt-3 pt-3 border-t">
              <dt className="text-xs text-gray-400 mb-0.5">備註</dt>
              <dd className="text-sm text-gray-700">{intake.note}</dd>
            </div>
          )}
        </section>

        {/* 類別欄位 */}
        {Object.keys(categoryData).length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">類別欄位</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {Object.entries(categoryData).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-gray-400">{k}</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">
                    {Array.isArray(v) ? (v as string[]).join('、') : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* 照片 */}
        {photos.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">
              照片
              <span className="ml-2 text-xs text-gray-400 font-normal">{photos.length} 張</span>
            </h3>
            {(['主體照', '顯微照', '360照'] as const).map(cat => {
              const catPhotos = photos.filter(p => p.category === cat)
              if (!catPhotos.length) return null
              return (
                <div key={cat} className="mb-4 last:mb-0">
                  <p className="text-xs text-gray-500 mb-2">{cat}（{catPhotos.length}）</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {catPhotos.map((p, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                        <img
                          src={p.path}
                          alt={`${cat} ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* XRF PDF */}
        {intake.xrf_pdf_url && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">XRF 分析報告</h3>
            <a
              href={intake.xrf_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              📄 查看 PDF
            </a>
          </section>
        )}

        {/* 後設資料 */}
        <div className="text-xs text-gray-400 text-center space-y-1">
          <p>建立：{intake.created_at?.slice(0, 16)}</p>
          {intake.updated_at && intake.updated_at !== intake.created_at && (
            <p>最後更新：{intake.updated_at?.slice(0, 16)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
