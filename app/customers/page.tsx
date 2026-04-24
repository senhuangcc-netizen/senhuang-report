'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

interface Customer {
  id: number
  name: string
  gender: string
  phone: string
  line_id: string
  birthday: string
  address: string
  collection_types: string
  note: string
  created_at: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [qrOpen,    setQrOpen]    = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const qrGenerated = useRef(false)

  const openQr = async () => {
    setQrOpen(true)
    if (!qrGenerated.current) {
      const url = `${window.location.origin}/customers/register`
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#92400e', light: '#fffbeb' } })
      setQrDataUrl(dataUrl)
      qrGenerated.current = true
    }
  }

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.line_id?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 登記 QR Modal */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 space-y-4 text-center">
            <h2 className="font-bold text-base text-gray-900">客戶登記 QR</h2>
            <p className="text-xs text-gray-500">客戶掃描後進入自助填寫頁面<br />每次掃描都是全新空白表單</p>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-xl" width={240} height={240} />
              : <div className="w-60 h-60 mx-auto bg-amber-50 rounded-xl animate-pulse" />
            }
            <div className="flex gap-2">
              <button
                onClick={() => setQrOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
              >關閉</button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700"
              >列印</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</button>
        <h1 className="font-bold text-gray-900 text-lg flex-1">客戶名單</h1>
        <button
          onClick={openQr}
          className="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl font-medium hover:bg-gray-50 mr-1"
        >登記QR</button>
        <button
          onClick={() => router.push('/customers/new')}
          className="px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700"
        >新增客戶</button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋姓名、電話、LINE…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:border-amber-500"
        />

        {loading && <div className="text-center text-gray-400 py-12">載入中...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-3xl mb-2">👤</div>
            <p>尚無客戶資料</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(c => {
            let types: string[] = []
            try { types = JSON.parse(c.collection_types || '[]') } catch { /* noop */ }
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-amber-300 transition-colors"
                onClick={() => router.push(`/customers/${c.id}`)}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                  {c.name?.slice(0, 1) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{c.name}{c.gender ? ` ${c.gender}` : ''}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                    {c.line_id && <span className="text-xs text-gray-400">LINE: {c.line_id}</span>}
                    {c.address && <span className="text-xs text-gray-400">{c.address}</span>}
                  </div>
                  {types.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {types.map(t => (
                        <span key={t} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-gray-300 text-sm shrink-0">›</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
