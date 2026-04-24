import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { syncCustomer } from '@/lib/sheets'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows } = await sql`SELECT * FROM customers WHERE id = ${parseInt(id)}`
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  await sql`
    UPDATE customers SET
      name             = ${body.name},
      gender           = ${body.gender || null},
      phone            = ${body.phone || null},
      line_id          = ${body.lineId || null},
      birthday         = ${body.birthday || null},
      address          = ${body.address || null},
      collection_types = ${JSON.stringify(body.collectionTypes || [])},
      note             = ${body.note || null},
      updated_at       = NOW()
    WHERE id = ${parseInt(id)}
  `
  const { rows } = await sql`SELECT * FROM customers WHERE id = ${parseInt(id)}`
  if (rows[0]) syncCustomer(rows[0])
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM customers WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
