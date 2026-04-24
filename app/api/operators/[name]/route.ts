import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  await ensureSchema()
  const { name } = await params
  await sql`DELETE FROM operators WHERE name = ${decodeURIComponent(name)}`
  const { rows } = await sql`SELECT name FROM operators ORDER BY created_at ASC`
  return NextResponse.json(rows.map(r => r.name))
}
