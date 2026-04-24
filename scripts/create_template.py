"""
生成 base.docx 模板（純文字版，docxtemplater 格式）
執行：python3 scripts/create_template.py
"""
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = Path(__file__).parent.parent / "templates" / "base.docx"
FONT = "PMingLiU"
PT11 = Pt(11)

COL1 = Cm(8.07)
COL2 = Cm(4.00)
COL3 = Cm(3.85)
ROW_PHOTO1 = Cm(7.2)
ROW_PHOTO2 = Cm(6.7)

def set_row_height(row, height):
    tr = row._tr
    trPr = tr.get_or_add_trPr()
    trHeight = OxmlElement('w:trHeight')
    trHeight.set(qn('w:val'), str(int(height.emu / 914400 * 1440)))
    trHeight.set(qn('w:hRule'), 'exact')
    trPr.append(trHeight)

def run(para, text, bold=False, size=None, color=None, italic=False):
    r = para.add_run(text)
    r.font.name = FONT
    r.font.size = size or PT11
    r.font.bold = bold
    r.font.italic = italic
    if color: r.font.color.rgb = color
    r._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    return r

def cell_text(cell, label, value_tag='', bold_label=False, center=False):
    cell.paragraphs[0].clear()
    p = cell.paragraphs[0]
    if center: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    if label: run(p, label, bold=bold_label)
    if value_tag: run(p, value_tag)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP

def cell_photo(cell, tag):
    cell.paragraphs[0].clear()
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run(p, tag)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

doc = Document()
section = doc.sections[0]
section.page_width  = Cm(21)
section.page_height = Cm(29.7)
section.left_margin = section.right_margin = Cm(2.54)
section.top_margin  = section.bottom_margin = Cm(2.54)

def dp(text='', bold=False, size=None, align=WD_ALIGN_PARAGRAPH.LEFT, underline=False, space_after=Pt(2)):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = space_after
    if text:
        r = run(p, text, bold=bold, size=size)
        r.font.underline = underline
    return p

# 標題
p_title = dp('東方森煌古物鑑定所檢驗報告', bold=True, size=Pt(14),
             align=WD_ALIGN_PARAGRAPH.CENTER, underline=True)

dp('Asia SenHuang Authentication Analysis Report', bold=True, size=Pt(12),
   align=WD_ALIGN_PARAGRAPH.CENTER)
dp('送驗編號 NO：{item_code}')
dp('送檢日期 S Date：{submission_date}        報告日期 R Date：{report_date}')
dp('顧客推估年代/形制 Presumed by customers：{presumed}')
dp('送檢相關圖片 Item Pix：')

# 主表格
table = doc.add_table(rows=6, cols=3)
table.style = 'Table Grid'
for row in table.rows:
    for i, w in enumerate([COL1, COL2, COL3]):
        row.cells[i].width = w

# Row 0：主體照 | XRF
set_row_height(table.rows[0], ROW_PHOTO1)
table.rows[0].cells[1].merge(table.rows[0].cells[2])
cell_photo(table.rows[0].cells[0], '{%photo_front}')
cell_photo(table.rows[0].cells[1], '{%photo_xrf}')

# Row 1：顯微照1 | 顯微照2
set_row_height(table.rows[1], ROW_PHOTO2)
table.rows[1].cells[1].merge(table.rows[1].cells[2])
cell_photo(table.rows[1].cells[0], '{%photo_micro1}')
cell_photo(table.rows[1].cells[1], '{%photo_micro2}')

# Row 2：尺寸 | 重量
table.rows[2].cells[0].merge(table.rows[2].cells[1])
cell_text(table.rows[2].cells[0], '尺寸 Size：mm\n', '{size}')
cell_text(table.rows[2].cells[2], '重量 Weight：gram\n', '{weight}')

# Row 3：材質 | 形制
table.rows[3].cells[1].merge(table.rows[3].cells[2])
cell_text(table.rows[3].cells[0], '材質 Material：\n', '{material}')
cell_text(table.rows[3].cells[1], '形制 Category：\n', '{category}')

# Row 4：鑑定說明
table.rows[4].cells[0].merge(table.rows[4].cells[1])
table.rows[4].cells[0].merge(table.rows[4].cells[2])
cell_text(table.rows[4].cells[0], '鑑定說明 Description：\n', '{description}')

# Row 5：鑑定結果 | 備註
table.rows[5].cells[0].merge(table.rows[5].cells[1])
cell_text(table.rows[5].cells[0], '鑑定結果 Result：\n', '{result}', bold_label=True)
cell_text(table.rows[5].cells[2], '備註 Note：\n', '{note}')

# 頁腳
p_f = dp(space_after=Pt(0))
p_f.alignment = WD_ALIGN_PARAGRAPH.CENTER
pPr2 = p_f._p.get_or_add_pPr()
pBdr2 = OxmlElement('w:pBdr')
top = OxmlElement('w:top')
top.set(qn('w:val'), 'single'); top.set(qn('w:sz'), '4'); top.set(qn('w:color'), 'DDDDDD')
pBdr2.append(top); pPr2.append(pBdr2)
p_f.paragraph_format.space_before = Pt(6)
run(p_f, 'TEL: +8862-82602664  ｜  Web: www.senhuang.org  ｜  Email: info@senhuang.org',
    size=Pt(9), color=RGBColor(0x88, 0x88, 0x88))

doc.save(str(OUT))
print(f"✓ 模板已生成：{OUT}")
