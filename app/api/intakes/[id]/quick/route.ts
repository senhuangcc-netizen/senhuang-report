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
  if ('size' in body)
    await sql`UPDATE intakes SET size = ${body.size || null}, updated_at = NOW() WHERE id = ${intId}`
  if ('weight' in body)
    await sql`UPDATE intakes SET weight = ${body.weight || null}, updated_at = NOW() WHERE id = ${intId}`
  if ('caseStage' in body)
    await sql`UPDATE intakes SET case_stage = ${body.caseStage || '收件'}, updated_at = NOW() WHERE id = ${intId}`
  if ('completedStages' in body)
    await sql`UPDATE intakes SET case_stage = ${JSON.stringify(body.completedStages ?? [])}, updated_at = NOW() WHERE id = ${intId}`

  // 追加收件照（不覆蓋其他照片）
  if ('addIntakePhoto' in body && body.addIntakePhoto) {
    const { rows } = await sql`SELECT photos FROM intakes WHERE id = ${intId}`
    const existing: { category: string; path: string }[] = JSON.parse(rows[0]?.photos || '[]')
    const updated = [...existing, { category: '收件照', path: body.addIntakePhoto }]
    await sql`UPDATE intakes SET photos = ${JSON.stringify(updated)}, updated_at = NOW() WHERE id = ${intId}`
  }

  return NextResponse.json({ ok: true })
}
