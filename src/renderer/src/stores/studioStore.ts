import { create } from 'zustand'
import {
  createDefaultProject,
  createDefaultTextField,
  type CertificateProject,
  type ExcelData,
  type ProjectField,
  type FieldStyle,
  type PageSize
} from '@shared/types'
import { clampRelBox } from '@shared/measure'

type TabId = 'welcome' | 'editor' | 'data' | 'export'
export type ThemeMode = 'dark' | 'light'

const THEME_KEY = 'cs-theme'

function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function applyThemeToDom(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}

interface StudioState {
  project: CertificateProject
  projectPath: string | null
  dirty: boolean
  excel: ExcelData
  selectedFieldId: string | null
  previewRowIndex: number
  tab: TabId
  snapPx: number
  showGuides: boolean
  theme: ThemeMode
  exportProgress: { current: number; total: number; message: string } | null
  setTab: (tab: TabId) => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  newProject: (name?: string) => void
  loadProject: (project: CertificateProject, path?: string | null) => void
  setProjectName: (name: string) => void
  setPageSize: (size: PageSize) => void
  setPageDpi: (dpi: number) => void
  setMarginMm: (mm: number) => void
  setBleedMm: (mm: number) => void
  setTemplateImage: (dataUrl: string, path?: string | null) => void
  setExcel: (data: ExcelData) => void
  selectField: (id: string | null) => void
  addField: (type: ProjectField['type']) => void
  updateField: (id: string, patch: Partial<ProjectField>) => void
  updateFieldStyle: (id: string, patch: Partial<FieldStyle>) => void
  updateFieldBox: (id: string, box: ProjectField['box']) => void
  removeField: (id: string) => void
  setPreviewRowIndex: (i: number) => void
  setSnapPx: (n: number) => void
  setShowGuides: (v: boolean) => void
  updateQr: (patch: Partial<CertificateProject['qr']>) => void
  updateExport: (patch: Partial<CertificateProject['export']>) => void
  markSaved: (path: string) => void
  setExportProgress: (
    p: { current: number; total: number; message: string } | null
  ) => void
  getSelectedField: () => ProjectField | null
  getPreviewRow: () => Record<string, string>
}

const emptyExcel: ExcelData = {
  fileName: null,
  columns: [],
  rows: []
}

const initialTheme = readStoredTheme()
applyThemeToDom(initialTheme)

export const useStudioStore = create<StudioState>((set, get) => ({
  project: createDefaultProject(),
  projectPath: null,
  dirty: false,
  excel: emptyExcel,
  selectedFieldId: null,
  previewRowIndex: 0,
  tab: 'welcome',
  snapPx: 4,
  showGuides: true,
  theme: initialTheme,
  exportProgress: null,

  setTab: (tab) => set({ tab }),

  setTheme: (theme) => {
    applyThemeToDom(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
    set({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  newProject: (name) =>
    set({
      project: createDefaultProject(name),
      projectPath: null,
      dirty: false,
      excel: emptyExcel,
      selectedFieldId: null,
      previewRowIndex: 0,
      tab: 'editor'
    }),

  loadProject: (project, path = null) =>
    set({
      project,
      projectPath: path,
      dirty: false,
      selectedFieldId: null,
      previewRowIndex: 0,
      tab: 'editor'
    }),

  setProjectName: (name) =>
    set((s) => ({
      project: { ...s.project, name, updatedAt: new Date().toISOString() },
      dirty: true
    })),

  setPageSize: (size) =>
    set((s) => ({
      project: {
        ...s.project,
        page: { ...s.project.page, size },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  setPageDpi: (dpi) =>
    set((s) => ({
      project: {
        ...s.project,
        page: { ...s.project.page, dpi },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  setMarginMm: (marginMm) =>
    set((s) => ({
      project: {
        ...s.project,
        page: { ...s.project.page, marginMm },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  setBleedMm: (bleedMm) =>
    set((s) => ({
      project: {
        ...s.project,
        page: { ...s.project.page, bleedMm },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  setTemplateImage: (dataUrl, path = null) =>
    set((s) => ({
      project: {
        ...s.project,
        template: {
          imageDataUrl: dataUrl,
          imagePath: path,
          naturalWidth: undefined,
          naturalHeight: undefined
        },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  setExcel: (data) =>
    set({
      excel: data,
      previewRowIndex: 0
    }),

  selectField: (id) => set({ selectedFieldId: id }),

  addField: (type) =>
    set((s) => {
      const id = crypto.randomUUID()
      const zIndex =
        s.project.fields.reduce((m, f) => Math.max(m, f.zIndex), 0) + 1
      const field = createDefaultTextField({
        id,
        type,
        name:
          type === 'qr'
            ? 'رمز QR'
            : type === 'static'
              ? 'نص ثابت'
              : 'حقل نص',
        zIndex,
        box:
          type === 'qr'
            ? { x: 0.82, y: 0.72, w: 0.14, h: 0.2 }
            : { x: 0.2, y: 0.42, w: 0.6, h: 0.1 },
        binding:
          type === 'static'
            ? { template: 'شهادة تقدير' }
            : type === 'qr'
              ? { template: '' }
              : { column: s.excel.columns[0], template: '' },
        style: {
          ...createDefaultTextField({ id }).style,
          fontSizePt: type === 'qr' ? 12 : 28
        }
      })
      return {
        project: {
          ...s.project,
          fields: [...s.project.fields, field],
          updatedAt: new Date().toISOString()
        },
        selectedFieldId: id,
        dirty: true
      }
    }),

  updateField: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        fields: s.project.fields.map((f) =>
          f.id === id ? { ...f, ...patch } : f
        ),
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  updateFieldStyle: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        fields: s.project.fields.map((f) =>
          f.id === id ? { ...f, style: { ...f.style, ...patch } } : f
        ),
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  updateFieldBox: (id, box) =>
    set((s) => ({
      project: {
        ...s.project,
        fields: s.project.fields.map((f) =>
          f.id === id ? { ...f, box: clampRelBox(box) } : f
        ),
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  removeField: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        fields: s.project.fields.filter((f) => f.id !== id),
        updatedAt: new Date().toISOString()
      },
      selectedFieldId: s.selectedFieldId === id ? null : s.selectedFieldId,
      dirty: true
    })),

  setPreviewRowIndex: (i) => set({ previewRowIndex: Math.max(0, i) }),
  setSnapPx: (n) => set({ snapPx: n }),
  setShowGuides: (v) => set({ showGuides: v }),

  updateQr: (patch) =>
    set((s) => ({
      project: {
        ...s.project,
        qr: { ...s.project.qr, ...patch },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  updateExport: (patch) =>
    set((s) => ({
      project: {
        ...s.project,
        export: { ...s.project.export, ...patch },
        updatedAt: new Date().toISOString()
      },
      dirty: true
    })),

  markSaved: (path) =>
    set((s) => ({
      projectPath: path,
      dirty: false,
      project: { ...s.project, updatedAt: new Date().toISOString() }
    })),

  setExportProgress: (p) => set({ exportProgress: p }),

  getSelectedField: () => {
    const s = get()
    return s.project.fields.find((f) => f.id === s.selectedFieldId) ?? null
  },

  getPreviewRow: () => {
    const s = get()
    if (s.excel.rows.length === 0) {
      // demo row from columns / field names
      const demo: Record<string, string> = {
        name: 'أحمد محمد',
        code: 'STU-1001',
        class: 'الثالث أ',
        grade: 'ممتاز'
      }
      for (const col of s.excel.columns) {
        if (!(col in demo)) demo[col] = col
      }
      return demo
    }
    const i = Math.min(s.previewRowIndex, s.excel.rows.length - 1)
    return s.excel.rows[i] ?? {}
  }
}))
