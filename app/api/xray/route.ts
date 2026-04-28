import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema, nextItemCode } from '@/lib/db'
import { syncXray } from '@/lib/sheets'

export async function DELETE(req: NextRequest) {
  await ensureSchema()
  const customerName = new URL(req.url).searchParams.get('customerName')
  if (!customerName) return NextResponse.json({ error: 'customerName required' }, { status: 400 })
  await sql`DELETE FROM xray_records WHERE customer_name = ${customerName}`
  return NextResponse.json({ ok: true })
}

export async function GET() {
  await ensureSchema()
  const { rows } = await sql`
    SELECT id, customer_name, barcode, xray_code, item_type, item_type_custom,
           operator, created_at
    FROM xray_records ORDER BY created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const body = await req.json()

  // 生成編碼：YYYYMMDD + QR後三碼 + 資料夾字母
  const d = new Date()
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const safeName = (body.customerName || '').replace(/[^a-zA-Z0-9一-鿿]/g, '')
  const folderName = `xray_${safeName}_${ym}`
  const folderLetter = await nextItemCode(folderName)
  const barcodeStr: string = body.barcode || ''
  const labelSuffix = barcodeStr.slice(-3).toUpperCase()
  const isLabel = barcodeStr.length >= 3 && /^[A-Z][0-9]{2}$/.test(labelSuffix)
  const xrayCode = isLabel ? `${dateStr}${labelSuffix}${folderLetter}` : `${dateStr}${folderLetter}`

  const { rows } = await sql`
    INSERT INTO xray_records (
      customer_name, barcode, xray_code, item_type, item_type_custom,
      angle, angle_custom, main_photos, xray_photos, operator, note
    ) VALUES (
      ${body.customerName},
      ${body.barcode || null},
      ${xrayCode},
      ${body.itemType},
      ${body.itemTypeCustom || null},
      ${body.angle || null},
      ${body.angleCustom || null},
      ${JSON.stringify(body.mainPhotos || [])},
      ${JSON.stringify(body.xrayPhotos || [])},
      ${body.operator || null},
      ${body.note || null}
    ) RETURNING id
  `
  const id = rows[0].id
  const { rows: newRows } = await sql`SELECT * FROM xray_records WHERE id = ${id}`
  syncXray(newRows[0]) // 非阻塞
  return NextResponse.json({ id })
}
