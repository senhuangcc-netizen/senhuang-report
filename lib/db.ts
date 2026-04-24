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
  schemaReady = true
}

export async function logAudit(intakeId: number, operator: string, action: string, fields?: string) {
  await sql`INSERT INTO audit_log (intake_id, operator, action, changed_fields) VALUES (${intakeId}, ${operator}, ${action}, ${fields ?? null})`
}
