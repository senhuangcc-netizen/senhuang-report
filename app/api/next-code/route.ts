import { NextRequest, NextResponse } from 'next/server'
import { ensureSchema, nextItemCode } from '@/lib/db'

export async function GET(req: NextRequest) {
  await ensureSchema()
  const customerName = req.nextUrl.searchParams.get('customerName') || ''
  if (!customerName.trim()) return NextResponse.json({ code: '' })

  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const safeName = customerName.replace(/[/\\:*?"<>|]/g, '_').trim()
  const folderName = `${safeName}_${ym}`

  const code = await nextItemCode(folderName)
  return NextResponse.json({ code })
}
