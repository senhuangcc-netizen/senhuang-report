import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'

export async function GET() {
  await ensureSchema()
  const { rows } = await sql`SELECT name FROM inspection_units ORDER BY created_at ASC`
  return NextResponse.json(rows.map(r => r.name))
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '名稱不能為空' }, { status: 400 })
  await sql`INSERT INTO inspection_units (name) VALUES (${name.trim()}) ON CONFLICT (name) DO NOTHING`
  const { rows } = await sql`SELECT name FROM inspection_units ORDER BY created_at ASC`
  return NextResponse.json(rows.map(r => r.name))
}

export async function DELETE(req: NextRequest) {
  await ensureSchema()
  const { name } = await req.json()
  await sql`DELETE FROM inspection_units WHERE name = ${name}`
  const { rows } = await sql`SELECT name FROM inspection_units ORDER BY created_at ASC`
  return NextResponse.json(rows.map(r => r.name))
}
