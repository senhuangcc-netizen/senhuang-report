'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { BUILDING_TYPES } from '@/lib/formData'

const COLLECTION_TYPES = [...BUILDING_TYPES, '其他'] as const
const GENDERS = ['先生', '女士']

export default function CustomerEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

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
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); return }
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(data => {
        setName(data.name || '')
        setGender(data.gender || '')
        setPhone(data.phone || '')
        setLineId(data.line_id || '')
        setBirthday(data.birthday || '')
        setAddress(data.address || '')
        const types: string[] = JSON.parse(data.collection_types || '[]')
        // Check for custom types (not in BUILDING_TYPES)
        const known = [...BUILDING_TYPES] as string[]
        const customs = types.filter(t => !known.includes(t) && t !== '其他')
        if (customs.length > 0) {
          setCollectionTypes([...types.filter(t => known.includes(t)), '其他'])
          setOtherType(customs.join('、'))
        } else {
          setCollectionTypes(types)
        }
        setNote(data.note || '')
        setLoading(false)
      })
  }, [id])

  const toggleType = (t: string) =>
    setCollectionTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const types = [...collectionTypes]
    if (collectionTypes.includes('其他') && otherType.trim()) {
      const idx = types.indexOf('其他')
      types[idx] = otherType.trim()
    }
    const payload = { name: name.trim(), gender, phone, lineId, birthday, address, collectionTypes: types, note }
    if (id === 'new') {
      await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch(`/api/customers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false)
    router.push('/customers')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</Link>
        <h1 className="font-bold text-gray-900 text-lg">{id === 'new' ? '新增客戶' : '編輯客戶'}</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-12">

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1">姓名 *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="客戶姓名"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">稱謂</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g}
                  onClick={() => setGender(prev => prev === g ? '' : g)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
                    gender === g ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >{g}</button>
              ))}
              <button
                onClick={() => setGender('')}
                className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
                  !gender ? 'bg-gray-100 text-gray-700 border-gray-200' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >不填</button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">電話</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0912-345-678" type="tel"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">LINE ID</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={lineId} onChange={e => setLineId(e.target.value)}
              placeholder="line_id"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">生日</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={birthday} onChange={e => setBirthday(e.target.value)}
              type="date"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">居住地</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              value={address} onChange={e => setAddress(e.target.value)}
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
              value={otherType} onChange={e => setOtherType(e.target.value)}
              placeholder="請說明收藏品項…"
            />
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-xs text-gray-700 mb-1">備註</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 resize-none"
            rows={2} value={note} onChange={e => setNote(e.target.value)}
            placeholder="其他備注…"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-40 text-base"
        >
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>
    </div>
  )
}
