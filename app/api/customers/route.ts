import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/customers?ym=202604  → distinct customer names for that year-month
export async function GET(req: NextRequest) {
  const ym = req.nextUrl.searchParams.get('ym') || ''
  let rows: { customer_name: string }[]

  if (ym && /^\d{6}$/.test(ym)) {
    const year = ym.slice(0, 4)
    const month = ym.slice(4, 6)
    const prefix = `${year}-${month}-%`
    const res = await sql`
      SELECT DISTINCT customer_name FROM intakes
      WHERE created_at::date::text LIKE ${prefix}
      ORDER BY customer_name ASC
    `
    rows = res.rows as { customer_name: string }[]
  } else {
    const res = await sql`
      SELECT DISTINCT customer_name FROM intakes ORDER BY customer_name ASC
    `
    rows = res.rows as { customer_name: string }[]
  }

  return NextResponse.json(rows.map(r => r.customer_name))
}
