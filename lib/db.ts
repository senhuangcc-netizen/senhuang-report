import { sql } from '@vercel/postgres'

export { sql }

let schemaReady = false

export async function ensureSchema() {
  if (schemaReady) return
  await sql`
    CREATE TABLE IF NOT EXISTS intakes (
      id SERIAL PRIMARY KEY,
      folder_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_code TEXT NOT NULL,
      barcode TEXT,
      card_number TEXT,
      card_status TEXT,
      building_type TEXT,
      appraisal_result TEXT,
      size TEXT,
      weight TEXT,
      submission_date TEXT,
      report_date TEXT,
      note TEXT,
      category_data TEXT,
      genuine_preset TEXT,
      photos TEXT,
      xrf_pdf_url TEXT,
      xrf_chart_url TEXT,
      pdf_path TEXT,
      report_path TEXT,
      operator TEXT,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      intake_id INTEGER,
      operator TEXT,
      action TEXT,
      changed_fields TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS operators (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE intakes ADD COLUMN IF NOT EXISTS xrf_chart_url TEXT`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS intakes_barcode_unique ON intakes (barcode) WHERE barcode IS NOT NULL`
  await sql`ALTER TABLE intakes ADD COLUMN IF NOT EXISTS case_stage TEXT DEFAULT '收件'`
  await sql`ALTER TABLE intakes ADD COLUMN IF NOT EXISTS inspection_unit TEXT`
  await sql`ALTER TABLE intakes ADD COLUMN IF NOT EXISTS photo_stages TEXT DEFAULT '[]'`
  await sql`
    CREATE TABLE IF NOT EXISTS xray_records (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      barcode TEXT,
      xray_code TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_type_custom TEXT,
      main_photos TEXT DEFAULT '[]',
      xray_photos TEXT DEFAULT '[]',
      operator TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS folder_letters (
      folder_name TEXT PRIMARY KEY,
      letter CHAR(1) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS inspection_units (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      phone TEXT,
      line_id TEXT,
      birthday TEXT,
      address TEXT,
      collection_types TEXT DEFAULT '[]',
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  schemaReady = true
}

export async function nextItemCode(folderName: string): Promise<string> {
  // 取得或分配資料夾字母（A-Z 循環，整個資料夾共用同一個字母）
  let { rows } = await sql`SELECT letter FROM folder_letters WHERE folder_name = ${folderName}`
  if (rows.length > 0) return rows[0].letter
  const { rows: cnt } = await sql`SELECT COUNT(*) AS c FROM folder_letters`
  const idx = parseInt(cnt[0].c) % 26
  const letter = String.fromCharCode(65 + idx)
  await sql`INSERT INTO folder_letters (folder_name, letter) VALUES (${folderName}, ${letter}) ON CONFLICT DO NOTHING`
  const { rows: re } = await sql`SELECT letter FROM folder_letters WHERE folder_name = ${folderName}`
  return re[0].letter
}

export async function logAudit(intakeId: number, operator: string, action: string, fields?: string) {
  await sql`INSERT INTO audit_log (intake_id, operator, action, changed_fields) VALUES (${intakeId}, ${operator}, ${action}, ${fields ?? null})`
}
