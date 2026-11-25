#!/usr/bin/env python3
"""
Convert the Software of Care manuscript (.docx exported from Pages) into one MDX file per chapter.

    python3 -I scripts/import-manuscript.py path/to/manuscript.docx data/book

What it maps:
  Heading "N. title"            -> new chapter file  (bibliography / acknowledgements too)
  Heading 2 / 3 / heading 4     -> ## / ### / ####
  heading 5 "Chapter Summary:"  -> <ChapterSummary>
  heading 5 "Implementation Plan:" -> <ImplementationPlan>
  heading 5 "Resources:"        -> <Sources title="Resources">
  heading 5 "Footnotes:"        -> GFM footnote definitions; inline "[n]" -> "[^n]"
  1x1 table "This chapter covers:" -> <ChapterOverview>
  1x1 table "[Example]..."      -> <Callout type="example">
  other 1x1 table               -> <Callout type="note">
  multi-column table            -> markdown table (blank template tables are dropped)
  floating image + caption      -> <Figure> using a placeholder image
  text box "X looks like:"      -> <Callout type="key">
  other text box / Quote style  -> blockquote

Only standard-library Python, so it runs with `python3 -I`.
"""

import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
W = '{%s}' % NS['w']
MC = '{%s}' % NS['mc']
A = '{%s}' % NS['a']
R = '{%s}' % NS['r']

PLACEHOLDER = {'src': '/static/images/book/placeholder.png', 'width': 1600, 'height': 1000}
SECTION_MARKERS = {
    'chapter summary': 'summary',
    'implementation plan': 'plan',
    'resources': 'resources',
    'footnotes': 'footnotes',
}
BACK_MATTER = {'bibliography': 90, 'acknowledgements': 91}


# ---------------------------------------------------------------- docx reading

class Docx:
    def __init__(self, path):
        z = zipfile.ZipFile(path)
        self.root = ET.fromstring(z.read('word/document.xml'))
        styles = ET.fromstring(z.read('word/styles.xml'))
        self.style_names = {}
        for s in styles.iter(W + 'style'):
            name = s.find('w:name', NS)
            self.style_names[s.get(W + 'styleId')] = name.get(W + 'val') if name is not None else ''
        self.list_formats = {}
        if 'word/numbering.xml' in z.namelist():
            num = ET.fromstring(z.read('word/numbering.xml'))
            abstract = {}
            for an in num.iter(W + 'abstractNum'):
                levels = {}
                for lvl in an.findall('w:lvl', NS):
                    fmt = lvl.find('w:numFmt', NS)
                    levels[lvl.get(W + 'ilvl')] = fmt.get(W + 'val') if fmt is not None else 'bullet'
                abstract[an.get(W + 'abstractNumId')] = levels
            for n in num.findall('w:num', NS):
                aid = n.find('w:abstractNumId', NS).get(W + 'val')
                self.list_formats[n.get(W + 'numId')] = abstract.get(aid, {})

    def style(self, p):
        s = p.find('w:pPr/w:pStyle', NS)
        return self.style_names.get(s.get(W + 'val'), s.get(W + 'val')) if s is not None else 'Normal'

    def list_info(self, p):
        num = p.find('w:pPr/w:numPr', NS)
        if num is None:
            return None
        num_id = num.find('w:numId', NS)
        ilvl = num.find('w:ilvl', NS)
        if num_id is None or num_id.get(W + 'val') == '0':
            return None
        level = ilvl.get(W + 'val') if ilvl is not None else '0'
        fmt = self.list_formats.get(num_id.get(W + 'val'), {}).get(level, 'bullet')
        return {'level': int(level), 'ordered': fmt not in ('bullet', 'none')}


def walk_skipping_fallback(el):
    """Yield descendants, skipping duplicated VML fallbacks (Word stores floating objects twice)."""
    for child in el:
        if child.tag in (MC + 'Fallback', W + 'pict'):
            continue
        yield child
        yield from walk_skipping_fallback(child)


def is_on(el):
    return el is not None and el.get(W + 'val', 'true') not in ('0', 'false', 'off')


def runs_of(p):
    """(text, bold, italic) runs for a paragraph, ignoring text inside floating objects."""
    out = []

    def visit(el):
        for child in el:
            tag = child.tag
            if tag in (MC + 'AlternateContent', W + 'drawing', W + 'pict', W + 'pPr'):
                continue
            if tag == W + 'r':
                rpr = child.find('w:rPr', NS)
                bold = rpr is not None and is_on(rpr.find('w:b', NS))
                italic = rpr is not None and is_on(rpr.find('w:i', NS))
                for part in child:
                    if part.tag == W + 't':
                        out.append((part.text or '', bold, italic))
                    elif part.tag == W + 'tab':
                        out.append((' ', bold, italic))
                    elif part.tag in (W + 'br', W + 'cr'):
                        out.append(('\n', False, False))
                    elif part.tag in (MC + 'AlternateContent', W + 'drawing', W + 'pict'):
                        continue
            else:
                visit(child)

    visit(p)
    return out


def floating_objects(p, docx):
    """Images and text boxes anchored in a paragraph."""
    objects = []
    for el in walk_skipping_fallback(p):
        if el.tag != W + 'drawing':
            continue
        images = [b.get(R + 'embed') for b in el.iter(A + 'blip')]
        boxes = []
        for tx in el.iter(W + 'txbxContent'):
            boxes.extend(tx.findall('.//w:p', NS))
        if images or boxes:
            objects.append({'images': images, 'paragraphs': boxes})
    return objects


# ---------------------------------------------------------------- markdown helpers

def escape(text):
    text = text.replace('\\', '\\\\')
    text = re.sub(r'([*_`{}])', r'\\\1', text)
    text = text.replace('<', '&lt;').replace('>', '&gt;')
    return text


def inline(runs):
    """Merge runs and wrap bold/italic spans, keeping whitespace outside the markers."""
    merged = []
    for text, bold, italic in runs:
        if merged and merged[-1][1] == bold and merged[-1][2] == italic:
            merged[-1][0] += text
        else:
            merged.append([text, bold, italic])
    out = ''
    for text, bold, italic in merged:
        if not text.strip() or not (bold or italic):
            out += escape(text)
            continue
        lead = text[: len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        core = escape(text.strip())
        mark = '***' if bold and italic else '**' if bold else '*'
        out += f'{lead}{mark}{core}{mark}{trail}'
    return out


def escape_block_start(line):
    """Stop paragraphs that start like markdown syntax from being parsed as such."""
    line = re.sub(r'^(\s*)(\d+)\.(\s)', r'\1\2\\.\3', line)
    line = re.sub(r'^(\s*)([-+#>])(\s)', r'\1\\\2\3', line)
    return line


def plain(p):
    return ''.join(t for t, _, _ in runs_of(p)).strip()


# ---------------------------------------------------------------- block conversion

class Converter:
    def __init__(self, docx):
        self.docx = docx
        self.report = []

    def paragraph_text(self, p):
        text = inline(runs_of(p)).strip()
        text = re.sub(r'[ \t]+', ' ', text)
        return text

    def blocks(self, elements, in_box=False):
        """Convert a sequence of w:p / w:tbl elements into markdown blocks (strings)."""
        out = []
        list_lines = []
        list_stack = []

        def flush_list():
            nonlocal list_lines, list_stack
            if list_lines:
                out.append('\n'.join(list_lines))
            list_lines, list_stack = [], []

        for el in elements:
            if el.tag == W + 'tbl':
                flush_list()
                out.extend(self.table(el))
                continue
            if el.tag != W + 'p':
                continue
            style = self.docx.style(el)
            text = self.paragraph_text(el)
            objects = [] if in_box else floating_objects(el, self.docx)
            info = self.docx.list_info(el)

            if info and text:
                level = info['level']
                list_stack = list_stack[:level]
                indent = sum(list_stack)
                marker = '1.' if info['ordered'] else '-'
                list_stack.append(len(marker) + 1)
                list_lines.append(' ' * indent + f'{marker} ' + text.replace('\n', ' '))
            else:
                flush_list()
                if text:
                    out.append(self.styled_paragraph(style, text))
            for obj in objects:
                flush_list()
                out.extend(self.floating(obj))
        flush_list()
        return [b for b in out if b and b.strip()]

    def styled_paragraph(self, style, text):
        s = style.lower()
        lines = [escape_block_start(line.strip()) for line in text.split('\n') if line.strip()]
        if s == 'heading 2':
            return f'## {text.splitlines()[0].strip()}' + ''.join(f'\n\n{l}' for l in lines[1:])
        if s == 'heading 3':
            return f'### {text.splitlines()[0].strip()}' + ''.join(f'\n\n{l}' for l in lines[1:])
        if s in ('heading 4', 'heading 5', 'heading'):
            return f'#### {text.splitlines()[0].strip()}' + ''.join(f'\n\n{l}' for l in lines[1:])
        if s == 'quote':
            return '\n>\n'.join(f'> {l}' for l in lines)
        if s == 'object caption':
            return f'*{" ".join(lines)}*'
        return '\n\n'.join(lines)

    def floating(self, obj):
        paragraphs = obj['paragraphs']
        caption = ' '.join(plain(p) for p in paragraphs if self.docx.style(p).lower() == 'object caption')
        if obj['images']:
            caption = caption.strip() or 'Figure'
            self.report.append(f'figure: {caption}')
            return [
                '<Figure\n'
                f'  src="{PLACEHOLDER["src"]}"\n'
                f'  alt="{attr(caption)}"\n'
                f'  width={{{PLACEHOLDER["width"]}}}\n'
                f'  height={{{PLACEHOLDER["height"]}}}\n'
                f'  caption="{attr(caption)}"\n'
                '/>'
            ]
        texts = [p for p in paragraphs if plain(p)]
        if not texts:
            return []
        first = plain(texts[0])
        if first.rstrip().endswith('looks like:'):
            items = [self.paragraph_text(p) for p in texts[1:]]
            body = '\n'.join(f'- {i}' for i in items)
            return [f'<Callout type="key" title="{attr(first.rstrip(": "))}">\n\n{body}\n\n</Callout>']
        quote = self.blocks(texts, in_box=True)
        return ['\n>\n'.join('> ' + line for block in quote for line in block.split('\n\n'))]

    def table(self, tbl):
        rows = tbl.findall('w:tr', NS)
        grid = [[tc for tc in tr.findall('w:tc', NS)] for tr in rows]
        cols = max((len(r) for r in grid), default=0)
        all_text = ' '.join(plain(p) for p in tbl.iter(W + 'p')).strip()
        if not all_text:
            return []
        if len(rows) == 1 and cols == 1:
            return self.box(grid[0][0])
        return [self.markdown_table(grid)]

    def box(self, cell):
        elements = [el for el in cell if el.tag in (W + 'p', W + 'tbl')]
        first = next((plain(el) for el in elements if el.tag == W + 'p' and plain(el)), '')
        if first.lower().startswith('this chapter covers'):
            items = [plain(el) for el in elements if el.tag == W + 'p' and plain(el)][1:]
            if all(re.fullmatch(r'Item \d+', i) for i in items):
                self.report.append('skipped placeholder "This chapter covers: Item 1, Item 2..." box')
                return []
            body = self.blocks(elements)[1:]
            return ['<ChapterOverview>\n\n' + '\n\n'.join(body) + '\n\n</ChapterOverview>']
        body = self.blocks(elements)
        if first.startswith('[Example]'):
            body[0] = re.sub(r'^\[?(\*+)?\[?Example\]?(\*+)?\]?\s*', '', body[0]).strip()
            body = [b for b in body if b]
            return ['<Callout type="example">\n\n' + '\n\n'.join(body) + '\n\n</Callout>']
        return ['<Callout type="note">\n\n' + '\n\n'.join(body) + '\n\n</Callout>']

    def markdown_table(self, grid):
        def cell_text(tc):
            parts = []
            for p in tc.iter(W + 'p'):
                t = self.paragraph_text(p).replace('\n', ' ')
                if t:
                    parts.append(('• ' if self.docx.list_info(p) else '') + t)
            return '<br />'.join(parts).replace('|', '\\|')

        rows = [[cell_text(tc) for tc in row] for row in grid]
        rows = [r for r in rows if any(c.strip() for c in r)]
        cols = max(len(r) for r in rows)
        rows = [r + [''] * (cols - len(r)) for r in rows]
        # Markdown tables need a header row; when the first row is data, use an empty one (hidden by CSS).
        has_header = all(len(c) <= 40 for c in rows[0])
        header, body = (rows[0], rows[1:]) if has_header else ([''] * cols, rows)
        lines = ['| ' + ' | '.join(header) + ' |', '| ' + ' | '.join(['---'] * cols) + ' |']
        lines += ['| ' + ' | '.join(r) + ' |' for r in body]
        return '\n'.join(lines)


def attr(text):
    return text.replace('"', '&quot;').strip()


# ---------------------------------------------------------------- chapters

def slugify(text):
    text = text.lower().replace('&', ' ').replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def body_elements(root):
    body = root.find('w:body', NS)
    for el in body:
        if el.tag == W + 'sdt':
            content = el.find('w:sdtContent', NS)
            yield from (content if content is not None else [])
        else:
            yield el


def chapter_heading(docx, el):
    if el.tag != W + 'p' or docx.style(el).lower() != 'heading':
        return None
    text = plain(el)
    m = re.match(r'^(\d+)\.\s*(.+?)\s*$', text)
    if m:
        return int(m.group(1)), m.group(2).rstrip('. ').strip()
    if text.lower().strip() in BACK_MATTER:
        return BACK_MATTER[text.lower().strip()], text.strip()
    return None


def section_marker(docx, el):
    """Section labels like "Footnotes:" appear both as heading 5 and as short bold body text."""
    if el.tag != W + 'p':
        return None
    text = plain(el).lower().rstrip(': ').strip()
    return SECTION_MARKERS.get(text)


def split_sections(docx, elements):
    """Split a chapter's elements into main body and marker sections (summary, plan, footnotes...)."""
    sections = {'main': []}
    current = 'main'
    for el in elements:
        key = section_marker(docx, el)
        if key:
            current = key
            sections.setdefault(key, [])
            continue
        sections.setdefault(current, []).append(el)
    return sections


def parse_footnotes(docx, elements):
    """Notes are written as "[1] ...", "1. ...", or as (auto-numbered or bulleted) list items."""
    notes, counter = {}, 0
    for el in elements:
        if el.tag != W + 'p':
            continue
        text = plain(el)
        if not text:
            continue
        explicit = list(re.finditer(r'\[(\d+)\]\s*(.*?)(?=\[\d+\]\s|$)', text))
        if explicit and text.startswith('['):
            for m in explicit:
                if m.group(2).strip():
                    notes[m.group(1)] = m.group(2).strip()
                    counter = int(m.group(1))
            continue
        m = re.match(r'^(\d+)[.)]\s+(.*)$', text)
        if m:
            notes[m.group(1)] = m.group(2).strip()
            counter = int(m.group(1))
            continue
        counter += 1
        notes[str(counter)] = text
    return notes


def meaningful(blocks):
    """Drop sections that only hold filler such as a stray keystroke."""
    text = re.sub(r'[^A-Za-z ]', '', ' '.join(blocks)).strip()
    return blocks if len(text) > 12 and ' ' in text else []


def render_chapter(conv, number, title, elements):
    docx = conv.docx
    sections = split_sections(docx, elements)
    blocks = conv.blocks(sections['main'])
    notes = parse_footnotes(docx, sections.get('footnotes', []))

    # Inline citations like "[3]" become footnote references when a matching note exists.
    def cite(m):
        numbers = [n.strip() for n in m.group(1).split(',')]
        if all(n in notes for n in numbers):
            return ''.join(f'[^{n}]' for n in numbers)
        return m.group(0)

    blocks = [
        re.sub(r'\s?\[(\d+(?:\s*,\s*\d+)*)\]', cite, b) if not b.startswith('<Figure') else b
        for b in blocks
    ]
    used = set(re.findall(r'\[\^(\d+)\]', '\n'.join(blocks)))
    for n in notes:
        if n not in used:
            conv.report.append(f'ch {number}: note [{n}] has no inline reference; listed in Sources')

    summary = meaningful(conv.blocks(sections.get('summary', [])))
    if summary:
        blocks.append('<ChapterSummary>\n\n' + '\n\n'.join(summary) + '\n\n</ChapterSummary>')
    plan = meaningful(conv.blocks(sections.get('plan', [])))
    if plan:
        blocks.append('<ImplementationPlan>\n\n' + '\n\n'.join(plan) + '\n\n</ImplementationPlan>')
    resources = conv.blocks(sections.get('resources', []))
    if resources:
        blocks.append('<Sources title="Resources">\n\n' + '\n\n'.join(resources) + '\n\n</Sources>')
    unused = [f'1. {escape(notes[n])}' for n in notes if n not in used]
    if unused:
        blocks.append('<Sources>\n\n' + '\n'.join(unused) + '\n\n</Sources>')
    blocks += [f'[^{n}]: {escape(notes[n])}' for n in notes if n in used]

    if number == 0:
        label = 'Introduction'
    elif number >= 90:
        label = None
    else:
        label = f'Chapter {number}'
    status = {
        'summary': bool(summary),
        'plan': bool(plan),
    }
    return label, '\n\n'.join(blocks) + '\n', status


# Chapters grouped into parts: (first chapter, last chapter, folder). Part title pages
# (index.mdx in each folder) are written by hand and never touched by this script.
PARTS = [
    (1, 4, '01-imagining-care'),
    (5, 9, '02-building-the-software'),
    (10, 17, '03-bringing-it-to-the-world'),
]


def main():
    src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    docx = Docx(src)
    conv = Converter(docx)

    chapters, current = [], None
    for el in body_elements(docx.root):
        heading = chapter_heading(docx, el)
        if heading:
            current = {'number': heading[0], 'title': heading[1], 'elements': []}
            chapters.append(current)
        elif current is not None:
            current['elements'].append(el)

    out_dir.mkdir(parents=True, exist_ok=True)
    for ch in chapters:
        label, body, status = render_chapter(conv, ch['number'], ch['title'], ch['elements'])
        name = f'{ch["number"]:02d}-{slugify(ch["title"])}.mdx'
        folder = next((f for first, last, f in PARTS if first <= ch['number'] <= last), '')
        path = out_dir / folder / name
        path.parent.mkdir(parents=True, exist_ok=True)
        title = ch['title'].replace("'", "''")
        fm = ['---', f"title: '{title}'"]
        if label:
            fm.append(f"label: '{label}'")
        fm.append('---')
        frontmatter = '\n'.join(fm)
        # Frontmatter edited on the site (poems, summaries, …) wins over the manuscript's.
        if path.exists():
            existing = re.match(r'---\n.*?\n---', path.read_text(), re.S)
            if existing:
                frontmatter = existing.group(0)
        path.write_text(frontmatter + '\n\n' + body)
        words = len(body.split())
        flags = ', '.join(k for k, v in status.items() if not v)
        print(f'{folder + "/" + name if folder else name:70} {words:6} words' + (f'   (empty: {flags})' if flags and ch['number'] < 90 else ''))

    print('\nNotes:')
    for line in conv.report:
        print(' -', line)


if __name__ == '__main__':
    main()
