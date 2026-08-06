import { useStudioStore } from '../stores/studioStore'
import { BUNDLED_FONTS, type FieldStyle, type TextAlign, type VerticalAlign, type TextDirection, type FitMode } from '@shared/types'
import { pageSizePx, relBoxToPx, roundTo } from '@shared/measure'

export function FieldInspector() {
  const field = useStudioStore((s) => s.getSelectedField())
  const project = useStudioStore((s) => s.project)
  const excel = useStudioStore((s) => s.excel)
  const updateField = useStudioStore((s) => s.updateField)
  const updateFieldStyle = useStudioStore((s) => s.updateFieldStyle)
  const updateFieldBox = useStudioStore((s) => s.updateFieldBox)
  const removeField = useStudioStore((s) => s.removeField)
  const updateQr = useStudioStore((s) => s.updateQr)

  if (!field) {
    return (
      <div className="inspector empty">
        <h3>خصائص الحقل</h3>
        <p>اختر حقلاً على القالب أو أضف حقلاً جديداً من الشريط العلوي.</p>
        <div className="hint-box">
          <strong>وحدات القياس</strong>
          <ul>
            <li>الموضع والحجم: نسبة % من الصفحة أو بالمليمتر</li>
            <li>حجم الخط: نقطة (pt) — المعيار الطباعي</li>
            <li>الحواف والمسافات: مليمتر (مم)</li>
            <li>دقة التصميم: {project.page.dpi} DPI</li>
          </ul>
        </div>
      </div>
    )
  }

  const pagePx = pageSizePx(
    project.page.size.widthMm,
    project.page.size.heightMm,
    project.page.dpi
  )
  const px = relBoxToPx(field.box, pagePx.width, pagePx.height)
  const xMm = (field.box.x * project.page.size.widthMm)
  const yMm = (field.box.y * project.page.size.heightMm)
  const wMm = (field.box.w * project.page.size.widthMm)
  const hMm = (field.box.h * project.page.size.heightMm)

  const setBoxMm = (key: 'x' | 'y' | 'w' | 'h', mm: number) => {
    const next = { ...field.box }
    if (key === 'x') next.x = mm / project.page.size.widthMm
    if (key === 'y') next.y = mm / project.page.size.heightMm
    if (key === 'w') next.w = mm / project.page.size.widthMm
    if (key === 'h') next.h = mm / project.page.size.heightMm
    updateFieldBox(field.id, next)
  }

  const setStyle = <K extends keyof FieldStyle>(key: K, value: FieldStyle[K]) => {
    updateFieldStyle(field.id, { [key]: value } as Partial<FieldStyle>)
  }

  return (
    <div className="inspector">
      <div className="inspector-head">
        <h3>خصائص الحقل</h3>
        <button className="btn danger ghost" onClick={() => removeField(field.id)}>
          حذف
        </button>
      </div>

      <section>
        <label>الاسم</label>
        <input
          value={field.name}
          onChange={(e) => updateField(field.id, { name: e.target.value })}
        />
      </section>

      <section>
        <label>النوع</label>
        <select
          value={field.type}
          onChange={(e) =>
            updateField(field.id, {
              type: e.target.value as typeof field.type
            })
          }
        >
          <option value="text">نص مربوط بعمود</option>
          <option value="static">نص ثابت / قالب</option>
          <option value="qr">رمز QR</option>
        </select>
      </section>

      {field.type !== 'qr' && (
        <>
          <section>
            <label>عمود Excel</label>
            <select
              value={field.binding.column ?? ''}
              onChange={(e) =>
                updateField(field.id, {
                  binding: { ...field.binding, column: e.target.value || undefined }
                })
              }
            >
              <option value="">— بدون —</option>
              {excel.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </section>
          <section>
            <label>قالب النص (يدعم {'{{عمود}}'})</label>
            <input
              dir="auto"
              placeholder="مثلاً: الطالب {{name}}"
              value={field.binding.template ?? ''}
              onChange={(e) =>
                updateField(field.id, {
                  binding: { ...field.binding, template: e.target.value }
                })
              }
            />
          </section>
        </>
      )}

      {field.type === 'qr' && (
        <section>
          <label>قالب رابط التحقق</label>
          <input
            dir="ltr"
            value={project.qr.urlTemplate}
            onChange={(e) => updateQr({ urlTemplate: e.target.value })}
          />
          <p className="field-hint">مثال: https://school.edu/v/{'{{code}}'}</p>
        </section>
      )}

      <h4>الموضع والحجم (مم)</h4>
      <div className="grid-2">
        <section>
          <label>X</label>
          <input
            type="number"
            step={0.1}
            value={roundTo(xMm, 2)}
            onChange={(e) => setBoxMm('x', parseFloat(e.target.value) || 0)}
          />
        </section>
        <section>
          <label>Y</label>
          <input
            type="number"
            step={0.1}
            value={roundTo(yMm, 2)}
            onChange={(e) => setBoxMm('y', parseFloat(e.target.value) || 0)}
          />
        </section>
        <section>
          <label>العرض</label>
          <input
            type="number"
            step={0.1}
            value={roundTo(wMm, 2)}
            onChange={(e) => setBoxMm('w', parseFloat(e.target.value) || 1)}
          />
        </section>
        <section>
          <label>الارتفاع</label>
          <input
            type="number"
            step={0.1}
            value={roundTo(hMm, 2)}
            onChange={(e) => setBoxMm('h', parseFloat(e.target.value) || 1)}
          />
        </section>
      </div>
      <p className="field-hint">
        بكسل @ {project.page.dpi} DPI: {Math.round(px.x)}, {Math.round(px.y)} ·{' '}
        {Math.round(px.w)}×{Math.round(px.h)}
      </p>

      <h4>الطباعة والخط</h4>
      <section>
        <label>الخط</label>
        <select
          value={field.style.fontFamily}
          onChange={(e) => setStyle('fontFamily', e.target.value)}
        >
          {BUNDLED_FONTS.map((f) => (
            <option key={f.id} value={f.family.split(',')[0].replace(/"/g, '')}>
              {f.family.split(',')[0].replace(/"/g, '')}
            </option>
          ))}
        </select>
      </section>
      <div className="grid-2">
        <section>
          <label>الحجم (نقطة)</label>
          <input
            type="number"
            min={6}
            max={200}
            step={0.5}
            value={field.style.fontSizePt}
            onChange={(e) => setStyle('fontSizePt', parseFloat(e.target.value) || 12)}
          />
        </section>
        <section>
          <label>الوزن</label>
          <select
            value={field.style.fontWeight}
            onChange={(e) =>
              setStyle('fontWeight', parseInt(e.target.value, 10) as 400 | 500 | 600 | 700)
            }
          >
            <option value={400}>عادي 400</option>
            <option value={500}>متوسط 500</option>
            <option value={600}>شبه عريض 600</option>
            <option value={700}>عريض 700</option>
          </select>
        </section>
      </div>
      <section>
        <label>اللون</label>
        <div className="color-row">
          <input
            type="color"
            value={field.style.color}
            onChange={(e) => setStyle('color', e.target.value)}
          />
          <input
            value={field.style.color}
            onChange={(e) => setStyle('color', e.target.value)}
          />
        </div>
      </section>

      <div className="grid-2">
        <section>
          <label>محاذاة أفقية</label>
          <select
            value={field.style.align}
            onChange={(e) => setStyle('align', e.target.value as TextAlign)}
          >
            <option value="right">يمين</option>
            <option value="center">وسط</option>
            <option value="left">يسار</option>
          </select>
        </section>
        <section>
          <label>محاذاة رأسية</label>
          <select
            value={field.style.vAlign}
            onChange={(e) => setStyle('vAlign', e.target.value as VerticalAlign)}
          >
            <option value="top">أعلى</option>
            <option value="middle">وسط</option>
            <option value="bottom">أسفل</option>
          </select>
        </section>
        <section>
          <label>الاتجاه</label>
          <select
            value={field.style.direction}
            onChange={(e) => setStyle('direction', e.target.value as TextDirection)}
          >
            <option value="auto">تلقائي</option>
            <option value="rtl">عربي RTL</option>
            <option value="ltr">لاتيني LTR</option>
          </select>
        </section>
        <section>
          <label>ملائمة النص</label>
          <select
            value={field.style.fit}
            onChange={(e) => setStyle('fit', e.target.value as FitMode)}
          >
            <option value="shrink">تصغير تلقائي</option>
            <option value="wrap">التفاف</option>
            <option value="none">بدون</option>
          </select>
        </section>
      </div>

      <div className="grid-2">
        <section>
          <label>ارتفاع السطر</label>
          <input
            type="number"
            step={0.05}
            min={0.8}
            max={3}
            value={field.style.lineHeight}
            onChange={(e) => setStyle('lineHeight', parseFloat(e.target.value) || 1.2)}
          />
        </section>
        <section>
          <label>أقصى أسطر</label>
          <input
            type="number"
            min={1}
            max={20}
            value={field.style.maxLines}
            onChange={(e) => setStyle('maxLines', parseInt(e.target.value, 10) || 1)}
          />
        </section>
        <section>
          <label>تباعد الحروف (em)</label>
          <input
            type="number"
            step={0.01}
            value={field.style.letterSpacingEm}
            onChange={(e) =>
              setStyle('letterSpacingEm', parseFloat(e.target.value) || 0)
            }
          />
        </section>
        <section>
          <label>دوران (°)</label>
          <input
            type="number"
            step={1}
            value={field.rotationDeg ?? 0}
            onChange={(e) =>
              updateField(field.id, { rotationDeg: parseFloat(e.target.value) || 0 })
            }
          />
        </section>
      </div>

      <h4>الحشو الداخلي (مم)</h4>
      <div className="grid-2">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <section key={side}>
            <label>
              {side === 'top' ? 'أعلى' : side === 'right' ? 'يمين' : side === 'bottom' ? 'أسفل' : 'يسار'}
            </label>
            <input
              type="number"
              step={0.1}
              value={field.style.paddingMm[side]}
              onChange={(e) =>
                setStyle('paddingMm', {
                  ...field.style.paddingMm,
                  [side]: parseFloat(e.target.value) || 0
                })
              }
            />
          </section>
        ))}
      </div>

      <h4>خلفية المربع</h4>
      <section>
        <label className="check">
          <input
            type="checkbox"
            checked={!!field.style.background}
            onChange={(e) =>
              setStyle(
                'background',
                e.target.checked
                  ? { color: '#ffffff', opacity: 0.85, radiusMm: 2 }
                  : null
              )
            }
          />
          تفعيل خلفية
        </label>
      </section>
      {field.style.background && (
        <div className="grid-2">
          <section>
            <label>اللون</label>
            <input
              type="color"
              value={field.style.background.color}
              onChange={(e) =>
                setStyle('background', {
                  ...field.style.background!,
                  color: e.target.value
                })
              }
            />
          </section>
          <section>
            <label>الشفافية</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={field.style.background.opacity}
              onChange={(e) =>
                setStyle('background', {
                  ...field.style.background!,
                  opacity: parseFloat(e.target.value) || 0
                })
              }
            />
          </section>
          <section>
            <label>زوايا (مم)</label>
            <input
              type="number"
              step={0.1}
              value={field.style.background.radiusMm}
              onChange={(e) =>
                setStyle('background', {
                  ...field.style.background!,
                  radiusMm: parseFloat(e.target.value) || 0
                })
              }
            />
          </section>
        </div>
      )}

      <h4>الإطار</h4>
      <section>
        <label className="check">
          <input
            type="checkbox"
            checked={!!field.style.border}
            onChange={(e) =>
              setStyle(
                'border',
                e.target.checked
                  ? { color: '#1a1a1a', widthMm: 0.3, style: 'solid', radiusMm: 1 }
                  : null
              )
            }
          />
          تفعيل إطار
        </label>
      </section>
      {field.style.border && (
        <div className="grid-2">
          <section>
            <label>اللون</label>
            <input
              type="color"
              value={field.style.border.color}
              onChange={(e) =>
                setStyle('border', {
                  ...field.style.border!,
                  color: e.target.value
                })
              }
            />
          </section>
          <section>
            <label>السُمك (مم)</label>
            <input
              type="number"
              step={0.05}
              value={field.style.border.widthMm}
              onChange={(e) =>
                setStyle('border', {
                  ...field.style.border!,
                  widthMm: parseFloat(e.target.value) || 0
                })
              }
            />
          </section>
          <section>
            <label>النمط</label>
            <select
              value={field.style.border.style}
              onChange={(e) =>
                setStyle('border', {
                  ...field.style.border!,
                  style: e.target.value as 'solid' | 'dashed'
                })
              }
            >
              <option value="solid">صلب</option>
              <option value="dashed">متقطع</option>
            </select>
          </section>
          <section>
            <label>زوايا (مم)</label>
            <input
              type="number"
              step={0.1}
              value={field.style.border.radiusMm}
              onChange={(e) =>
                setStyle('border', {
                  ...field.style.border!,
                  radiusMm: parseFloat(e.target.value) || 0
                })
              }
            />
          </section>
        </div>
      )}

      <section className="row-checks">
        <label className="check">
          <input
            type="checkbox"
            checked={!!field.locked}
            onChange={(e) => updateField(field.id, { locked: e.target.checked })}
          />
          قفل الموضع
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={field.visible !== false}
            onChange={(e) => updateField(field.id, { visible: e.target.checked })}
          />
          ظاهر
        </label>
      </section>
    </div>
  )
}
