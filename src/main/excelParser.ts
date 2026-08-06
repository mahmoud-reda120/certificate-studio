import JSZip from 'jszip'
import { readFile } from 'fs/promises'
import type { ParseExcelResult } from '../shared/types'

/**
 * Minimal .xlsx reader (first sheet, row 1 = headers).
 * Avoids exceljs native/ESM dependency hell in Electron main.
 */
export async function parseExcelFile(filePath: string): Promise<ParseExcelResult> {
  const buf = await readFile(filePath)
  const zip = await JSZip.loadAsync(buf)

  const sharedStrings = await readSharedStrings(zip)
  const sheetPath = await firstSheetPath(zip)
  if (!sheetPath) throw new Error('لا توجد أوراق في ملف Excel')

  const sheetXml = await zip.file(sheetPath)!.async('string')
  const rowsRaw = extractSheetRows(sheetXml, sharedStrings)

  if (rowsRaw.length === 0) {
    return { columns: [], rows: [], sheetName: 'Sheet1', rowCount: 0 }
  }

  const columns = rowsRaw[0].map((c, i) => c.trim() || `عمود_${i + 1}`)
  const rows: Record<string, string>[] = []

  for (let r = 1; r < rowsRaw.length; r++) {
    const cells = rowsRaw[r]
    if (cells.every((c) => !String(c).trim())) continue
    const obj: Record<string, string> = {}
    columns.forEach((col, i) => {
      obj[col] = cells[i] ?? ''
    })
    rows.push(obj)
  }

  const sheetName = sheetPath.split('/').pop()?.replace(/\.xml$/i, '') || 'Sheet1'
  return { columns, rows, sheetName, rowCount: rows.length }
}

async function firstSheetPath(zip: JSZip): Promise<string | null> {
  // Prefer workbook relationships for real sheet order
  const wbRels = zip.file('xl/_rels/workbook.xml.rels')
  const wb = zip.file('xl/workbook.xml')
  if (wb && wbRels) {
    const relsXml = await wbRels.async('string')
    const wbXml = await wb.async('string')
    const firstSheetId = match1(wbXml, /<sheet[^>]*r:id="([^"]+)"/i)
    if (firstSheetId) {
      const target = match1(
        relsXml,
        new RegExp(`Id="${escapeRe(firstSheetId)}"[^>]*Target="([^"]+)"`, 'i')
      ) || match1(
        relsXml,
        new RegExp(`Target="([^"]+)"[^>]*Id="${escapeRe(firstSheetId)}"`, 'i')
      )
      if (target) {
        const path = target.startsWith('/')
          ? target.slice(1)
          : `xl/${target.replace(/^\.\//, '')}`
        if (zip.file(path)) return path
      }
    }
  }

  const names = Object.keys(zip.files).filter(
    (n) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n)
  )
  names.sort()
  return names[0] ?? null
}

async function readSharedStrings(zip: JSZip): Promise<string[]> {
  const f = zip.file('xl/sharedStrings.xml')
  if (!f) return []
  const xml = await f.async('string')
  const items: string[] = []
  // Each <si>...</si>
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi
  let m: RegExpExecArray | null
  while ((m = siRe.exec(xml))) {
    const inner = m[1]
    // Concatenate all <t> text runs (rich text)
    const texts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((t) =>
      decodeXml(t[1])
    )
    items.push(texts.join(''))
  }
  return items
}

function extractSheetRows(sheetXml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi
  let rm: RegExpExecArray | null
  while ((rm = rowRe.exec(sheetXml))) {
    const rowXml = rm[0]
    const rowInner = rm[1]
    const rowNum = parseInt(match1(rowXml, /r="(\d+)"/) || '0', 10)

    // Pad empty rows if needed
    while (rows.length < rowNum - 1) rows.push([])

    const cells: { col: number; value: string }[] = []
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi
    let cm: RegExpExecArray | null
    while ((cm = cellRe.exec(rowInner))) {
      const attrs = cm[1] || cm[3] || ''
      const body = cm[2] || ''
      const ref = match1(attrs, /\br="([A-Z]+\d+)"/i)
      const col = ref ? colLettersToIndex(ref.replace(/\d+/g, '')) : cells.length
      const type = match1(attrs, /\bt="([^"]+)"/i)
      let value = ''
      if (type === 'inlineStr') {
        value = decodeXml(
          [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((t) => t[1]).join('')
        )
      } else {
        const v = match1(body, /<v[^>]*>([\s\S]*?)<\/v>/i)
        if (v != null) {
          if (type === 's') {
            const idx = parseInt(v, 10)
            value = shared[idx] ?? ''
          } else {
            value = decodeXml(v)
          }
        }
      }
      cells.push({ col, value: String(value).trim() })
    }

    if (cells.length === 0) {
      rows.push([])
      continue
    }
    const maxCol = Math.max(...cells.map((c) => c.col))
    const arr = Array.from({ length: maxCol + 1 }, () => '')
    for (const c of cells) arr[c.col] = c.value
    rows.push(arr)
  }
  return rows
}

function colLettersToIndex(letters: string): number {
  let n = 0
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64)
  }
  return n - 1
}

function match1(s: string, re: RegExp): string | null {
  const m = s.match(re)
  return m ? m[1] : null
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}
