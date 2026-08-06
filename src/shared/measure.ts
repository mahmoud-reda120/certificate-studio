/**
 * Measurement & geometry utilities.
 * Canonical design units: millimeters for page physical size,
 * points (pt) for typography, relative 0–1 for field placement.
 */

/** 1 inch = 25.4 mm */
export const MM_PER_INCH = 25.4
/** 1 inch = 72 typographic points */
export const PT_PER_INCH = 72
/** 1 point in mm */
export const MM_PER_PT = MM_PER_INCH / PT_PER_INCH

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH
}

export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH
}

export function ptToPx(pt: number, dpi: number): number {
  return (pt / PT_PER_INCH) * dpi
}

export function pxToPt(px: number, dpi: number): number {
  return (px / dpi) * PT_PER_INCH
}

export function ptToMm(pt: number): number {
  return pt * MM_PER_PT
}

export function mmToPt(mm: number): number {
  return mm / MM_PER_PT
}

export function pageSizePx(
  widthMm: number,
  heightMm: number,
  dpi: number
): { width: number; height: number } {
  return {
    width: Math.round(mmToPx(widthMm, dpi)),
    height: Math.round(mmToPx(heightMm, dpi))
  }
}

/** Rel 0–1 → pixel rect on canvas */
export function relBoxToPx(
  box: { x: number; y: number; w: number; h: number },
  pageW: number,
  pageH: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: box.x * pageW,
    y: box.y * pageH,
    w: box.w * pageW,
    h: box.h * pageH
  }
}

/** Pixel rect → rel 0–1 */
export function pxBoxToRel(
  box: { x: number; y: number; w: number; h: number },
  pageW: number,
  pageH: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: box.x / pageW,
    y: box.y / pageH,
    w: box.w / pageW,
    h: box.h / pageH
  }
}

/** Clamp relative box inside [0,1] */
export function clampRelBox(box: {
  x: number
  y: number
  w: number
  h: number
}): { x: number; y: number; w: number; h: number } {
  const w = Math.min(1, Math.max(0.01, box.w))
  const h = Math.min(1, Math.max(0.01, box.h))
  const x = Math.min(1 - w, Math.max(0, box.x))
  const y = Math.min(1 - h, Math.max(0, box.y))
  return { x, y, w, h }
}

export function formatMm(mm: number, digits = 1): string {
  return `${mm.toFixed(digits)} مم`
}

export function formatPt(pt: number, digits = 1): string {
  return `${pt.toFixed(digits)} نقطة`
}

export function formatPx(px: number, digits = 0): string {
  return `${px.toFixed(digits)} بكسل`
}

/** Aspect ratio of page (width / height) */
export function pageAspect(widthMm: number, heightMm: number): number {
  return widthMm / heightMm
}

/**
 * Fit a page into a viewport while preserving aspect ratio.
 * Returns display size and scale factor (displayPx per pagePx at given dpi).
 */
export function fitPageInView(
  pageWidthPx: number,
  pageHeightPx: number,
  viewWidth: number,
  viewHeight: number,
  padding = 32
): { width: number; height: number; scale: number } {
  const availW = Math.max(1, viewWidth - padding * 2)
  const availH = Math.max(1, viewHeight - padding * 2)
  const scale = Math.min(availW / pageWidthPx, availH / pageHeightPx)
  return {
    width: pageWidthPx * scale,
    height: pageHeightPx * scale,
    scale
  }
}

export function snapValue(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

/** Snap relative box by pixel grid then convert back */
export function snapRelBox(
  box: { x: number; y: number; w: number; h: number },
  pageW: number,
  pageH: number,
  snapPx: number
): { x: number; y: number; w: number; h: number } {
  if (snapPx <= 0) return box
  const px = relBoxToPx(box, pageW, pageH)
  const snapped = {
    x: snapValue(px.x, snapPx),
    y: snapValue(px.y, snapPx),
    w: Math.max(snapPx, snapValue(px.w, snapPx)),
    h: Math.max(snapPx, snapValue(px.h, snapPx))
  }
  return clampRelBox(pxBoxToRel(snapped, pageW, pageH))
}

export function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}
