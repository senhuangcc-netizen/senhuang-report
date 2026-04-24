import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'
import { syncXray } from '@/lib/sheets'

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

  const { rows } = await sql`
    INSERT INTO xray_records (
      customer_name, barcode, xray_code, item_type, item_type_custom,
      main_photos, xray_photos, operator, note
    ) VALUES (
      ${body.customerName},
      ${body.barcode || null},
      ${body.xrayCode},
      ${body.itemType},
      ${body.itemTypeCustom || null},
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
