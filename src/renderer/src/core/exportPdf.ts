import { PDFDocument } from 'pdf-lib'
import type { CertificateProject } from '@shared/types'
import { mmToPx } from '@shared/measure'
import { applyFileNameTemplate } from '@shared/templating'
import { renderCertificate } from './renderCertificate'

export interface ExportProgress {
  current: number
  total: number
  message: string
}

export async function buildCertificatesPdf(
  project: CertificateProject,
  rows: Record<string, string>[],
  onProgress?: (p: ExportProgress) => void
): Promise<{ bytes: Uint8Array; fileName: string }> {
  if (rows.length === 0) {
    throw new Error('لا توجد صفوف لتصديرها')
  }

  const dpi = project.export.exportDpi
  const pageW = Math.round(mmToPx(project.page.size.widthMm, dpi))
  const pageH = Math.round(mmToPx(project.page.size.heightMm, dpi))

  // pdf-lib uses points (1/72"); convert from mm
  const widthPt = (project.page.size.widthMm / 25.4) * 72
  const heightPt = (project.page.size.heightMm / 25.4) * 72

  const pdf = await PDFDocument.create()
  const total = rows.length

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    onProgress?.({
      current: i + 1,
      total,
      message: `رسم الشهادة ${i + 1} من ${total}`
    })

    const canvas = await renderCertificate(project, {
      dpi,
      row,
      showGuides: false,
      placeholderWhenEmpty: false
    })

    // Ensure size matches export dpi
    if (canvas.width !== pageW || canvas.height !== pageH) {
      // renderCertificate already uses dpi from options
    }

    let imgBytes: Uint8Array
    let embedded
    if (project.export.pageImageFormat === 'png') {
      const dataUrl = canvas.toDataURL('image/png')
      imgBytes = dataUrlToBytes(dataUrl)
      embedded = await pdf.embedPng(imgBytes)
    } else {
      const dataUrl = canvas.toDataURL(
        'image/jpeg',
        project.export.jpegQuality
      )
      imgBytes = dataUrlToBytes(dataUrl)
      embedded = await pdf.embedJpg(imgBytes)
    }

    const page = pdf.addPage([widthPt, heightPt])
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt
    })
  }

  onProgress?.({ current: total, total, message: 'تجميع PDF…' })
  const bytes = await pdf.save()
  const fileName =
    applyFileNameTemplate(
      project.export.fileNameTemplate,
      rows[0],
      project.name || 'certificates'
    ) + '.pdf'

  return { bytes, fileName }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
