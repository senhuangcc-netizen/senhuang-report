import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export async function POST(req: NextRequest) {
  const { pdfUrl } = await req.json()
  if (!pdfUrl) return NextResponse.json({ error: '缺少 pdfUrl' }, { status: 400 })

  const renderUrl = (process.env.RENDER_SERVICE_URL || '').replace(/\/$/, '')
  if (!renderUrl) return NextResponse.json({ error: '未設定 RENDER_SERVICE_URL' }, { status: 500 })

  // 把相對路徑補成絕對 URL，讓 Python 服務能下載
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const absolutePdfUrl = pdfUrl.startsWith('/') ? `${baseUrl}${pdfUrl}` : pdfUrl

  // 先 ping 喚醒（冷啟動）
  try { await fetch(`${renderUrl}/health`, { signal: AbortSignal.timeout(60000) }) } catch { /* ignore */ }

  const res = await fetch(`${renderUrl}/crop-xrf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
    },
    body: JSON.stringify({ pdf_url: absolutePdfUrl }),
    signal: AbortSignal.timeout(60000),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.detail || '裁切失敗' }, { status: res.status })

  // 從 pdfUrl 解析 folder：/api/files/intakes/{folder}/xrf/...
  const segments = pdfUrl.replace('/api/files/', '').split('/')
  const folder = segments[1] || 'unknown'

  const imgBuffer = Buffer.from(data.image_b64, 'base64')
  const relativePath = `intakes/${folder}/xrf_chart/${Date.now()}.png`
  const fullPath = path.join(UPLOAD_DIR, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, imgBuffer)

  return NextResponse.json({ chartUrl: `/api/files/${relativePath}` })
}
