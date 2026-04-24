'use client'
import { FORM_OPTIONS, BuildingType } from '@/lib/formData'
import SearchableSelect from './SearchableSelect'
import CheckboxGroup from './CheckboxGroup'

interface Props {
  buildingType: BuildingType
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

// 從一段文字中分離中文 token 和英文 token
function groupZhEn(text: string): { zh: string[]; en: string[] } {
  const zh: string[] = []; const en: string[] = []
  const cleaned = text.replace(/\s*\[.*?\]/g, '').replace(/_/g, ' ').trim()
  for (const token of cleaned.split(/\s+/)) {
    if (!token) continue
    if (/[一-鿿]/.test(token)) zh.push(token)
    else en.push(token)
  }
  return { zh, en }
}

// 將多段文字合併後輸出「中文部分 英文部分」
function joinZhEn(texts: string[]): string {
  const zhAll: string[] = []; const enAll: string[] = []
  for (const t of texts) {
    const { zh, en } = groupZhEn(t)
    zhAll.push(...zh); enAll.push(...en)
  }
  return [zhAll.join(''), enAll.join(' ')].filter(Boolean).join(' ')
}

// 形制：從下拉選單依顯示順序組合，中文放前英文放後
function buildCategoryFromDropdowns(data: Record<string, unknown>, dropdownKeys: string[]): string {
  const texts = dropdownKeys.map(k => (typeof data[k] === 'string' ? data[k] as string : '')).filter(Boolean)
  return joinZhEn(texts)
}

// 材質：從 checkbox 陣列組合，中文放前英文放後
function buildMaterialText(values: string[]): string {
  return joinZhEn(values)
}

// 說明A→B→C，按 formData 選項順序排序組內項目
function buildDescFromABC(data: Record<string, unknown>, opts: Record<string, string[]>): string {
  const parts: string[] = []
  ;['說明A', '說明B', '說明C'].forEach(k => {
    const v = data[k]
    const optList = opts[k] || []
    if (Array.isArray(v) && v.length) {
      const sorted = [...(v as string[])].sort((a, b) => {
        const ai = optList.indexOf(a); const bi = optList.indexOf(b)
        return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
      })
      parts.push(...sorted)
    } else if (typeof v === 'string' && v) {
      parts.push(v)
    }
  })
  return parts.join('，')
}

export default function CategoryFields({ buildingType, data, onChange }: Props) {
  const opts = FORM_OPTIONS[buildingType]
  if (!opts) return null

  const update = (key: string, value: unknown) => onChange({ ...data, [key]: value })

  const dropdowns = Object.entries(opts).filter(([k]) => k.startsWith('形制') || k === '師父出處' || k === '師傅出處' || k === '期數' || k === '期數紀年')
  const checkboxes = Object.entries(opts).filter(([k]) => !k.startsWith('形制') && k !== '師父出處' && k !== '師傅出處' && k !== '期數' && k !== '期數紀年')
  const hasDesc = checkboxes.some(([k]) => k.startsWith('說明'))
  const dropdownKeys = dropdowns.map(([k]) => k)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {dropdowns.map(([key, options]) => (
          <SearchableSelect
            key={key}
            label={key}
            options={options}
            value={(data[key] as string) || ''}
            onChange={v => update(key, v)}
            placeholder={`選擇${key}...`}
            allowCustom
          />
        ))}
      </div>

      {/* 形制 可編輯欄位 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">形制 Category（最終內文）</label>
          <button
            type="button"
            onClick={() => update('形制_final', buildCategoryFromDropdowns(data, dropdownKeys))}
            className="text-xs px-2 py-1 bg-amber-50 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100"
          >
            從下拉選單自動填入
          </button>
        </div>
        <input
          type="text"
          value={(data['形制_final'] as string) || ''}
          onChange={e => update('形制_final', e.target.value)}
          placeholder="可直接輸入或點擊「從下拉選單自動填入」後修改..."
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
        />
        <p className="text-xs text-gray-400">此欄位留空時，報告將自動從上方下拉選單組合。</p>
      </div>

      <div className="space-y-4">
        {checkboxes.map(([key, options]) => (
          <div key={key}>
            <CheckboxGroup
              label={key}
              options={options}
              values={(data[key] as string[]) || []}
              onChange={v => update(key, v)}
              allowCustom
            />
            {/* 材質：CheckboxGroup 下方加可編輯欄位 */}
            {key === '材質' && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">材質 Material（最終內文）</label>
                  <button
                    type="button"
                    onClick={() => update('材質_final', buildMaterialText((data['材質'] as string[]) || []))}
                    className="text-xs px-2 py-1 bg-amber-50 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100"
                  >
                    從勾選自動填入
                  </button>
                </div>
                <input
                  type="text"
                  value={(data['材質_final'] as string) || ''}
                  onChange={e => update('材質_final', e.target.value)}
                  placeholder="可直接輸入或點擊「從勾選自動填入」後修改..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-gray-400">此欄位留空時，報告將自動從上方勾選組合。</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasDesc && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">鑑定說明（最終內文）</label>
            <button
              type="button"
              onClick={() => update('鑑定說明_final', buildDescFromABC(data, opts))}
              className="text-xs px-2 py-1 bg-amber-50 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100"
            >
              從 A/B/C 自動填入
            </button>
          </div>
          <textarea
            value={(data['鑑定說明_final'] as string) || ''}
            onChange={e => update('鑑定說明_final', e.target.value)}
            rows={6}
            placeholder="可直接輸入或點擊「從 A/B/C 自動填入」後修改..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500 resize-y leading-relaxed"
          />
          <p className="text-xs text-gray-400">此欄位留空時，報告將自動使用上方 A/B/C 勾選內容組合。</p>
        </div>
      )}
    </div>
  )
}
