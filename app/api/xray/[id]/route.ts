import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows } = await sql`SELECT * FROM xray_records WHERE id = ${parseInt(id)}`
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  await sql`
    UPDATE xray_records SET
      item_type        = ${body.itemType},
      item_type_custom = ${body.itemTypeCustom || null},
      main_photos      = ${JSON.stringify(body.mainPhotos || [])},
      xray_photos      = ${JSON.stringify(body.xrayPhotos || [])},
      operator         = ${body.operator || null},
      note             = ${body.note || null},
      updated_at       = NOW()
    WHERE id = ${parseInt(id)}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM xray_records WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
