import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema, logAudit, nextItemCode } from '@/lib/db'
import { syncIntake } from '@/lib/sheets'

export async function DELETE(req: NextRequest) {
  const customerName = req.nextUrl.searchParams.get('customerName')
  if (!customerName) return NextResponse.json({ error: 'customerName required' }, { status: 400 })
  await sql`DELETE FROM intakes WHERE customer_name = ${customerName}`
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { rows } = await sql`
    SELECT id, customer_name, item_code, building_type, appraisal_result,
           genuine_preset, status, operator, submission_date, report_path, created_at
    FROM intakes ORDER BY created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const body = await req.json()

  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const safeName = (body.customerName as string).replace(/[\/\\:*?"<>|]/g, '_').trim()
  const folderName = `${safeName}_${ym}`

  const autoCode = await nextItemCode(folderName)

  const { rows } = await sql`
    INSERT INTO intakes (
      folder_name, customer_name, item_code, barcode, card_number, card_status,
      building_type, appraisal_result, size, weight, submission_date, report_date,
      note, category_data, genuine_preset, photos, xrf_pdf_url, pdf_path, operator, status
    ) VALUES (
      ${folderName},
      ${body.customerName},
      ${autoCode},
      ${body.barcode || null},
      ${body.cardNumber || null},
      ${body.cardStatus || null},
      ${body.buildingType},
      ${body.appraisalResult},
      ${body.size || null},
      ${body.weight || null},
      ${body.submissionDate},
      ${body.reportDate || new Date().toISOString().slice(0, 10)},
      ${body.note || null},
      ${JSON.stringify(body.categoryData || {})},
      ${body.genuinePreset || null},
      ${JSON.stringify(body.photos || [])},
      ${body.xrfPdfUrl || null},
      ${body.pdfPath || null},
      ${body.operator},
      'draft'
    ) RETURNING id
  `

  const id = rows[0].id
  await logAudit(id, body.operator, '建單')

  const { rows: newRows } = await sql`SELECT * FROM intakes WHERE id = ${id}`
  syncIntake(newRows[0]) // 非阻塞

  return NextResponse.json({ id, folderPath: folderName })
}
