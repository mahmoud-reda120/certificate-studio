/**
 * Template string interpolation: "مرحبا {{name}}" + row → "مرحبا أحمد"
 */

export function interpolate(
  template: string,
  row: Record<string, string>,
  options?: { missing?: 'empty' | 'keep' | 'placeholder' }
): string {
  const missing = options?.missing ?? 'empty'
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const k = key.trim()
    if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null) {
      return String(row[k])
    }
    // case-insensitive column match
    const found = Object.keys(row).find(
      (c) => c.trim().toLowerCase() === k.toLowerCase()
    )
    if (found != null) return String(row[found] ?? '')
    if (missing === 'keep') return `{{${k}}}`
    if (missing === 'placeholder') return `‹${k}›`
    return ''
  })
}

export function resolveFieldText(
  binding: { column?: string; template?: string },
  row: Record<string, string>
): string {
  if (binding.template && binding.template.length > 0) {
    return interpolate(binding.template, row)
  }
  if (binding.column) {
    const col = binding.column
    if (row[col] != null) return String(row[col])
    const found = Object.keys(row).find(
      (c) => c.trim().toLowerCase() === col.trim().toLowerCase()
    )
    return found ? String(row[found] ?? '') : ''
  }
  return ''
}

export function applyFileNameTemplate(
  template: string,
  row: Record<string, string> | null,
  fallback = 'certificates'
): string {
  const base =
    row != null
      ? interpolate(template, row, { missing: 'empty' })
      : template.replace(/\{\{\s*[^}]+\s*\}\}/g, '')
  const cleaned = base
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}
