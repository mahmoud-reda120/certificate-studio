/**
 * Canvas rendering engine for certificate pages with full measurement awareness.
 */

import type {
  CertificateProject,
  FieldStyle,
  ProjectField,
  RelBox
} from '@shared/types'
import { mmToPx, ptToPx, relBoxToPx } from '@shared/measure'
import { resolveFieldText, interpolate } from '@shared/templating'
import QRCode from 'qrcode'

export interface RenderOptions {
  dpi: number
  row: Record<string, string>
  /** When true, draw field outlines (editor only) */
  showGuides?: boolean
  selectedFieldId?: string | null
  /** Sample placeholder when empty */
  placeholderWhenEmpty?: boolean
}

function detectDirection(text: string, styleDir: FieldStyle['direction']): 'rtl' | 'ltr' {
  if (styleDir === 'rtl' || styleDir === 'ltr') return styleDir
  // auto: Arabic / Hebrew → rtl
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text
  )
    ? 'rtl'
    : 'ltr'
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (!text) return []
  const paragraphs = text.split(/\n/)
  const lines: string[] = []

  for (const para of paragraphs) {
    const words = para.split(/\s+/)
    let current = ''
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word
      if (ctx.measureText(trial).width <= maxWidth || !current) {
        current = trial
      } else {
        lines.push(current)
        current = word
        if (lines.length >= maxLines) break
      }
    }
    if (current && lines.length < maxLines) lines.push(current)
    if (lines.length >= maxLines) break
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines)
  }
  return lines
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: FieldStyle,
  maxW: number,
  maxH: number,
  dpi: number,
  fontFamily: string
): { fontSizePx: number; lines: string[] } {
  let sizePt = style.fontSizePt
  const minPt = 6

  while (sizePt >= minPt) {
    const fontSizePx = ptToPx(sizePt, dpi)
    ctx.font = `${style.fontWeight} ${fontSizePx}px "${fontFamily}", sans-serif`
    const lines =
      style.fit === 'wrap' || style.fit === 'shrink'
        ? wrapLines(ctx, text, maxW, style.maxLines)
        : text.split(/\n/).slice(0, style.maxLines)

    const lineHeightPx = fontSizePx * style.lineHeight
    const totalH = lines.length * lineHeightPx
    const maxLineW = Math.max(0, ...lines.map((l) => ctx.measureText(l).width))

    if (style.fit === 'none' || style.fit === 'wrap') {
      return { fontSizePx, lines }
    }

    // shrink
    if (totalH <= maxH && maxLineW <= maxW) {
      return { fontSizePx, lines }
    }
    sizePt -= 0.5
  }

  const fontSizePx = ptToPx(minPt, dpi)
  ctx.font = `${style.fontWeight} ${fontSizePx}px "${fontFamily}", sans-serif`
  const lines = wrapLines(ctx, text, maxW, style.maxLines)
  return { fontSizePx, lines }
}

function drawFieldChrome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: FieldStyle,
  dpi: number
): void {
  if (style.background) {
    const bg = style.background
    ctx.save()
    ctx.globalAlpha = bg.opacity
    ctx.fillStyle = bg.color
    roundRect(ctx, x, y, w, h, mmToPx(bg.radiusMm, dpi))
    ctx.fill()
    ctx.restore()
  }
  if (style.border) {
    const b = style.border
    ctx.save()
    ctx.strokeStyle = b.color
    ctx.lineWidth = mmToPx(b.widthMm, dpi)
    if (b.style === 'dashed') ctx.setLineDash([6, 4])
    roundRect(ctx, x, y, w, h, mmToPx(b.radiusMm, dpi))
    ctx.stroke()
    ctx.restore()
  }
}

function drawTextField(
  ctx: CanvasRenderingContext2D,
  field: ProjectField,
  pageW: number,
  pageH: number,
  dpi: number,
  text: string
): void {
  const box = relBoxToPx(field.box, pageW, pageH)
  const pad = field.style.paddingMm
  const contentX = box.x + mmToPx(pad.left, dpi)
  const contentY = box.y + mmToPx(pad.top, dpi)
  const contentW = Math.max(1, box.w - mmToPx(pad.left + pad.right, dpi))
  const contentH = Math.max(1, box.h - mmToPx(pad.top + pad.bottom, dpi))

  ctx.save()
  if (field.rotationDeg) {
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    ctx.translate(cx, cy)
    ctx.rotate((field.rotationDeg * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }

  drawFieldChrome(ctx, box.x, box.y, box.w, box.h, field.style, dpi)

  if (!text) {
    ctx.restore()
    return
  }

  const dir = detectDirection(text, field.style.direction)
  ctx.direction = dir
  const family = field.style.fontFamily
  const { fontSizePx, lines } = fitFontSize(
    ctx,
    text,
    field.style,
    contentW,
    contentH,
    dpi,
    family
  )

  const lineHeightPx = fontSizePx * field.style.lineHeight
  const totalH = lines.length * lineHeightPx

  let startY: number
  if (field.style.vAlign === 'top') startY = contentY
  else if (field.style.vAlign === 'bottom') startY = contentY + contentH - totalH
  else startY = contentY + (contentH - totalH) / 2

  ctx.fillStyle = field.style.color
  ctx.font = `${field.style.fontWeight} ${fontSizePx}px "${family}", sans-serif`
  ctx.textBaseline = 'top'

  if (field.style.letterSpacingEm !== 0) {
    // canvas letterSpacing (modern browsers)
    ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${field.style.letterSpacingEm * fontSizePx}px`
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let x: number
    if (field.style.align === 'left') {
      ctx.textAlign = 'left'
      x = contentX
    } else if (field.style.align === 'right') {
      ctx.textAlign = 'right'
      x = contentX + contentW
    } else {
      ctx.textAlign = 'center'
      x = contentX + contentW / 2
    }
    ctx.fillText(line, x, startY + i * lineHeightPx, contentW)
  }

  ctx.restore()
}

async function drawQrField(
  ctx: CanvasRenderingContext2D,
  field: ProjectField,
  pageW: number,
  pageH: number,
  dpi: number,
  url: string,
  qrStyle: CertificateProject['qr']
): Promise<void> {
  const box = relBoxToPx(field.box, pageW, pageH)
  ctx.save()

  drawFieldChrome(ctx, box.x, box.y, box.w, box.h, field.style, dpi)

  if (qrStyle.withBackground) {
    ctx.fillStyle = qrStyle.lightColor
    roundRect(
      ctx,
      box.x,
      box.y,
      box.w,
      box.h,
      mmToPx(qrStyle.backgroundRadiusMm, dpi)
    )
    ctx.fill()
  }

  if (!url) {
    ctx.restore()
    return
  }

  const size = Math.floor(Math.min(box.w, box.h) * 0.92)
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: qrStyle.errorCorrection,
    margin: qrStyle.margin,
    width: size,
    color: {
      dark: qrStyle.darkColor,
      light: qrStyle.lightColor
    }
  })

  const img = await loadImage(dataUrl)
  const dx = box.x + (box.w - size) / 2
  const dy = box.y + (box.h - size) / 2
  ctx.drawImage(img, dx, dy, size, size)
  ctx.restore()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function renderCertificate(
  project: CertificateProject,
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const { dpi, row, showGuides, selectedFieldId, placeholderWhenEmpty } = options
  const { width: pageW, height: pageH } = {
    width: Math.round((project.page.size.widthMm / 25.4) * dpi),
    height: Math.round((project.page.size.heightMm / 25.4) * dpi)
  }

  const canvas = document.createElement('canvas')
  canvas.width = pageW
  canvas.height = pageH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pageW, pageH)

  const tpl = project.template.imageDataUrl
  if (tpl) {
    try {
      const img = await loadImage(tpl)
      ctx.drawImage(img, 0, 0, pageW, pageH)
    } catch {
      // leave white
    }
  } else {
    // Subtle paper + guides when no template
    ctx.fillStyle = '#f7f4ee'
    ctx.fillRect(0, 0, pageW, pageH)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1
    const step = mmToPx(10, dpi)
    for (let x = 0; x < pageW; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, pageH)
      ctx.stroke()
    }
    for (let y = 0; y < pageH; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(pageW, y)
      ctx.stroke()
    }
  }

  // Margin / bleed guides (editor)
  if (showGuides) {
    const m = mmToPx(project.page.marginMm, dpi)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 1
    ctx.strokeRect(m, m, pageW - m * 2, pageH - m * 2)
    ctx.setLineDash([])

    if (project.page.bleedMm > 0) {
      const b = mmToPx(project.page.bleedMm, dpi)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'
      ctx.strokeRect(-b, -b, pageW + b * 2, pageH + b * 2)
    }
  }

  const fields = [...project.fields]
    .filter((f) => f.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex)

  for (const field of fields) {
    if (field.type === 'qr') {
      const url = interpolate(project.qr.urlTemplate, row)
      await drawQrField(ctx, field, pageW, pageH, dpi, url, project.qr)
    } else {
      let text = resolveFieldText(field.binding, row)
      if (!text && placeholderWhenEmpty) {
        text =
          field.binding.template ||
          field.binding.column ||
          field.name ||
          'نص تجريبي'
      }
      drawTextField(ctx, field, pageW, pageH, dpi, text)
    }

    if (showGuides) {
      const box = relBoxToPx(field.box, pageW, pageH)
      const selected = field.id === selectedFieldId
      ctx.save()
      ctx.strokeStyle = selected ? '#3b82f6' : 'rgba(15, 23, 42, 0.35)'
      ctx.lineWidth = selected ? 2 : 1
      ctx.setLineDash(selected ? [] : [4, 3])
      ctx.strokeRect(box.x, box.y, box.w, box.h)
      if (selected) {
        const hs = 7
        const handles = [
          [box.x, box.y],
          [box.x + box.w, box.y],
          [box.x, box.y + box.h],
          [box.x + box.w, box.y + box.h]
        ]
        ctx.fillStyle = '#3b82f6'
        for (const [hx, hy] of handles) {
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
        }
      }
      ctx.restore()
    }
  }

  return canvas
}

export function updateRelBoxFromDelta(
  box: RelBox,
  dxRel: number,
  dyRel: number
): RelBox {
  return {
    ...box,
    x: box.x + dxRel,
    y: box.y + dyRel
  }
}
