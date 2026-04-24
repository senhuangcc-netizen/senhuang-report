import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema, logAudit, nextItemCode } from '@/lib/db'
import { syncIntake } from '@/lib/sheets'

export async function DELETE(req: NextRequest) {
  const customerName = req.nextUrl.searchParams.get('customerName')
  if (!customerName) return NextResponse.json({ error: 'customerName required' }, { status: 400 })
  await sql`DELETE FROM intakes WHERE customer_name = ${customerName}`
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  await ensureSchema()
  const barcode = req.nextUrl.searchParams.get('barcode')
  if (barcode) {
    const { rows } = await sql`
      SELECT id, customer_name, item_code FROM intakes WHERE barcode = ${barcode} ORDER BY created_at DESC LIMIT 1
    `
    return NextResponse.json(rows[0] || null)
  }
  const { rows } = await sql`
    SELECT id, customer_name, item_code, building_type, appraisal_result,
           genuine_preset, status, operator, submission_date, report_path,
           case_stage, photo_stages, created_at
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

  // 重複條碼：直接回傳既有建單，不新建
  const barcodeStr: string = body.barcode || ''
  if (barcodeStr) {
    const { rows: existing } = await sql`
      SELECT id, item_code, folder_name FROM intakes WHERE barcode = ${barcodeStr} LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json({
        id: existing[0].id,
        itemCode: existing[0].item_code,
        folderPath: existing[0].folder_name,
        duplicate: true,
      })
    }
  }

  // 取得或分配資料夾字母
  const folderLetter = await nextItemCode(folderName)
  // 若條碼後三碼符合「1英+2數」格式（我方標籤），組合為：後三碼 + 資料夾字母（例如 K06A）
  const labelSuffix = barcodeStr.slice(-3)
  const isLabelBarcode = barcodeStr.length >= 3 && /^[A-Z][0-9]{2}$/.test(labelSuffix)
  const autoCode = isLabelBarcode ? `${labelSuffix}${folderLetter}` : folderLetter

  const { rows } = await sql`
    INSERT INTO intakes (
      folder_name, customer_name, item_code, barcode, card_number, card_status,
      building_type, appraisal_result, size, weight, submission_date, report_date,
      note, category_data, genuine_preset, photos, xrf_pdf_url, pdf_path,
      operator, status, case_stage, inspection_unit, photo_stages
    ) VALUES (
      ${folderName},
      ${body.customerName},
      ${autoCode},
      ${body.barcode || null},
      ${body.cardNumber || null},
      ${body.cardStatus || null},
      ${body.buildingType || null},
      ${body.appraisalResult || null},
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
      'draft',
      ${body.caseStage || '收件'},
      ${body.inspectionUnit || null},
      ${JSON.stringify(body.photoStages || [])}
    ) RETURNING id
  `

  const id = rows[0].id
  await logAudit(id, body.operator, '建單')

  const { rows: newRows } = await sql`SELECT * FROM intakes WHERE id = ${id}`
  syncIntake(newRows[0]) // 非阻塞

  return NextResponse.json({ id, itemCode: autoCode, folderPath: folderName })
}
