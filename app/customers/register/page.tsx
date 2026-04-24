'use client'
import { useState } from 'react'
import { BUILDING_TYPES } from '@/lib/formData'

const COLLECTION_TYPES = [...BUILDING_TYPES, '其他'] as const
const GENDERS = ['先生', '女士', '不填'] as const

export default function CustomerRegisterPage() {
  const [name,            setName]            = useState('')
  const [gender,          setGender]          = useState('')
  const [phone,           setPhone]           = useState('')
  const [lineId,          setLineId]          = useState('')
  const [birthday,        setBirthday]        = useState('')
  const [address,         setAddress]         = useState('')
  const [collectionTypes, setCollectionTypes] = useState<string[]>([])
  const [otherType,       setOtherType]       = useState('')
  const [note,            setNote]            = useState('')
  const [saving,          setSaving]          = useState(false)
  const [done,            setDone]            = useState(false)

  const toggleType = (t: string) =>
    setCollectionTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    const types = [...collectionTypes]
    if (collectionTypes.includes('其他') && otherType.trim()) {
      const idx = types.indexOf('其他')
      types[idx] = otherType.trim()
    }
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), gender, phone, lineId, birthday, address, collectionTypes: types, note }),
    })
    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">感謝您！</h1>
        <p className="text-gray-600">您的資料已成功登錄。</p>
        <p className="text-gray-500 text-sm mt-2">東方森煌古物鑑定所</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-amber-700 text-white px-4 py-4 text-center">
        <h1 className="font-bold text-lg">東方森煌古物鑑定所</h1>
        <p className="text-amber-200 text-sm mt-0.5">客戶資料登錄</p>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-12">

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">基本資料</h2>

          <div>
            <label className="block text-xs text-gray-700 mb-1">姓名 *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="您的姓名"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">稱謂</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g === '不填' ? '' : g)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
                    (g === '不填' ? !gender : gender === g)
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >{g}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">電話</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0912-345-678"
              type="tel"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">LINE ID</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={lineId}
              onChange={e => setLineId(e.target.value)}
              placeholder="line_id"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">生日</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              type="date"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">居住地</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="縣市 / 地區"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">收藏品項</h2>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                  collectionTypes.includes(t)
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
              >{t}</button>
            ))}
          </div>
          {collectionTypes.includes('其他') && (
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={otherType}
              onChange={e => setOtherType(e.target.value)}
              placeholder="請說明收藏品項…"
            />
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-xs text-gray-700 mb-1">備註</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 resize-none"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="其他備注…"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full bg-amber-700 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-40 text-base"
        >
          {saving ? '提交中…' : '提交資料'}
        </button>
      </div>
    </div>
  )
}
