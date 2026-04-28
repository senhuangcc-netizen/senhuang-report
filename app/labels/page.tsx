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

// AS513 規格：5欄 × 13列 = 65格，每格 38.1 × 21.2mm（含 5mm 列間隙時標籤高約 16.2mm）
const DEFAULT_COLS    = 5
const DEFAULT_ROWS    = 13
const DEFAULT_LABEL_W = 38.1  // mm
const DEFAULT_LABEL_H = 21.2  // mm
const DEFAULT_COL_GAP = 0     // mm（AS513 無欄距）
const DEFAULT_ROW_GAP = 0     // mm（依實體標籤紙調整）
const QR_MIN_MM       = 8     // 最小 QR 邊長

// AS513 頁邊距：A4(210×297mm) 扣除 5×38.1 / 13×21.2 後的餘量
const PAGE_MARGIN_H = 9.75  // mm 左右
const PAGE_MARGIN_V = 10.7  // mm 上下

export default function LabelsPage() {
  const [cols,   setCols]   = useState(DEFAULT_COLS)
  const [rows,   setRows]   = useState(DEFAULT_ROWS)
  const [labelW, setLabelW] = useState(DEFAULT_LABEL_W)
  const [labelH, setLabelH] = useState(DEFAULT_LABEL_H)
  const [colGap, setColGap] = useState(DEFAULT_COL_GAP)
  const [rowGap, setRowGap] = useState(DEFAULT_ROW_GAP)
  const [codes,  setCodes]  = useState<string[]>([])
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})

  const count = cols * rows

  // QR 邊長：標籤高 - 4mm padding，但最少 QR_MIN_MM
  const qrMm = Math.max(QR_MIN_MM, labelH - 4)
  // 高畫質 QR（列印用 300dpi）
  const qrPx = Math.max(300, Math.round(qrMm * 11.8))

  // 右側文字區：三碼垂直疊排
  // 每行高 = qrMm / 3，字體由行高決定
  const rowHMm  = qrMm / 3
  const fontPt  = Math.max(8, Math.floor(rowHMm * 2.83 * 0.85))

  const suffix = (code: string) => code.slice(-3)

  const generate = useCallback(async () => {
    const next = Array.from({ length: count }, makeCode)
    setCodes(next)
    const urls: Record<string, string> = {}
    await Promise.all(next.map(async code => {
      urls[code] = await QRCode.toDataURL(code, {
        width: qrPx,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
    }))
    setQrUrls(urls)
  }, [count, qrPx])

  useEffect(() => { generate() }, [generate])

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
            row-gap: ${rowGap}mm;
            width: ${cols * labelW + (cols - 1) * colGap}mm;
            margin: 0 auto;
          }
          .label-cell {
            width: ${labelW}mm;
            height: ${labelH}mm;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 1mm;
            gap: 1.5mm;
            border: none;
            overflow: hidden;
          }
          .label-cell img {
            width: ${qrMm}mm;
            height: ${qrMm}mm;
            flex-shrink: 0;
          }
          /* 三碼垂直疊排 */
          .label-cell .code-wrap {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: ${qrMm}mm;
            flex-shrink: 0;
          }
          .label-cell .code-char {
            font-size: ${fontPt}pt;
            font-family: 'Courier New', monospace;
            font-weight: 900;
            color: #000;
            line-height: 1;
            display: block;
          }
          @page { size: A4 portrait; margin: ${PAGE_MARGIN_V}mm ${PAGE_MARGIN_H}mm; }
        }
      `}</style>

      {/* 操作列 */}
      <div className="no-print flex items-center gap-3 p-3 border-b bg-white sticky top-0 z-10 flex-wrap text-sm shadow-sm">
        <Link href="/" className="text-gray-600 hover:text-gray-900">← 返回</Link>
        <span className="font-bold text-gray-900">批量標籤</span>
        <span className="text-gray-600 text-xs">共 {count} 格</span>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ml-2 text-xs text-gray-700">
          <label className="flex items-center gap-1">欄
            <input type="number" min={1} max={6} value={cols} onChange={e => setCols(Number(e.target.value))}
              className="w-10 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-900" />
          </label>
          <label className="flex items-center gap-1">列
            <input type="number" min={1} max={200} value={rows} onChange={e => setRows(Number(e.target.value))}
              className="w-14 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-900" />
          </label>
          <label className="flex items-center gap-1">寬
            <input type="number" min={20} max={100} value={labelW} onChange={e => setLabelW(Number(e.target.value))}
              className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-900" />mm
          </label>
          <label className="flex items-center gap-1">高
            <input type="number" min={10} max={100} value={labelH} onChange={e => setLabelH(Number(e.target.value))}
              className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-900" />mm
          </label>
          <label className="flex items-center gap-1">欄距
            <input type="number" min={0} max={10} step={0.5} value={colGap} onChange={e => setColGap(Number(e.target.value))}
              className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-900" />mm
          </label>
          <label className="flex items-center gap-1">列距
            <input type="number" min={0} max={10} step={0.5} value={rowGap} onChange={e => setRowGap(Number(e.target.value))}
              className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-900" />mm
          </label>
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={() => { setCols(5); setRows(13); setLabelW(38.1); setLabelH(21.2); setColGap(0); setRowGap(0) }}
            className="px-3 py-1.5 border border-amber-400 text-amber-700 text-sm rounded-lg hover:bg-amber-50 font-medium">AS513</button>
          <button onClick={generate}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">重新產生</button>
          <button
            onClick={() => {
              const rows = [['編號', '條碼', '後三碼'], ...codes.map((c, i) => [i + 1, c, suffix(c)])]
              const csv = rows.map(r => r.join(',')).join('\r\n')
              const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `labels_${codes.length}.csv`
              a.click()
            }}
            className="px-3 py-1.5 border border-green-400 text-green-700 text-sm rounded-lg hover:bg-green-50">下載 CSV</button>
          <button onClick={() => window.print()}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700">列印</button>
        </div>
      </div>

      {/* 螢幕預覽 */}
      <div className="no-print p-4 overflow-auto">
        <p className="text-xs text-gray-600 mb-3 text-center">
          AS513（5×13）每格 {labelW}×{labelH}mm｜QR {qrMm}mm｜欄距 {colGap}mm｜列距 {rowGap}mm｜共 {count} 格
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${labelW * previewScale}px)`,
          columnGap: `${colGap * previewScale}px`,
          rowGap: `${rowGap * previewScale}px`,
          width: 'fit-content',
          margin: '0 auto',
          border: '1px solid #d1d5db',
        }}>
          {codes.map(code => (
            <div key={code} style={{
              width: labelW * previewScale,
              height: labelH * previewScale,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: `${1 * previewScale}px`,
              gap: `${1.5 * previewScale}px`,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              {qrUrls[code]
                ? <img src={qrUrls[code]} alt={code}
                    style={{ width: qrMm * previewScale, height: qrMm * previewScale, flexShrink: 0 }} />
                : <div style={{ width: qrMm * previewScale, height: qrMm * previewScale, background: '#f3f4f6', borderRadius: 2, flexShrink: 0 }} />
              }
              {/* 三碼垂直疊排 */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: qrMm * previewScale, flexShrink: 0 }}>
                {suffix(code).split('').map((ch, i) => (
                  <span key={i} style={{
                    fontSize: fontPt * previewScale / 2.83,
                    fontFamily: 'Courier New, monospace',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#111',
                    display: 'block',
                  }}>{ch}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 列印層 */}
      <div className="label-grid" id="print-grid" style={{ display: 'none' }}>
        {codes.map(code => (
          <div key={code} className="label-cell">
            {qrUrls[code] && <img src={qrUrls[code]} alt={code} />}
            <div className="code-wrap">
              {suffix(code).split('').map((ch, i) => (
                <span key={i} className="code-char">{ch}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`@media print { #print-grid { display: grid !important; } }`}</style>
    </>
  )
}
