import { useStudioStore } from './stores/studioStore'
import type { CertificateProject } from '@shared/types'
import { WelcomePage } from './components/WelcomePage'
import { CanvasEditor } from './components/CanvasEditor'
import { PageSettings } from './components/PageSettings'
import { DataPanel } from './components/DataPanel'
import { ExportPanel } from './components/ExportPanel'

export function App() {
  const tab = useStudioStore((s) => s.tab)
  const setTab = useStudioStore((s) => s.setTab)
  const project = useStudioStore((s) => s.project)
  const dirty = useStudioStore((s) => s.dirty)
  const projectPath = useStudioStore((s) => s.projectPath)
  const markSaved = useStudioStore((s) => s.markSaved)
  const addField = useStudioStore((s) => s.addField)
  const previewRowIndex = useStudioStore((s) => s.previewRowIndex)
  const setPreviewRowIndex = useStudioStore((s) => s.setPreviewRowIndex)
  const excel = useStudioStore((s) => s.excel)
  const newProject = useStudioStore((s) => s.newProject)
  const loadProject = useStudioStore((s) => s.loadProject)

  const save = async () => {
    if (!window.certificateAPI) {
      // download JSON
      const blob = new Blob([JSON.stringify(project, null, 2)], {
        type: 'application/json'
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${project.name || 'project'}.certproj`
      a.click()
      return
    }
    let path = projectPath
    if (!path) {
      path = await window.certificateAPI.pickSaveProject(
        `${project.name || 'project'}.certproj`
      )
    }
    if (!path) return
    await window.certificateAPI.saveProject(path, JSON.stringify(project, null, 2))
    markSaved(path)
  }

  const open = async () => {
    if (!window.certificateAPI) return
    const path = await window.certificateAPI.pickOpenProject()
    if (!path) return
    const raw = await window.certificateAPI.openProject(path)
    loadProject(JSON.parse(raw) as CertificateProject, path)
  }

  if (tab === 'welcome') {
    return (
      <div className="app">
        <WelcomePage />
      </div>
    )
  }

  return (
    <div className="app shell">
      <header className="topbar">
        <div className="brand" onClick={() => setTab('welcome')}>
          <span className="logo">CS</span>
          <div>
            <strong>Certificate Studio</strong>
            <small>
              {project.name}
              {dirty ? ' •' : ''}
            </small>
          </div>
        </div>

        <nav className="tabs">
          {(
            [
              ['editor', 'المحرر'],
              ['data', 'البيانات'],
              ['export', 'التصدير']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          {tab === 'editor' && (
            <>
              <button className="btn ghost" onClick={() => addField('text')}>
                + حقل نص
              </button>
              <button className="btn ghost" onClick={() => addField('static')}>
                + نص ثابت
              </button>
              <button className="btn ghost" onClick={() => addField('qr')}>
                + QR
              </button>
              <div className="sep" />
              <button
                className="btn ghost"
                disabled={previewRowIndex <= 0 || excel.rows.length === 0}
                onClick={() => setPreviewRowIndex(previewRowIndex - 1)}
              >
                ←
              </button>
              <span className="row-ind">
                {excel.rows.length
                  ? `${previewRowIndex + 1}/${excel.rows.length}`
                  : 'تجريبي'}
              </span>
              <button
                className="btn ghost"
                disabled={
                  excel.rows.length === 0 ||
                  previewRowIndex >= excel.rows.length - 1
                }
                onClick={() => setPreviewRowIndex(previewRowIndex + 1)}
              >
                →
              </button>
            </>
          )}
          <button className="btn ghost" onClick={() => newProject()}>
            جديد
          </button>
          <button className="btn ghost" onClick={open}>
            فتح
          </button>
          <button className="btn secondary" onClick={save}>
            حفظ
          </button>
        </div>
      </header>

      <main className="main">
        {tab === 'editor' && (
          <div className="editor-layout">
            <PageSettings />
            <CanvasEditor />
          </div>
        )}
        {tab === 'data' && <DataPanel />}
        {tab === 'export' && <ExportPanel />}
      </main>
    </div>
  )
}
