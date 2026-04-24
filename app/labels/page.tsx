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

// 固定版型：3.5×10cm 長條，一條4個，兩欄，8排，欄間距0.5mm
const COLS     = 2
const ROWS     = 8
const LABEL_W  = 35    // mm
const LABEL_H  = 25    // mm  (100mm / 4)
const COL_GAP  = 0.5   // mm

export default function LabelsPage() {
  const [codes,   setCodes]   = useState<string[]>([])
  const [qrUrls,  setQrUrls]  = useState<Record<string, string>>({})

  const count = COLS * ROWS

  const generate = useCallback(async () => {
    const next = Array.from({ length: count }, makeCode)
    setCodes(next)
    const urls: Record<string, string> = {}
    // QR 圖像尺寸塞入標籤寬減去邊距
    const qrSizePx = Math.round((LABEL_W - 4) * 3.78) // mm → px @96dpi
    await Promise.all(next.map(async code => {
      urls[code] = await QRCode.toDataURL(code, {
        width: qrSizePx,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
    }))
    setQrUrls(urls)
  }, [count])

  useEffect(() => { generate() }, [generate])

  const suffix = (code: string) => code.slice(-3)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }

          .label-grid {
            display: grid;
            grid-template-columns: ${LABEL_W}mm ${LABEL_W}mm;
            grid-template-rows: repeat(${ROWS}, ${LABEL_H}mm);
            column-gap: ${COL_GAP}mm;
            row-gap: 0;
            width: ${COLS * LABEL_W + COL_GAP}mm;
            margin: 5mm auto 0;
          }
          .label-cell {
            width: ${LABEL_W}mm;
            height: ${LABEL_H}mm;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            box-sizing: border-box;
            padding: 1.5mm;
            gap: 1.5mm;
            border: 0.2mm solid #ddd;
          }
          .label-cell img {
            width: ${LABEL_H - 5}mm;
            height: ${LABEL_H - 5}mm;
            flex-shrink: 0;
          }
          .label-cell .label-code {
            font-size: 21pt;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 1px;
            color: #000;
            line-height: 1;
            word-break: break-all;
          }
          @page { size: A4 portrait; margin: 5mm; }
        }

        /* 螢幕預覽：等比顯示 */
        .label-grid-preview {
          display: grid;
          grid-template-columns: repeat(${COLS}, ${LABEL_W * 3}px);
          grid-template-rows: repeat(${ROWS}, ${LABEL_H * 3}px);
          column-gap: ${COL_GAP * 3}px;
          row-gap: 0;
          width: fit-content;
          border: 1px solid #e5e7eb;
          margin: 0 auto;
        }
        .label-cell-preview {
          width: ${LABEL_W * 3}px;
          height: ${LABEL_H * 3}px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          box-sizing: border-box;
          padding: ${1.5 * 3}px;
          gap: ${1.5 * 3}px;
          border: 1px solid #e5e7eb;
        }
      `}</style>

      {/* 操作列 */}
      <div className="no-print flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10 flex-wrap">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
        <h1 className="font-bold text-gray-800">批量標籤（{COLS}欄 × {ROWS}排 = {count} 枚）</h1>
        <p className="text-xs text-gray-400">每格 {LABEL_W}×{LABEL_H}mm，欄距 {COL_GAP}mm</p>
        <div className="ml-auto flex gap-2">
          <button
            onClick={generate}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >重新產生</button>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
          >列印</button>
        </div>
      </div>

      <div className="no-print p-3 text-xs text-gray-400 text-center">
        列印後沿格線裁切。紙張設定 A4，邊距 5mm。
      </div>

      {/* 螢幕預覽 */}
      <div className="no-print p-4 overflow-x-auto">
        <div className="label-grid-preview">
          {codes.map(code => (
            <div key={code} className="label-cell-preview">
              {qrUrls[code]
                ? <img src={qrUrls[code]} alt={code} style={{ width: (LABEL_H - 5) * 3, height: (LABEL_H - 5) * 3 }} />
                : <div style={{ width: (LABEL_H - 5) * 3, height: (LABEL_H - 5) * 3, background: '#f3f4f6', borderRadius: 4 }} />
              }
              <span style={{ fontSize: 21 * 3 / 4, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
                {suffix(code)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 列印用隱藏層 */}
      <div className="label-grid" style={{ display: 'none' }} id="print-grid">
        {codes.map(code => (
          <div key={code} className="label-cell">
            {qrUrls[code] && <img src={qrUrls[code]} alt={code} />}
            <span className="label-code">{suffix(code)}</span>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          #print-grid { display: grid !important; }
          .label-grid-preview { display: none !important; }
        }
      `}</style>
    </>
  )
}
