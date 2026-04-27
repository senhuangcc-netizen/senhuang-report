import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'
import { syncCustomer } from '@/lib/sheets'

export async function GET(req: NextRequest) {
  await ensureSchema()
  const ym = req.nextUrl.searchParams.get('ym')
  if (ym) {
    const year = parseInt(ym.slice(0, 4))
    const month = parseInt(ym.slice(4, 6))
    const { rows } = await sql`
      SELECT DISTINCT customer_name
      FROM intakes
      WHERE EXTRACT(YEAR FROM created_at) = ${year}
        AND EXTRACT(MONTH FROM created_at) = ${month}
      ORDER BY customer_name
    `
    return NextResponse.json(rows.map((r: { customer_name: string }) => r.customer_name))
  }
  const { rows } = await sql`SELECT * FROM customers ORDER BY created_at DESC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const body = await req.json()
  const { rows } = await sql`
    INSERT INTO customers (name, gender, phone, line_id, birthday, address, collection_types, note)
    VALUES (
      ${body.name},
      ${body.gender || null},
      ${body.phone || null},
      ${body.lineId || null},
      ${body.birthday || null},
      ${body.address || null},
      ${JSON.stringify(body.collectionTypes || [])},
      ${body.note || null}
    ) RETURNING *
  `
  syncCustomer(rows[0])
  return NextResponse.json(rows[0])
}
