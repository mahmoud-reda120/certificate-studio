import { useEffect, useRef, useState, useCallback } from 'react'
import { useStudioStore } from '../stores/studioStore'
import { renderCertificate } from '../core/renderCertificate'
import { pageSizePx, snapRelBox, mmToPx } from '@shared/measure'

type DragMode =
  | null
  | { kind: 'move'; id: string; startX: number; startY: number; origin: { x: number; y: number; w: number; h: number } }
  | {
      kind: 'resize'
      id: string
      corner: 'nw' | 'ne' | 'sw' | 'se'
      startX: number
      startY: number
      origin: { x: number; y: number; w: number; h: number }
    }

export function CanvasEditor() {
  const project = useStudioStore((s) => s.project)
  const selectedFieldId = useStudioStore((s) => s.selectedFieldId)
  const selectField = useStudioStore((s) => s.selectField)
  const updateFieldBox = useStudioStore((s) => s.updateFieldBox)
  const showGuides = useStudioStore((s) => s.showGuides)
  const snapPx = useStudioStore((s) => s.snapPx)
  const getPreviewRow = useStudioStore((s) => s.getPreviewRow)
  const previewRowIndex = useStudioStore((s) => s.previewRowIndex)
  const excel = useStudioStore((s) => s.excel)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState({ width: 600, height: 400, scale: 1 })
  const dragRef = useRef<DragMode>(null)
  const [dragTick, setDragTick] = useState(0)

  const pagePx = pageSizePx(
    project.page.size.widthMm,
    project.page.size.heightMm,
    project.page.dpi
  )

  const reflow = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const availW = el.clientWidth
    const availH = el.clientHeight
    const pad = 40
    const scale = Math.min(
      (availW - pad) / pagePx.width,
      (availH - pad) / pagePx.height
    )
    setDisplay({
      width: pagePx.width * scale,
      height: pagePx.height * scale,
      scale
    })
  }, [pagePx.width, pagePx.height])

  useEffect(() => {
    reflow()
    const ro = new ResizeObserver(reflow)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [reflow])

  // Render preview
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const row = getPreviewRow()
      const rendered = await renderCertificate(project, {
        dpi: project.page.dpi,
        row,
        showGuides: false,
        placeholderWhenEmpty: true
      })
      if (cancelled || !canvasRef.current) return
      const dst = canvasRef.current
      dst.width = rendered.width
      dst.height = rendered.height
      const ctx = dst.getContext('2d')
      ctx?.drawImage(rendered, 0, 0)
    })()
    return () => {
      cancelled = true
    }
  }, [project, previewRowIndex, excel, getPreviewRow, dragTick])

  const clientToRel = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current
    if (!overlay) return { x: 0, y: 0 }
    const rect = overlay.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    }
  }

  const hitTest = (relX: number, relY: number): string | null => {
    const fields = [...project.fields]
      .filter((f) => f.visible !== false)
      .sort((a, b) => b.zIndex - a.zIndex)
    for (const f of fields) {
      if (
        relX >= f.box.x &&
        relX <= f.box.x + f.box.w &&
        relY >= f.box.y &&
        relY <= f.box.y + f.box.h
      ) {
        return f.id
      }
    }
    return null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    const corner = target.dataset.corner as 'nw' | 'ne' | 'sw' | 'se' | undefined
    const fieldId = target.dataset.fieldId

    if (corner && fieldId) {
      const field = project.fields.find((f) => f.id === fieldId)
      if (!field || field.locked) return
      dragRef.current = {
        kind: 'resize',
        id: fieldId,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        origin: { ...field.box }
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      e.stopPropagation()
      return
    }

    const { x, y } = clientToRel(e.clientX, e.clientY)
    const id = hitTest(x, y)
    selectField(id)
    if (!id) return
    const field = project.fields.find((f) => f.id === id)
    if (!field || field.locked) return
    dragRef.current = {
      kind: 'move',
      id,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...field.box }
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const overlay = overlayRef.current
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()
    const dx = (e.clientX - drag.startX) / rect.width
    const dy = (e.clientY - drag.startY) / rect.height

    let next = { ...drag.origin }
    if (drag.kind === 'move') {
      next.x = drag.origin.x + dx
      next.y = drag.origin.y + dy
    } else {
      const min = 0.02
      switch (drag.corner) {
        case 'se':
          next.w = Math.max(min, drag.origin.w + dx)
          next.h = Math.max(min, drag.origin.h + dy)
          break
        case 'sw':
          next.x = drag.origin.x + dx
          next.w = Math.max(min, drag.origin.w - dx)
          next.h = Math.max(min, drag.origin.h + dy)
          break
        case 'ne':
          next.w = Math.max(min, drag.origin.w + dx)
          next.y = drag.origin.y + dy
          next.h = Math.max(min, drag.origin.h - dy)
          break
        case 'nw':
          next.x = drag.origin.x + dx
          next.y = drag.origin.y + dy
          next.w = Math.max(min, drag.origin.w - dx)
          next.h = Math.max(min, drag.origin.h - dy)
          break
      }
    }

    if (snapPx > 0) {
      next = snapRelBox(next, pagePx.width, pagePx.height, snapPx)
    }

    updateFieldBox(drag.id, next)
  }

  const onPointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null
      setDragTick((t) => t + 1)
    }
  }

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <div
        className="canvas-stage"
        style={{ width: display.width, height: display.height }}
      >
        <canvas
          ref={canvasRef}
          className="canvas-page"
          style={{ width: display.width, height: display.height }}
        />
        <div
          ref={overlayRef}
          className="canvas-overlay"
          style={{ width: display.width, height: display.height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {showGuides && (
            <div
              className="margin-guide"
              style={{
                inset: `${(mmToPx(project.page.marginMm, project.page.dpi) / pagePx.width) * 100}%`
              }}
            />
          )}
          {project.fields
            .filter((f) => f.visible !== false)
            .map((f) => {
              const selected = f.id === selectedFieldId
              return (
                <div
                  key={f.id}
                  className={`field-box ${selected ? 'selected' : ''} ${f.locked ? 'locked' : ''}`}
                  data-field-id={f.id}
                  style={{
                    left: `${f.box.x * 100}%`,
                    top: `${f.box.y * 100}%`,
                    width: `${f.box.w * 100}%`,
                    height: `${f.box.h * 100}%`
                  }}
                >
                  <span className="field-label">{f.name}</span>
                  {selected && !f.locked && (
                    <>
                      <i className="handle nw" data-field-id={f.id} data-corner="nw" />
                      <i className="handle ne" data-field-id={f.id} data-corner="ne" />
                      <i className="handle sw" data-field-id={f.id} data-corner="sw" />
                      <i className="handle se" data-field-id={f.id} data-corner="se" />
                    </>
                  )}
                </div>
              )
            })}
        </div>
      </div>
      <div className="canvas-meta">
        {project.page.size.name} · {project.page.size.widthMm}×
        {project.page.size.heightMm} مم · {project.page.dpi} DPI تصميم ·{' '}
        {pagePx.width}×{pagePx.height} بكسل
      </div>
    </div>
  )
}
