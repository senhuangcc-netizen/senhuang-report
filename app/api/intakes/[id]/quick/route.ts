import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// 部分欄位快速更新，不觸發全欄位 PATCH
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const intId = parseInt(id)

  if ('buildingType' in body)
    await sql`UPDATE intakes SET building_type = ${body.buildingType || null}, updated_at = NOW() WHERE id = ${intId}`
  if ('appraisalResult' in body)
    await sql`UPDATE intakes SET appraisal_result = ${body.appraisalResult || null}, updated_at = NOW() WHERE id = ${intId}`
  if ('inspectionUnit' in body)
    await sql`UPDATE intakes SET inspection_unit = ${body.inspectionUnit || null}, updated_at = NOW() WHERE id = ${intId}`

  return NextResponse.json({ ok: true })
}
