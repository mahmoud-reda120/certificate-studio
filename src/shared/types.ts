/** Shared domain types for Certificate Studio */

export type TextAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type TextDirection = 'rtl' | 'ltr' | 'auto'
export type FieldType = 'text' | 'qr' | 'static'
export type FitMode = 'none' | 'shrink' | 'wrap'
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H'

/** Relative box on page — all values 0..1 (fraction of page width/height) */
export interface RelBox {
  x: number
  y: number
  w: number
  h: number
}

export interface FieldStyle {
  fontFamily: string
  /** Font size in typographic points (1 pt = 1/72 in) */
  fontSizePt: number
  fontWeight: 400 | 500 | 600 | 700
  color: string
  align: TextAlign
  vAlign: VerticalAlign
  direction: TextDirection
  /** Multiplier of font size */
  lineHeight: number
  /** Extra tracking in em */
  letterSpacingEm: number
  maxLines: number
  fit: FitMode
  /** Optional shape behind text */
  background: FieldBackground | null
  border: FieldBorder | null
  paddingMm: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface FieldBackground {
  color: string
  opacity: number
  /** Corner radius in mm */
  radiusMm: number
}

export interface FieldBorder {
  color: string
  /** Border width in mm */
  widthMm: number
  style: 'solid' | 'dashed'
  radiusMm: number
}

export interface FieldBinding {
  /** Excel column header */
  column?: string
  /**
   * Template string, e.g. "الطالب {{name}}" or static "شهادة تقدير"
   * Placeholders: {{Column Name}}
   */
  template?: string
}

export interface ProjectField {
  id: string
  name: string
  type: FieldType
  box: RelBox
  binding: FieldBinding
  style: FieldStyle
  /** Locked against accidental move on canvas */
  locked?: boolean
  visible?: boolean
  /** Rotation in degrees */
  rotationDeg?: number
  zIndex: number
}

export interface QrStyle {
  /** Quiet zone in modules (usually 1–4) */
  margin: number
  darkColor: string
  lightColor: string
  errorCorrection: QrErrorCorrection
  /** If true, draw white plate under QR */
  withBackground: boolean
  backgroundRadiusMm: number
  /** URL template: https://example.com/v/{{code}} */
  urlTemplate: string
}

export interface PageSize {
  /** Page width in millimeters */
  widthMm: number
  /** Page height in millimeters */
  heightMm: number
  name: string
}

export interface ProjectPage {
  size: PageSize
  /** Design / export resolution */
  dpi: number
  /** Optional bleed in mm (for print shops) */
  bleedMm: number
  /** Safe margin guide in mm */
  marginMm: number
}

export interface ProjectTemplate {
  /** Absolute or project-relative path; for in-memory: data URL */
  imagePath: string | null
  imageDataUrl: string | null
  /** Original image dimensions if known */
  naturalWidth?: number
  naturalHeight?: number
}

export interface ProjectFont {
  id: string
  family: string
  /** Built-in CSS family or custom file path / data */
  source: 'system' | 'bundled' | 'file'
  filePath?: string
  dataUrl?: string
}

export interface ExportSettings {
  /** Output PDF path template, supports {{column}} */
  fileNameTemplate: string
  /** Render DPI for export (print quality) */
  exportDpi: number
  jpegQuality: number
  /** Image compression for embedded pages: png | jpeg */
  pageImageFormat: 'png' | 'jpeg'
}

export interface ExcelData {
  fileName: string | null
  /** Column headers in order */
  columns: string[]
  /** Row objects keyed by column */
  rows: Record<string, string>[]
}

export interface CertificateProject {
  version: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  page: ProjectPage
  template: ProjectTemplate
  fonts: ProjectFont[]
  fields: ProjectField[]
  qr: QrStyle
  export: ExportSettings
}

export interface ParseExcelResult {
  columns: string[]
  rows: Record<string, string>[]
  sheetName: string
  rowCount: number
}

export const PAGE_PRESETS: PageSize[] = [
  { name: 'A4 Portrait', widthMm: 210, heightMm: 297 },
  { name: 'A4 Landscape', widthMm: 297, heightMm: 210 },
  { name: 'A5 Portrait', widthMm: 148, heightMm: 210 },
  { name: 'A5 Landscape', widthMm: 210, heightMm: 148 },
  { name: 'Letter Portrait', widthMm: 215.9, heightMm: 279.4 },
  { name: 'Letter Landscape', widthMm: 279.4, heightMm: 215.9 },
  { name: 'Square 200mm', widthMm: 200, heightMm: 200 }
]

export const BUNDLED_FONTS: ProjectFont[] = [
  { id: 'cairo', family: 'Cairo', source: 'bundled' },
  { id: 'amiri', family: 'Amiri', source: 'bundled' },
  { id: 'noto-naskh', family: 'Noto Naskh Arabic', source: 'bundled' },
  { id: 'noto-sans', family: 'Noto Sans', source: 'bundled' },
  { id: 'tajawal', family: 'Tajawal', source: 'bundled' },
  { id: 'playfair', family: 'Playfair Display', source: 'bundled' },
  { id: 'system-serif', family: 'Georgia, "Times New Roman", serif', source: 'system' },
  { id: 'system-sans', family: 'system-ui, "Segoe UI", sans-serif', source: 'system' }
]

export const DEFAULT_FIELD_STYLE: FieldStyle = {
  fontFamily: 'Cairo',
  fontSizePt: 24,
  fontWeight: 600,
  color: '#1a1a1a',
  align: 'center',
  vAlign: 'middle',
  direction: 'auto',
  lineHeight: 1.25,
  letterSpacingEm: 0,
  maxLines: 3,
  fit: 'shrink',
  background: null,
  border: null,
  paddingMm: { top: 1, right: 2, bottom: 1, left: 2 }
}

export const DEFAULT_QR: QrStyle = {
  margin: 1,
  darkColor: '#111111',
  lightColor: '#ffffff',
  errorCorrection: 'M',
  withBackground: true,
  backgroundRadiusMm: 2,
  urlTemplate: 'https://verify.example.com/c/{{code}}'
}

export function createDefaultProject(name = 'مشروع شهادة جديد'): CertificateProject {
  const now = new Date().toISOString()
  return {
    version: 1,
    id: cryptoRandomId(),
    name,
    createdAt: now,
    updatedAt: now,
    page: {
      size: { ...PAGE_PRESETS[1] }, // A4 Landscape default for certificates
      dpi: 150,
      bleedMm: 0,
      marginMm: 10
    },
    template: {
      imagePath: null,
      imageDataUrl: null
    },
    fonts: [...BUNDLED_FONTS],
    fields: [],
    qr: { ...DEFAULT_QR },
    export: {
      fileNameTemplate: 'certificates-{{class}}',
      exportDpi: 300,
      jpegQuality: 0.92,
      pageImageFormat: 'jpeg'
    }
  }
}

export function createDefaultTextField(
  partial?: Partial<ProjectField> & { id: string }
): ProjectField {
  return {
    id: partial?.id ?? cryptoRandomId(),
    name: partial?.name ?? 'حقل نص',
    type: partial?.type ?? 'text',
    box: partial?.box ?? { x: 0.2, y: 0.4, w: 0.6, h: 0.1 },
    binding: partial?.binding ?? { template: '' },
    style: { ...DEFAULT_FIELD_STYLE, ...(partial?.style ?? {}) },
    locked: partial?.locked ?? false,
    visible: partial?.visible ?? true,
    rotationDeg: partial?.rotationDeg ?? 0,
    zIndex: partial?.zIndex ?? 1
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
