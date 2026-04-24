import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pdfUrl } = await req.json()
  if (!pdfUrl) return NextResponse.json({ error: '缺少 pdfUrl' }, { status: 400 })

  const renderUrl = (process.env.RENDER_SERVICE_URL || '').replace(/\/$/, '')
  if (!renderUrl) return NextResponse.json({ error: '未設定 RENDER_SERVICE_URL' }, { status: 500 })

  // 先 ping 喚醒 Render（冷啟動）
  try { await fetch(`${renderUrl}/health`, { signal: AbortSignal.timeout(60000) }) } catch { /* ignore */ }

  const res = await fetch(`${renderUrl}/crop-xrf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
    },
    body: JSON.stringify({ pdf_url: pdfUrl }),
    signal: AbortSignal.timeout(60000),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.detail || '裁切失敗' }, { status: res.status })
  return NextResponse.json({ chartUrl: data.url })
}
