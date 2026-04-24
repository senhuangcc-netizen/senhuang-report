# 東方森煌建單系統 (Oriental Senhuang Intake System)

文物鑑定送驗建單 Web 應用，部署於 Vercel。

## 功能

- 新建 / 編輯送驗單（照片上傳、XRF PDF 裁切）
- 批量 QR 標籤列印（`/labels`）
- 掃描標籤自動填入建單
- Word 鑑定報告自動生成（`.docx`）
- 建單狀態追蹤（草稿 / 送出 / 已完成）

## 技術架構

| 項目 | 技術 |
|---|---|
| 框架 | Next.js 16 App Router |
| 資料庫 | Neon Postgres（`@vercel/postgres`）|
| 檔案儲存 | Vercel Blob |
| Word 生成 | docxtemplater + pizzip |
| QR 生成 | qrcode |
| QR 掃描 | html5-qrcode |
| 部署 | Vercel（Hobby） |

## 目錄結構

```
app/
  page.tsx              # 建單清單（首頁）
  new/page.tsx          # 新增 / 編輯建單
  labels/page.tsx       # 批量 QR 標籤列印
  intake/[id]/          # 建單詳情 + 報告預覽
  api/                  # API Routes
components/             # 共用 UI 元件
lib/                    # DB、Blob、試算表、模板工具
scripts/
  create_template.py    # 重新產生 templates/base.docx
templates/
  base.docx             # Word 報告模板
```

## 本地開發

```bash
npm install
npm run dev
```

環境變數請參考 `.env.local.example`。

## 模板更新

```bash
python3 scripts/create_template.py
python3 -c "import base64,pathlib; print('export const BASE_DOCX_B64 = \"' + base64.b64encode(pathlib.Path('templates/base.docx').read_bytes()).decode() + '\"')" > lib/template.ts
vercel --prod
```

## 部署

```bash
vercel --prod
```
