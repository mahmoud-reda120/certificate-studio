import { useStudioStore } from '../stores/studioStore'

type Props = {
  className?: string
  /** Large dual switch for welcome / first-run discovery */
  prominent?: boolean
}

export function ThemeToggle({ className = '', prominent = false }: Props) {
  const theme = useStudioStore((s) => s.theme)
  const setTheme = useStudioStore((s) => s.setTheme)
  const toggleTheme = useStudioStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  if (prominent) {
    return (
      <div className={`theme-switch ${className}`.trim()} role="group" aria-label="مظهر الواجهة">
        <span className="theme-switch-caption">مظهر الواجهة</span>
        <div className="theme-switch-track">
          <button
            type="button"
            className={isDark ? 'active' : ''}
            onClick={() => setTheme('dark')}
            aria-pressed={isDark}
          >
            داكن
          </button>
          <button
            type="button"
            className={!isDark ? 'active' : ''}
            onClick={() => setTheme('light')}
            aria-pressed={!isDark}
          >
            فاتح
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`btn ghost theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      title={isDark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
      aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {isDark ? '☀' : '☾'}
      </span>
      <span className="theme-toggle-label">{isDark ? 'فاتح' : 'داكن'}</span>
    </button>
  )
}
