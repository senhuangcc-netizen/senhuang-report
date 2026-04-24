import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const { xrfChartUrl } = await req.json()
  await sql`UPDATE intakes SET xrf_chart_url = ${xrfChartUrl || null}, updated_at = NOW() WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
