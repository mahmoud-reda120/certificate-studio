import { useStudioStore } from '../stores/studioStore'

export function DataPanel() {
  const excel = useStudioStore((s) => s.excel)
  const setExcel = useStudioStore((s) => s.setExcel)
  const project = useStudioStore((s) => s.project)
  const previewRowIndex = useStudioStore((s) => s.previewRowIndex)
  const setPreviewRowIndex = useStudioStore((s) => s.setPreviewRowIndex)

  const loadExcel = async () => {
    if (!window.certificateAPI) {
      alert('استيراد Excel متاح داخل تطبيق Electron')
      return
    }
    const path = await window.certificateAPI.pickExcel()
    if (!path) return
    const result = await window.certificateAPI.parseExcel(path)
    setExcel({
      fileName: path.split(/[/\\]/).pop() ?? 'data.xlsx',
      columns: result.columns,
      rows: result.rows
    })
  }

  const missingColumns = project.fields
    .map((f) => f.binding.column)
    .filter((c): c is string => !!c)
    .filter((c) => excel.columns.length > 0 && !excel.columns.includes(c))

  return (
    <div className="data-panel">
      <div className="data-toolbar">
        <div>
          <h2>بيانات Excel</h2>
          <p>
            {excel.fileName
              ? `${excel.fileName} — ${excel.rows.length} صف · ${excel.columns.length} عمود`
              : 'لم يتم استيراد ملف بعد'}
          </p>
        </div>
        <button className="btn primary" onClick={loadExcel}>
          استيراد .xlsx
        </button>
      </div>

      {missingColumns.length > 0 && (
        <div className="banner warn">
          أعمدة مربوطة غير موجودة في Excel: {missingColumns.join('، ')}
        </div>
      )}

      {excel.columns.length === 0 ? (
        <div className="empty-state">
          <p>ارفع ملف Excel يحتوي صف عناوين ثم صفوف الطلبة.</p>
          <p className="muted">
            كل عمود يمكن ربطه بمربع نص على الشهادة. استخدم {'{{اسم_العمود}}'} في
            القوالب.
          </p>
        </div>
      ) : (
        <>
          <div className="preview-nav">
            <span>معاينة الصف:</span>
            <button
              className="btn ghost"
              disabled={previewRowIndex <= 0}
              onClick={() => setPreviewRowIndex(previewRowIndex - 1)}
            >
              السابق
            </button>
            <span>
              {excel.rows.length === 0 ? 0 : previewRowIndex + 1} /{' '}
              {excel.rows.length}
            </span>
            <button
              className="btn ghost"
              disabled={previewRowIndex >= excel.rows.length - 1}
              onClick={() => setPreviewRowIndex(previewRowIndex + 1)}
            >
              التالي
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  {excel.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excel.rows.slice(0, 200).map((row, i) => (
                  <tr
                    key={i}
                    className={i === previewRowIndex ? 'active' : ''}
                    onClick={() => setPreviewRowIndex(i)}
                  >
                    <td>{i + 1}</td>
                    {excel.columns.map((c) => (
                      <td key={c}>{row[c]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {excel.rows.length > 200 && (
              <p className="muted">عرض أول 200 صف للمعاينة — التصدير يشمل الكل.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
