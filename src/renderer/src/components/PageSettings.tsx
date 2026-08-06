import { PAGE_PRESETS } from '@shared/types'
import { useStudioStore } from '../stores/studioStore'
import { FieldInspector } from './FieldInspector'

export function PageSettings() {
  const project = useStudioStore((s) => s.project)
  const setPageSize = useStudioStore((s) => s.setPageSize)
  const setPageDpi = useStudioStore((s) => s.setPageDpi)
  const setMarginMm = useStudioStore((s) => s.setMarginMm)
  const setBleedMm = useStudioStore((s) => s.setBleedMm)
  const setProjectName = useStudioStore((s) => s.setProjectName)
  const setTemplateImage = useStudioStore((s) => s.setTemplateImage)
  const showGuides = useStudioStore((s) => s.showGuides)
  const setShowGuides = useStudioStore((s) => s.setShowGuides)
  const snapPx = useStudioStore((s) => s.snapPx)
  const setSnapPx = useStudioStore((s) => s.setSnapPx)

  const loadImage = async () => {
    if (!window.certificateAPI) {
      // browser fallback
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setTemplateImage(String(reader.result), file.name)
        reader.readAsDataURL(file)
      }
      input.click()
      return
    }
    const path = await window.certificateAPI.pickImage()
    if (!path) return
    const dataUrl = await window.certificateAPI.readFileDataUrl(path)
    setTemplateImage(dataUrl, path)
  }

  return (
    <div className="side-panel">
      <div className="panel-block">
        <h3>المشروع والصفحة</h3>
        <section>
          <label>اسم المشروع</label>
          <input
            value={project.name}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </section>
        <section>
          <label>مقاس الصفحة</label>
          <select
            value={project.page.size.name}
            onChange={(e) => {
              const preset = PAGE_PRESETS.find((p) => p.name === e.target.value)
              if (preset) setPageSize({ ...preset })
            }}
          >
            {PAGE_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.widthMm}×{p.heightMm} مم)
              </option>
            ))}
          </select>
        </section>
        <div className="grid-2">
          <section>
            <label>DPI تصميم</label>
            <input
              type="number"
              min={72}
              max={300}
              value={project.page.dpi}
              onChange={(e) => setPageDpi(parseInt(e.target.value, 10) || 150)}
            />
          </section>
          <section>
            <label>هامش آمن (مم)</label>
            <input
              type="number"
              step={0.5}
              value={project.page.marginMm}
              onChange={(e) => setMarginMm(parseFloat(e.target.value) || 0)}
            />
          </section>
          <section>
            <label>Bleed (مم)</label>
            <input
              type="number"
              step={0.5}
              value={project.page.bleedMm}
              onChange={(e) => setBleedMm(parseFloat(e.target.value) || 0)}
            />
          </section>
          <section>
            <label>محاذاة شبكة (بكسل)</label>
            <input
              type="number"
              min={0}
              max={32}
              value={snapPx}
              onChange={(e) => setSnapPx(parseInt(e.target.value, 10) || 0)}
            />
          </section>
        </div>
        <section className="row-checks">
          <label className="check">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
            />
            إظهار الأدلة والحقول
          </label>
        </section>
        <button className="btn secondary block" onClick={loadImage}>
          {project.template.imageDataUrl ? 'تغيير صورة القالب' : 'رفع صورة القالب'}
        </button>
      </div>
      <FieldInspector />
    </div>
  )
}
