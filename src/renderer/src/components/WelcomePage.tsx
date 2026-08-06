import { useStudioStore } from '../stores/studioStore'
import { createDefaultProject, type CertificateProject } from '@shared/types'
import { ThemeToggle } from './ThemeToggle'

export function WelcomePage() {
  const newProject = useStudioStore((s) => s.newProject)
  const loadProject = useStudioStore((s) => s.loadProject)
  const setTab = useStudioStore((s) => s.setTab)

  const open = async () => {
    if (!window.certificateAPI) {
      alert('فتح المشاريع متاح في تطبيق Electron')
      return
    }
    const path = await window.certificateAPI.pickOpenProject()
    if (!path) return
    const raw = await window.certificateAPI.openProject(path)
    const project = JSON.parse(raw) as CertificateProject
    loadProject(project, path)
  }

  return (
    <div className="welcome">
      <div className="welcome-top">
        <ThemeToggle />
      </div>
      <div className="welcome-hero">
        <p className="eyebrow">Certificate Studio</p>
        <h1>شهادات احترافية بالجملة من Excel</h1>
        <p className="lead">
          اربط كل عمود بمربع مضبوط بالملليمتر والنقطة والـ DPI — معاينة دقيقة ثم PDF
          واحد لكل الطلبة.
        </p>
        <div className="welcome-actions">
          <button className="btn primary large" onClick={() => newProject()}>
            مشروع جديد
          </button>
          <button className="btn secondary large" onClick={open}>
            فتح مشروع
          </button>
          <button
            className="btn ghost large"
            onClick={() => {
              loadProject(createDefaultProject('تجريبي'), null)
              setTab('editor')
            }}
          >
            تجربة سريعة
          </button>
        </div>
      </div>
      <div className="welcome-features">
        <article>
          <h3>مقاسات طباعية</h3>
          <p>مم · نقطة · DPI · Bleed · هامش آمن</p>
        </article>
        <article>
          <h3>محرر بصري</h3>
          <p>سحب وإفلات + إحداثيات رقمية دقيقة</p>
        </article>
        <article>
          <h3>خطوط عربية</h3>
          <p>Cairo · Amiri · Noto Naskh · Tajawal</p>
        </article>
        <article>
          <h3>QR تحقق</h3>
          <p>رابط قالب مع أعمدة Excel</p>
        </article>
      </div>
    </div>
  )
}
