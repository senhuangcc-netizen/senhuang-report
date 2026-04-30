"""
生成 base.docx 模板（純文字版，docxtemplater 格式）
執行：python3 scripts/create_template.py
欄寬比例與 DraftPreview HTML 一致：44% / 22% / 34%
"""
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = Path(__file__).parent.parent / "templates" / "base.docx"
FONT      = "PMingLiU"
FONT_KAITI = "BiauKai"   # 標楷體，對應 DraftPreview 鑑定說明字型
PT11 = Pt(11)

# A4 可列印寬：21 - 2×2.54 = 15.92cm，比例 44/22/34
COL1 = Cm(7.00)   # 44%
COL2 = Cm(3.51)   # 22%
COL3 = Cm(5.41)   # 34%
ROW_PHOTO1 = Cm(7.28)   # 對應 HTML 275px
ROW_PHOTO2 = Cm(6.75)   # 對應 HTML 255px


def set_row_height(row, height):
    tr = row._tr
    trPr = tr.get_or_add_trPr()
    trHeight = OxmlElement('w:trHeight')
    trHeight.set(qn('w:val'), str(int(height.emu / 914400 * 1440)))
    trHeight.set(qn('w:hRule'), 'exact')
    trPr.append(trHeight)


def set_cell_margins_zero(cell):
    """照片格：移除 Word 預設 cell margin，讓圖片可以滿版填格"""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for side in ('top', 'start', 'bottom', 'end'):
        node = OxmlElement(f'w:{side}')
        node.set(qn('w:w'), '0')
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def run(para, text, bold=False, size=None, color=None, italic=False, font=None):
    r = para.add_run(text)
    f = font or FONT
    r.font.name = f
    r.font.size = size or PT11
    r.font.bold = bold
    r.font.italic = italic
    if color:
        r.font.color.rgb = color
    r._element.rPr.rFonts.set(qn('w:eastAsia'), f)
    return r


def cell_text(cell, label, value_tag='', bold_label=False, center=False, value_font=None):
    cell.paragraphs[0].clear()
    p = cell.paragraphs[0]
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    if label:
        run(p, label, bold=bold_label)
    if value_tag:
        run(p, value_tag, font=value_font)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP


def cell_photo(cell, tag):
    cell.paragraphs[0].clear()
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT   # left = docxtemplater image inline 較穩定
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run(p, tag)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
    set_cell_margins_zero(cell)


doc = Document()
section = doc.sections[0]
section.page_width   = Cm(21)
section.page_height  = Cm(29.7)
section.left_margin  = section.right_margin  = Cm(2.54)
section.top_margin   = section.bottom_margin = Cm(2.54)


def dp(text='', bold=False, size=None, align=WD_ALIGN_PARAGRAPH.LEFT,
       underline=False, space_after=Pt(2)):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after  = space_after
    if text:
        r = run(p, text, bold=bold, size=size)
        r.font.underline = underline
    return p


# ── 標題 ──
dp('東方森煌古物鑑定所檢驗報告', bold=True, size=Pt(13),
   align=WD_ALIGN_PARAGRAPH.CENTER, underline=True)
dp('Asia SenHuang Authentication Analysis Report', bold=True, size=Pt(11),
   align=WD_ALIGN_PARAGRAPH.CENTER)
dp('送驗編號 NO：{item_code}')
dp('送檢日期 S Date：{submission_date}        報告日期 R Date：{report_date}')
dp('顧客推估年代/形制 Presumed by customers：{presumed}')
dp('送檢相關圖片 Item Pix：')

# ── 主表格 ──
table = doc.add_table(rows=6, cols=3)
table.style = 'Table Grid'
for row in table.rows:
    for i, w in enumerate([COL1, COL2, COL3]):
        row.cells[i].width = w

# Row 0：主體照 | XRF（col2+3 合併）
set_row_height(table.rows[0], ROW_PHOTO1)
table.rows[0].cells[1].merge(table.rows[0].cells[2])
cell_photo(table.rows[0].cells[0], '{%photo_front}')
cell_photo(table.rows[0].cells[1], '{%photo_xrf}')

# Row 1：顯微照1 | 顯微照2（col2+3 合併）
set_row_height(table.rows[1], ROW_PHOTO2)
table.rows[1].cells[1].merge(table.rows[1].cells[2])
cell_photo(table.rows[1].cells[0], '{%photo_micro1}')
cell_photo(table.rows[1].cells[1], '{%photo_micro2}')

# Row 2：尺寸（col1+2 合併）| 重量
table.rows[2].cells[0].merge(table.rows[2].cells[1])
cell_text(table.rows[2].cells[0], '尺寸 Size：\n', '{size}', center=True)
cell_text(table.rows[2].cells[2], '重量 Weight：gram\n', '{weight}', center=True)

# Row 3：材質 | 形制（col2+3 合併）
table.rows[3].cells[1].merge(table.rows[3].cells[2])
cell_text(table.rows[3].cells[0], '材質 Material：\n', '{material}', center=True)
cell_text(table.rows[3].cells[1], '形制 Category：\n', '{category}')

# Row 4：鑑定說明（全合併），說明文字用標楷體
table.rows[4].cells[0].merge(table.rows[4].cells[1])
table.rows[4].cells[0].merge(table.rows[4].cells[2])
cell_text(table.rows[4].cells[0], '鑑定說明 Description：\n', '{description}',
          value_font=FONT_KAITI)

# Row 5：鑑定結果（col1+2 合併）| 備註
table.rows[5].cells[0].merge(table.rows[5].cells[1])
cell_text(table.rows[5].cells[0], '鑑定結果 Result：\n', '{result}', bold_label=True)
cell_text(table.rows[5].cells[2], '備註 Note：\n', '{note}')

# ── 頁腳 ──
p_f = dp(space_after=Pt(0))
p_f.alignment = WD_ALIGN_PARAGRAPH.CENTER
pPr = p_f._p.get_or_add_pPr()
pBdr = OxmlElement('w:pBdr')
top = OxmlElement('w:top')
top.set(qn('w:val'), 'single')
top.set(qn('w:sz'), '4')
top.set(qn('w:color'), 'DDDDDD')
pBdr.append(top)
pPr.append(pBdr)
p_f.paragraph_format.space_before = Pt(6)
run(p_f, 'TEL: +8862-82602664  ｜  Web: www.senhuang.org  ｜  Email: info@senhuang.org',
    size=Pt(9), color=RGBColor(0x88, 0x88, 0x88))

doc.save(str(OUT))
print(f"✓ 模板已生成：{OUT}")
