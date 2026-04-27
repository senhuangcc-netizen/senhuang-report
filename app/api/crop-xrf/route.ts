import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export async function POST(req: NextRequest) {
  const { pdfUrl } = await req.json()
  if (!pdfUrl) return NextResponse.json({ error: '缺少 pdfUrl' }, { status: 400 })

  const renderUrl = (process.env.RENDER_SERVICE_URL || '').replace(/\/$/, '')
  if (!renderUrl) return NextResponse.json({ error: '未設定 RENDER_SERVICE_URL' }, { status: 500 })

  // 從 pdfUrl 解析 folder：/api/files/intakes/{folder}/xrf/...
  const segments = pdfUrl.replace('/api/files/', '').split('/')
  const folder = segments[1] || 'unknown'

  // 直接從磁碟讀取 PDF，不讓 Python 再繞回來下載
  let pdfB64: string | null = null
  if (pdfUrl.startsWith('/api/files/')) {
    try {
      const filePath = path.join(UPLOAD_DIR, ...segments)
      const pdfBytes = await readFile(filePath)
      pdfB64 = pdfBytes.toString('base64')
    } catch {
      // fallback to URL download if file not found locally
    }
  }

  const body = pdfB64
    ? { pdf_b64: pdfB64 }
    : { pdf_url: pdfUrl.startsWith('/') ? `${req.nextUrl.protocol}//${req.nextUrl.host}${pdfUrl}` : pdfUrl }

  const res = await fetch(`${renderUrl}/crop-xrf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.detail || '裁切失敗' }, { status: res.status })

  const imgBuffer = Buffer.from(data.image_b64, 'base64')
  const relativePath = `intakes/${folder}/xrf_chart/${Date.now()}.png`
  const fullPath = path.join(UPLOAD_DIR, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, imgBuffer)

  return NextResponse.json({ chartUrl: `/api/files/${relativePath}` })
}
