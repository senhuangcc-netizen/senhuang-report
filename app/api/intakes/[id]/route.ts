import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema, logAudit } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows } = await sql`SELECT * FROM intakes WHERE id = ${parseInt(id)}`
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const body = await req.json()

  await sql`
    UPDATE intakes SET
      customer_name   = ${body.customerName ?? ''},
      item_code       = ${body.itemCode ?? ''},
      barcode         = ${body.barcode || null},
      card_number     = ${body.cardNumber || null},
      card_status     = ${body.cardStatus || null},
      building_type   = ${body.buildingType || null},
      appraisal_result= ${body.appraisalResult || null},
      size            = ${body.size || null},
      weight          = ${body.weight || null},
      submission_date = ${body.submissionDate || null},
      report_date     = ${body.reportDate || null},
      note            = ${body.note || null},
      category_data   = ${JSON.stringify(body.categoryData || {})},
      genuine_preset  = ${body.genuinePreset || null},
      photos          = ${JSON.stringify(body.photos || [])},
      xrf_pdf_url     = ${body.xrfPdfUrl || null},
      xrf_chart_url   = ${body.xrfChartUrl || null},
      operator        = ${body.operator ?? ''},
      status          = ${body.status || 'draft'},
      updated_at      = NOW()
    WHERE id = ${parseInt(id)}
  `

  await logAudit(parseInt(id), body.operator ?? '', '暫存')
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM intakes WHERE id = ${parseInt(id)}`
  return NextResponse.json({ ok: true })
}
