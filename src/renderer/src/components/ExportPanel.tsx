import { useState } from 'react'
import { useStudioStore } from '../stores/studioStore'
import { buildCertificatesPdf, bytesToBase64 } from '../core/exportPdf'
import { pageSizePx, mmToPx } from '@shared/measure'

export function ExportPanel() {
  const project = useStudioStore((s) => s.project)
  const excel = useStudioStore((s) => s.excel)
  const updateExport = useStudioStore((s) => s.updateExport)
  const updateQr = useStudioStore((s) => s.updateQr)
  const exportProgress = useStudioStore((s) => s.exportProgress)
  const setExportProgress = useStudioStore((s) => s.setExportProgress)
  const [error, setError] = useState<string | null>(null)
  const [donePath, setDonePath] = useState<string | null>(null)

  const exportPx = pageSizePx(
    project.page.size.widthMm,
    project.page.size.heightMm,
    project.export.exportDpi
  )

  const runExport = async () => {
    setError(null)
    setDonePath(null)
    if (excel.rows.length === 0) {
      setError('استورد ملف Excel أولاً')
      return
    }
    try {
      setExportProgress({ current: 0, total: excel.rows.length, message: 'بدء…' })
      const { bytes, fileName } = await buildCertificatesPdf(
        project,
        excel.rows,
        (p) => setExportProgress(p)
      )

      if (!window.certificateAPI) {
        // browser download fallback
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        setDonePath(fileName)
        setExportProgress(null)
        return
      }

      const path = await window.certificateAPI.pickSavePdf(fileName)
      if (!path) {
        setExportProgress(null)
        return
      }
      await window.certificateAPI.savePdf(path, bytesToBase64(bytes))
      setDonePath(path)
      setExportProgress(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setExportProgress(null)
    }
  }

  return (
    <div className="export-panel">
      <h2>تصدير PDF</h2>
      <p className="muted">
        ملف PDF واحد — صفحة لكل طالب. الرسم يتم بدقة التصدير مع الخطوط والأشكال كما
        في المعاينة.
      </p>

      <div className="stat-grid">
        <div className="stat">
          <span>عدد الشهادات</span>
          <strong>{excel.rows.length}</strong>
        </div>
        <div className="stat">
          <span>مقاس الصفحة</span>
          <strong>
            {project.page.size.widthMm}×{project.page.size.heightMm} مم
          </strong>
        </div>
        <div className="stat">
          <span>دقة التصدير</span>
          <strong>{project.export.exportDpi} DPI</strong>
        </div>
        <div className="stat">
          <span>أبعاد الرسم</span>
          <strong>
            {exportPx.width}×{exportPx.height} بكسل
          </strong>
        </div>
      </div>

      <div className="export-form">
        <section>
          <label>اسم الملف (يدعم {'{{عمود}}'})</label>
          <input
            value={project.export.fileNameTemplate}
            onChange={(e) => updateExport({ fileNameTemplate: e.target.value })}
          />
        </section>
        <div className="grid-2">
          <section>
            <label>DPI التصدير</label>
            <select
              value={project.export.exportDpi}
              onChange={(e) =>
                updateExport({ exportDpi: parseInt(e.target.value, 10) })
              }
            >
              <option value={150}>150 — مسودة</option>
              <option value={200}>200 — جيد</option>
              <option value={300}>300 — طباعة</option>
              <option value={400}>400 — عالي</option>
            </select>
          </section>
          <section>
            <label>صيغة الصفحة</label>
            <select
              value={project.export.pageImageFormat}
              onChange={(e) =>
                updateExport({
                  pageImageFormat: e.target.value as 'png' | 'jpeg'
                })
              }
            >
              <option value="jpeg">JPEG (أصغر)</option>
              <option value="png">PNG (بدون فقد)</option>
            </select>
          </section>
          <section>
            <label>جودة JPEG</label>
            <input
              type="number"
              min={0.5}
              max={1}
              step={0.01}
              value={project.export.jpegQuality}
              onChange={(e) =>
                updateExport({ jpegQuality: parseFloat(e.target.value) || 0.9 })
              }
            />
          </section>
        </div>

        <h3>إعدادات QR</h3>
        <section>
          <label>قالب رابط التحقق</label>
          <input
            dir="ltr"
            value={project.qr.urlTemplate}
            onChange={(e) => updateQr({ urlTemplate: e.target.value })}
          />
        </section>
        <div className="grid-2">
          <section>
            <label>تصحيح الأخطاء</label>
            <select
              value={project.qr.errorCorrection}
              onChange={(e) =>
                updateQr({
                  errorCorrection: e.target.value as typeof project.qr.errorCorrection
                })
              }
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </select>
          </section>
          <section>
            <label>هامش QR (modules)</label>
            <input
              type="number"
              min={0}
              max={8}
              value={project.qr.margin}
              onChange={(e) => updateQr({ margin: parseInt(e.target.value, 10) || 0 })}
            />
          </section>
        </div>
      </div>

      {exportProgress && (
        <div className="progress">
          <div
            className="bar"
            style={{
              width: `${(exportProgress.current / Math.max(1, exportProgress.total)) * 100}%`
            }}
          />
          <span>
            {exportProgress.message} ({exportProgress.current}/
            {exportProgress.total})
          </span>
        </div>
      )}

      {error && <div className="banner error">{error}</div>}
      {donePath && (
        <div className="banner ok">تم الحفظ: {donePath}</div>
      )}

      <button
        className="btn primary large"
        disabled={!!exportProgress}
        onClick={runExport}
      >
        توليد PDF ({excel.rows.length} شهادة)
      </button>

      <p className="field-hint">
        الهامش الآمن: {project.page.marginMm} مم · Bleed: {project.page.bleedMm} مم
        · 1 مم ≈ {mmToPx(1, project.export.exportDpi).toFixed(1)} بكسل عند التصدير
      </p>
    </div>
  )
}
