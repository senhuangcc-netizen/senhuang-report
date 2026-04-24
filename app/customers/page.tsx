'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

  // QR modal
  const [qrOpen,    setQrOpen]    = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const qrGenerated = useRef(false)

  // 刪除確認 modal
  const [deleteTarget,  setDeleteTarget]  = useState<Customer | null>(null)
  const [confirmInput,  setConfirmInput]  = useState('')
  const [deleting,      setDeleting]      = useState(false)

  const confirmReady = deleteTarget ? confirmInput === deleteTarget.name : false

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const openQr = async () => {
    setQrOpen(true)
    if (!qrGenerated.current) {
      const url = `${window.location.origin}/customers/register`
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#92400e', light: '#fffbeb' } })
      setQrDataUrl(dataUrl)
      qrGenerated.current = true
    }
  }

  const execDelete = async () => {
    if (!deleteTarget || !confirmReady) return
    setDeleting(true)
    await fetch(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' })
    setCustomers(prev => prev.filter(c => c.id !== deleteTarget.id))
    setDeleting(false)
    setDeleteTarget(null)
    setConfirmInput('')
  }

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
            <p className="text-xs text-gray-700">客戶掃描後進入自助填寫頁面<br />每次掃描都是全新空白表單</p>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-xl" width={240} height={240} />
              : <div className="w-60 h-60 mx-auto bg-amber-50 rounded-xl animate-pulse" />
            }
            <div className="flex gap-2">
              <button onClick={() => setQrOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50">關閉</button>
              <button onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700">列印</button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-base text-red-600">刪除客戶資料</h2>
            <p className="text-sm text-gray-600">
              即將刪除 <span className="font-semibold text-gray-900">「{deleteTarget.name}」</span> 的所有資料，此操作無法復原。
            </p>
            <div>
              <p className="text-xs text-gray-700 mb-1">
                請手動輸入客戶姓名確認：<span className="font-semibold text-gray-800">{deleteTarget.name}</span>
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                onPaste={e => e.preventDefault()}
                onKeyDown={e => e.key === 'Enter' && confirmReady && execDelete()}
                placeholder={deleteTarget.name}
                autoFocus
                autoComplete="off"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-400"
              />
              <p className="text-xs text-gray-600 mt-1">禁止貼上，請逐字手動輸入</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setConfirmInput('') }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
              >取消</button>
              <button
                onClick={execDelete}
                disabled={!confirmReady || deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >{deleting ? '刪除中...' : '確認刪除'}</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">←</Link>
        <h1 className="font-bold text-gray-900 text-lg flex-1">客戶名單</h1>
        <button onClick={openQr}
          className="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl font-medium hover:bg-gray-50 mr-1">登記QR</button>
        <Link href="/customers/new"
          className="px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-medium hover:bg-amber-700">新增客戶</Link>
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
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 group relative">
                <Link href={`/customers/${c.id}`} className="p-4 flex items-center gap-3 hover:bg-gray-50 rounded-2xl transition-colors block">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                    {c.name?.slice(0, 1) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{c.name}{c.gender ? ` ${c.gender}` : ''}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {c.phone && <span className="text-xs text-gray-600">{c.phone}</span>}
                      {c.line_id && <span className="text-xs text-gray-600">LINE: {c.line_id}</span>}
                      {c.address && <span className="text-xs text-gray-600">{c.address}</span>}
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
                </Link>
                <button
                  onClick={() => { setConfirmInput(''); setDeleteTarget(c) }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-sm px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                  title="刪除"
                >🗑</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
