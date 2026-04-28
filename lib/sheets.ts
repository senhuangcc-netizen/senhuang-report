import crypto from 'crypto'

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
const CARD_SHEET_ID = '1gfrwOfTNGh27LlN4Qh032eVN84rtGJGdcXKXEV3DYO0'

// ── 報告總表同步 ──────────────────────────────────────────────

const REPORT_HEADERS = [
  '資料夾名稱', '品項代碼', '標籤碼',
  '鑑定卡號', '卡狀態', '建檔類型', '鑑定結果', '尺寸', '重量',
  '送驗日期', '報告日期', '備註', '形制資料', '真品預設',
  'XRF PDF', 'XRF圖', 'PDF路徑', '報告路徑', '操作員', '狀態',
  '建立時間', '更新時間',
]

const XRAY_HEADERS = [
  '編號', '客戶名稱', '條碼', '編碼', '拍攝品項', '品項備註',
  '主體照數量', 'X光照數量', '操作員', '備註', '建立時間',
]

const CUSTOMER_HEADERS = [
  '編號', '姓名', '性別', '電話', 'LINE', '生日', '居住地', '收藏品項', '備註', '建立時間',
]

let cachedToken: { token: string; expires: number } | null = null

async function getServiceAccountToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
  const key = JSON.parse(raw)
  // Railway may store \n as literal \\n — normalize back to real newlines
  if (key.private_key) key.private_key = key.private_key.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  const signing = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signing)
  const signature = sign.sign(key.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signing}.${signature}`,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  cachedToken = { token: data.access_token, expires: Date.now() + 3500 * 1000 }
  return data.access_token
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sheetReq(method: string, path: string, body?: unknown) {
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

// 取得所有工作表的名稱與數字 ID
async function getSheetInfo(): Promise<Array<{ title: string; sheetId: number }>> {
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.sheets ?? []).map((s: any) => ({ title: s.properties.title as string, sheetId: s.properties.sheetId as number }))
}

async function getSheetNames(): Promise<string[]> {
  return (await getSheetInfo()).map(s => s.title)
}

// 確保工作表存在；回傳數字 sheetId
async function ensureSheet(title: string): Promise<number> {
  const info = await getSheetInfo()
  const existing = info.find(s => s.title === title)
  if (existing) return existing.sheetId
  const token = await getServiceAccountToken()
  const id = process.env.GOOGLE_SHEET_ID!
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  })
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function intakeToRow(intake: Record<string, any>): string[] {
  return [
    String(intake.folder_name ?? ''),
    String(intake.item_code ?? ''),
    String(intake.barcode ?? ''),
    String(intake.card_number ?? ''),
    String(intake.card_status ?? ''),
    String(intake.building_type ?? ''),
    String(intake.appraisal_result ?? ''),
    String(intake.size ?? ''),
    String(intake.weight ?? ''),
    String(intake.submission_date ?? ''),
    String(intake.report_date ?? ''),
    String(intake.note ?? ''),
    String(intake.category_data ?? ''),
    String(intake.genuine_preset ?? ''),
    String(intake.xrf_pdf_url ?? ''),
    String(intake.xrf_chart_url ?? ''),
    String(intake.pdf_path ?? ''),
    String(intake.report_path ?? ''),
    String(intake.operator ?? ''),
    String(intake.status ?? ''),
    String(intake.created_at ?? ''),
    String(intake.updated_at ?? ''),
  ]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function xrayToRow(r: Record<string, any>): string[] {
  let mainCount = 0, xrayCount = 0
  try { mainCount = JSON.parse(r.main_photos || '[]').length } catch { /* noop */ }
  try { xrayCount = JSON.parse(r.xray_photos || '[]').length } catch { /* noop */ }
  return [
    String(r.id ?? ''),
    String(r.customer_name ?? ''),
    String(r.barcode ?? ''),
    String(r.xray_code ?? ''),
    String(r.item_type ?? ''),
    String(r.item_type_custom ?? ''),
    String(mainCount),
    String(xrayCount),
    String(r.operator ?? ''),
    String(r.note ?? ''),
    String(r.created_at ?? ''),
  ]
}

async function syncToSheet(
  sheetTitle: string,
  headers: string[],
  rowId: string,
  rowData: string[],
  keyColRange = 'A:A',
) {
  const sheetId = await ensureSheet(sheetTitle)

  // 表頭偵測用 A1（不受 keyColRange 影響）
  const headData = await sheetReq('GET', `/values/${encodeURIComponent(sheetTitle)}!A1:A1`)
  const firstCell: string = headData.values?.[0]?.[0] ?? ''

  if (!firstCell || firstCell !== headers[0]) {
    await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A1?valueInputOption=RAW`, { values: [headers] })
    await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A2?valueInputOption=RAW`, { values: [rowData] })
    return
  }

  // 在指定欄搜尋 rowId
  const keyData = await sheetReq('GET', `/values/${encodeURIComponent(sheetTitle)}!${keyColRange}`)
  const keyValues: string[][] = keyData.values ?? []
  const idx = rowId ? keyValues.findIndex(r => r[0] === rowId) : -1

  if (idx === -1) {
    await sheetReq('POST', `/:batchUpdate`, {
      requests: [{
        insertDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
          inheritFromBefore: false,
        },
      }],
    })
    await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A2?valueInputOption=RAW`, { values: [rowData] })
  } else {
    await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A${idx + 1}?valueInputOption=RAW`, {
      values: [rowData],
    })
  }
}

// ── 試算表分組整理 ────────────────────────────────────────────────

function parseYM(val: unknown): { year: string; month: number } {
  if (!val) return { year: '未知', month: 0 }
  const d = String(val).trim()
  // ISO 字串：2026-04-28 or 2026-04-28T...
  if (d.length >= 7 && d[4] === '-') {
    return { year: d.slice(0, 4), month: parseInt(d.slice(5, 7)) || 0 }
  }
  // 嘗試 Date 解析
  const dt = new Date(d)
  if (!isNaN(dt.getTime())) return { year: String(dt.getFullYear()), month: dt.getMonth() + 1 }
  return { year: '未知', month: 0 }
}

async function reorganizeSheet(sheetTitle: string, nameColIdx: number, dateColIdx: number) {
  const sheetId = await ensureSheet(sheetTitle)

  // 讀取全部資料
  const raw = await sheetReq('GET', `/values/${encodeURIComponent(sheetTitle)}!A:Z`)
  const values: string[][] = raw.values ?? []
  if (values.length <= 1) return

  const header = values[0]
  const ncols = header.length

  // 去除舊群組標題行，只保留真正的資料行
  const dataRows = values.slice(1).filter(r => {
    const a = String(r[0] ?? '')
    return a !== '' && !a.startsWith('▶') && !a.startsWith('　')
  })
  if (dataRows.length === 0) return

  // 排序：年新→舊，月新→舊，客戶名 A→Z
  const enriched = dataRows.map(r => ({ row: r, ...parseYM(r[dateColIdx]) }))
  enriched.sort((a, b) => {
    if (b.year !== a.year) return b.year.localeCompare(a.year)
    if (b.month !== a.month) return b.month - a.month
    return String(a.row[nameColIdx] ?? '').localeCompare(String(b.row[nameColIdx] ?? ''), 'zh-TW')
  })

  // 建構輸出行，並記錄三層分組範圍（0-based row index）
  type GR = { startIndex: number; endIndex: number }
  const output: string[][] = [header]
  const yearGroups: GR[] = []
  const monthGroups: GR[] = []
  const customerGroups: GR[] = []
  const yearRowNums: number[] = []
  const monthRowNums: number[] = []
  const customerRowNums: number[] = []

  let lastYear: string | null = null
  let lastMonth: number | null = null
  let lastCustomer: string | null = null
  let yearStart = -1, monthStart = -1, customerStart = -1

  const closeCustomer = () => {
    if (customerStart !== -1 && output.length > customerStart)
      customerGroups.push({ startIndex: customerStart, endIndex: output.length })
    customerStart = -1; lastCustomer = null
  }
  const closeMonth = () => {
    if (monthStart !== -1 && output.length > monthStart)
      monthGroups.push({ startIndex: monthStart, endIndex: output.length })
    monthStart = -1; lastMonth = null
  }
  const closeYear = () => {
    if (yearStart !== -1 && output.length > yearStart)
      yearGroups.push({ startIndex: yearStart, endIndex: output.length })
    yearStart = -1; lastYear = null
  }

  for (const { row, year, month } of enriched) {
    const cname = String(row[nameColIdx] ?? '')

    if (year !== lastYear) {
      closeCustomer(); closeMonth(); closeYear()
      yearRowNums.push(output.length + 1)
      output.push([`▶ ${year} 年`, ...Array(ncols - 1).fill('')])
      yearStart = output.length; lastYear = year
    }
    if (month !== lastMonth) {
      closeCustomer(); closeMonth()
      const m = month > 0 ? String(month).padStart(2, '0') : '??'
      monthRowNums.push(output.length + 1)
      output.push([`　　${year}-${m}`, ...Array(ncols - 1).fill('')])
      monthStart = output.length; lastMonth = month
    }
    if (cname !== lastCustomer) {
      closeCustomer()
      customerRowNums.push(output.length + 1)
      output.push([`　　　　${cname}`, ...Array(ncols - 1).fill('')])
      customerStart = output.length; lastCustomer = cname
    }

    const padded = [...row]
    while (padded.length < ncols) padded.push('')
    output.push(padded)
  }
  closeCustomer(); closeMonth(); closeYear()

  // 取得現有 row groups，先刪除避免堆疊
  const token = await getServiceAccountToken()
  const sid = process.env.GOOGLE_SHEET_ID!
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets(properties.sheetId,rowGroups)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const meta = await metaRes.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing: Array<{ range: { startIndex: number; endIndex: number } }> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (meta.sheets ?? []).find((s: any) => s.properties?.sheetId === sheetId)?.rowGroups ?? []

  if (existing.length > 0) {
    await sheetReq('POST', '/:batchUpdate', {
      requests: existing.map(g => ({
        deleteDimensionGroup: {
          range: { sheetId, dimension: 'ROWS', startIndex: g.range.startIndex, endIndex: g.range.endIndex },
        }
      }))
    })
  }

  // 清空後寫回
  await sheetReq('POST', `/values/${encodeURIComponent(sheetTitle)}!A:Z:clear`, {})
  await sheetReq('PUT', `/values/${encodeURIComponent(sheetTitle)}!A1?valueInputOption=RAW`, { values: output })

  // 格式設定 + 新增三層群組（由外到內：年→月→客戶，讓 Sheets 自動分配 depth）
  // fields 只更新背景色與 textFormat 的子欄，不碰 fontFamily / fontSize，避免蓋掉使用者手動設定的字型
  const TF = 'userEnteredFormat(backgroundColor,textFormat.bold,textFormat.foregroundColor)'
  const NO_BORDER = { style: 'NONE' }
  const CLEAR_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }
  const requests: object[] = [
    // 清除舊資料可能殘留的框線與背景（延伸至 1000 行）
    { repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: ncols },
      cell: { userEnteredFormat: { backgroundColor: { red:1, green:1, blue:1 }, borders: CLEAR_BORDERS } },
      fields: 'userEnteredFormat(backgroundColor,borders)',
    }},
    // 新資料範圍：重設文字樣式
    { repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: output.length, startColumnIndex: 0, endColumnIndex: ncols },
      cell: { userEnteredFormat: { textFormat: { bold:false, foregroundColor:{red:0,green:0,blue:0} } } },
      fields: 'userEnteredFormat(textFormat.bold,textFormat.foregroundColor)',
    }},
    { repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: ncols },
      cell: { userEnteredFormat: { backgroundColor: { red:0.24, green:0.24, blue:0.24 }, textFormat: { bold:true, foregroundColor:{red:1,green:1,blue:1} } } },
      fields: TF,
    }},
    { updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    }},
    ...yearRowNums.map(n => ({ repeatCell: {
      range: { sheetId, startRowIndex: n-1, endRowIndex: n, startColumnIndex: 0, endColumnIndex: ncols },
      cell: { userEnteredFormat: { backgroundColor: { red:0.718, green:0.475, blue:0.122 }, textFormat: { bold:true, foregroundColor:{red:1,green:1,blue:1}, fontSize:11 } } },
      fields: 'userEnteredFormat(backgroundColor,textFormat.bold,textFormat.foregroundColor,textFormat.fontSize)',
    }})),
    ...monthRowNums.map(n => ({ repeatCell: {
      range: { sheetId, startRowIndex: n-1, endRowIndex: n, startColumnIndex: 0, endColumnIndex: ncols },
      cell: { userEnteredFormat: { backgroundColor: { red:0.996, green:0.949, blue:0.773 }, textFormat: { bold:true, foregroundColor:{red:0.471,green:0.208,blue:0} } } },
      fields: TF,
    }})),
    ...customerRowNums.map(n => ({ repeatCell: {
      range: { sheetId, startRowIndex: n-1, endRowIndex: n, startColumnIndex: 0, endColumnIndex: ncols },
      cell: { userEnteredFormat: { backgroundColor: { red:0.878, green:0.929, blue:0.973 }, textFormat: { bold:true, foregroundColor:{red:0.1,green:0.3,blue:0.5} } } },
      fields: TF,
    }})),
    // 年群組（最外層，depth 0）
    ...yearGroups.map(g => ({ addDimensionGroup: {
      range: { sheetId, dimension: 'ROWS', startIndex: g.startIndex, endIndex: g.endIndex }
    }})),
    // 月群組（depth 1）
    ...monthGroups.map(g => ({ addDimensionGroup: {
      range: { sheetId, dimension: 'ROWS', startIndex: g.startIndex, endIndex: g.endIndex }
    }})),
    // 客戶群組（最內層，depth 2）
    ...customerGroups.map(g => ({ addDimensionGroup: {
      range: { sheetId, dimension: 'ROWS', startIndex: g.startIndex, endIndex: g.endIndex }
    }})),
  ]
  await sheetReq('POST', '/:batchUpdate', { requests })
}

// 一次性遷移：若報告總表仍有「編號」「客戶名稱」舊欄位，直接從 Sheet 刪除
async function migrateReportHeaders(sheetTitle: string) {
  const sheetId = await ensureSheet(sheetTitle)
  const raw = await sheetReq('GET', `/values/${encodeURIComponent(sheetTitle)}!A1:B1`)
  const firstRow: string[] = raw.values?.[0] ?? []
  if (firstRow[0] !== '編號') return
  const endIdx = firstRow[1] === '客戶名稱' ? 2 : 1
  await sheetReq('POST', '/:batchUpdate', {
    requests: [{ deleteDimension: {
      range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: endIdx }
    }}]
  })
}

export async function reorganizeAllSheets() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) return
  const names = await getSheetNames()
  const reportTab = names[0] ?? '報告總表'
  await migrateReportHeaders(reportTab)
  await reorganizeSheet(reportTab,  0, 20)  // A=資料夾名稱, U=建立時間
  await reorganizeSheet('X光總表',   1, 10)  // B=客戶名稱, K=建立時間
  await reorganizeSheet('客戶總表',  1, 9)   // B=姓名,     J=建立時間
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncIntake(intake: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.log('[sheets] skipped: env vars missing')
    return
  }
  console.log('[sheets] syncIntake start id=', intake.id)
  try {
    // 取得第一個工作表名稱作為「報告清單」的 tab
    const names = await getSheetNames()
    const reportTab = names[0] ?? 'Sheet1'
    console.log('[sheets] tabs=', names, 'using=', reportTab)

    await syncToSheet(reportTab, REPORT_HEADERS, String(intake.item_code ?? ''), intakeToRow(intake), 'B:B')
    console.log('[sheets] syncIntake done id=', intake.id)
  } catch (e) {
    console.error('[sheets] syncIntake error:', e)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncXray(record: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.log('[sheets] skipped: env vars missing')
    return
  }
  console.log('[sheets] syncXray start id=', record.id)
  try {
    await syncToSheet('X光總表', XRAY_HEADERS, String(record.id), xrayToRow(record))
    console.log('[sheets] syncXray done id=', record.id)
  } catch (e) {
    console.error('[sheets] syncXray error:', e)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function customerToRow(r: Record<string, any>): string[] {
  let types: string[] = []
  try { types = JSON.parse(r.collection_types || '[]') } catch { /* noop */ }
  return [
    String(r.id ?? ''),
    String(r.name ?? ''),
    String(r.gender ?? ''),
    String(r.phone ?? ''),
    String(r.line_id ?? ''),
    String(r.birthday ?? ''),
    String(r.address ?? ''),
    types.join('、'),
    String(r.note ?? ''),
    String(r.created_at ?? ''),
  ]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncCustomer(record: Record<string, any>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) return
  try {
    await syncToSheet('客戶總表', CUSTOMER_HEADERS, String(record.id), customerToRow(record))
  } catch (e) {
    console.error('[sheets] syncCustomer error:', e)
  }
}

export interface CardRecord {
  cardNumber: string
  status: string
  holder: string
  reportNumber: string
  category: string
  replacement: string
}

export async function lookupCard(cardNumber: string): Promise<CardRecord | null> {
  if (!SHEETS_API_KEY) return null

  const sheetNames = ['A800001~A800500', 'B201000~B201500', 'C503000~C503500']

  for (const sheet of sheetNames) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CARD_SHEET_ID}/values/${encodeURIComponent(sheet)}?key=${SHEETS_API_KEY}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      const rows: string[][] = data.values || []

      for (const row of rows.slice(1)) {
        if (row[0] === cardNumber) {
          return {
            cardNumber: row[0] || '',
            status: row[1] || '',
            holder: row[2] || '',
            reportNumber: row[3] || '',
            category: row[4] || '',
            replacement: row[5] || '',
          }
        }
      }
    } catch {
      continue
    }
  }
  return null
}
