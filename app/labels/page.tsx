'use client'
import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import Link from 'next/link'

function makeCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const prefix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `${prefix}${letter}${digits}`
}

// 預設版型：3.5cm 寬條，一條4個 QR（每格 35×25mm），兩欄8條 = 64格
const DEFAULT_COLS    = 2
const DEFAULT_ROWS    = 32   // 8條 × 4格/條 = 32列 × 2欄 = 64格
const DEFAULT_LABEL_W = 35   // mm
const DEFAULT_LABEL_H = 25   // mm
const DEFAULT_COL_GAP = 0.5  // mm

export default function LabelsPage() {
  const [cols,    setCols]    = useState(DEFAULT_COLS)
  const [rows,    setRows]    = useState(DEFAULT_ROWS)
  const [labelW,  setLabelW]  = useState(DEFAULT_LABEL_W)
  const [labelH,  setLabelH]  = useState(DEFAULT_LABEL_H)
  const [colGap,  setColGap]  = useState(DEFAULT_COL_GAP)
  const [codes,   setCodes]   = useState<string[]>([])
  const [qrUrls,  setQrUrls]  = useState<Record<string, string>>({})

  const count = cols * rows

  // QR 圖像邊長：標籤高度 - 上下各 2mm padding（轉 px @96dpi）
  const qrMm  = labelH - 4
  const qrPx  = Math.round(qrMm * 3.78)

  // 右側文字區寬度
  const textAreaMm = labelW - qrMm - 3  // 3mm 間距

  // 字體大小：填滿右側寬度（3個字元橫排，每字 ~0.6em 寬）
  // 但也讓高度不超過標籤高：用寬度除以3字 / 0.55 來推算上限
  const fontPt = Math.min(
    Math.floor(textAreaMm / 3 / 0.55 * 2.83),  // 由寬度推
    Math.floor(labelH * 2.83 * 0.9)             // 由高度推上限
  )

  const generate = useCallback(async () => {
    const next = Array.from({ length: count }, makeCode)
    setCodes(next)
    const urls: Record<string, string> = {}
    await Promise.all(next.map(async code => {
      urls[code] = await QRCode.toDataURL(code, { width: qrPx, margin: 1, errorCorrectionLevel: 'M' })
    }))
    setQrUrls(urls)
  }, [count, qrPx])

  useEffect(() => { generate() }, [generate])

  const suffix = (code: string) => code.slice(-3)

  /* ── 螢幕預覽 scale：讓兩欄完整顯示在視窗內 ── */
  const previewScale = 3  // 1mm → 3px

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }

          .label-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, ${labelW}mm);
            grid-template-rows: repeat(${rows}, ${labelH}mm);
            column-gap: ${colGap}mm;
            row-gap: 0;
            width: ${cols * labelW + (cols - 1) * colGap}mm;
            margin: 0 auto;
          }
          .label-cell {
            width: ${labelW}mm;
            height: ${labelH}mm;
            display: flex;
            flex-direction: row;
            align-items: center;
            box-sizing: border-box;
            padding: 1mm;
            gap: 1mm;
            border: 0.2mm solid #ccc;
            overflow: hidden;
          }
          .label-cell img {
            width: ${qrMm}mm;
            height: ${qrMm}mm;
            flex-shrink: 0;
          }
          .label-cell .code {
            font-size: ${fontPt}pt;
            font-family: 'Courier New', monospace;
            font-weight: 900;
            letter-spacing: 0px;
            color: #000;
            line-height: 1;
            flex-shrink: 0;
          }
          @page { size: A4 portrait; margin: 5mm; }
        }
      `}</style>

      {/* 操作列 */}
      <div className="no-print flex items-center gap-3 p-3 border-b bg-white sticky top-0 z-10 flex-wrap text-sm shadow-sm">
        <Link href="/" className="text-gray-400 hover:text-gray-600">← 返回</Link>
        <span className="font-bold text-gray-800">批量標籤</span>
        <span className="text-gray-400 text-xs">共 {count} 格</span>

        {/* 手動調整 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ml-2 text-xs text-gray-600">
          <label className="flex items-center gap-1">
            欄
            <input type="number" min={1} max={6} value={cols}
              onChange={e => setCols(Number(e.target.value))}
              className="w-10 border border-gray-200 rounded px-1 py-0.5 text-center" />
          </label>
          <label className="flex items-center gap-1">
            列
            <input type="number" min={1} max={200} value={rows}
              onChange={e => setRows(Number(e.target.value))}
              className="w-14 border border-gray-200 rounded px-1 py-0.5 text-center" />
          </label>
          <label className="flex items-center gap-1">
            寬
            <input type="number" min={20} max={100} value={labelW}
              onChange={e => setLabelW(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center" />
            mm
          </label>
          <label className="flex items-center gap-1">
            高
            <input type="number" min={10} max={100} value={labelH}
              onChange={e => setLabelH(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center" />
            mm
          </label>
          <label className="flex items-center gap-1">
            欄距
            <input type="number" min={0} max={10} step={0.5} value={colGap}
              onChange={e => setColGap(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center" />
            mm
          </label>
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={generate}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            重新產生
          </button>
          <button onClick={() => window.print()}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700">
            列印
          </button>
        </div>
      </div>

      {/* 螢幕預覽 */}
      <div className="no-print p-4 overflow-auto">
        <p className="text-xs text-gray-400 mb-3 text-center">
          每格 {labelW}×{labelH}mm｜欄距 {colGap}mm｜共 {count} 格（預覽縮放 {previewScale}×）
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${labelW * previewScale}px)`,
          gridTemplateRows: `repeat(${rows}, ${labelH * previewScale}px)`,
          columnGap: `${colGap * previewScale}px`,
          rowGap: '0',
          width: 'fit-content',
          margin: '0 auto',
          border: '1px solid #e5e7eb',
        }}>
          {codes.map(code => (
            <div key={code} style={{
              width: labelW * previewScale,
              height: labelH * previewScale,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              boxSizing: 'border-box',
              padding: `${1 * previewScale}px`,
              gap: `${1 * previewScale}px`,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              {qrUrls[code]
                ? <img src={qrUrls[code]} alt={code}
                    style={{ width: qrMm * previewScale, height: qrMm * previewScale, flexShrink: 0 }} />
                : <div style={{ width: qrMm * previewScale, height: qrMm * previewScale, background: '#f3f4f6', borderRadius: 2, flexShrink: 0 }} />
              }
              <span style={{
                fontSize: fontPt * previewScale / 2.83 * 1.5,  // pt → px for screen
                fontFamily: 'Courier New, monospace',
                fontWeight: 900,
                lineHeight: 1,
                color: '#111',
                flexShrink: 0,
              }}>
                {suffix(code)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 列印層 */}
      <div className="label-grid" id="print-grid" style={{ display: 'none' }}>
        {codes.map(code => (
          <div key={code} className="label-cell">
            {qrUrls[code] && <img src={qrUrls[code]} alt={code} />}
            <span className="code">{suffix(code)}</span>
          </div>
        ))}
      </div>

      <style>{`
        @media print { #print-grid { display: grid !important; } }
      `}</style>
    </>
  )
}
