import { useStudioStore } from '../stores/studioStore'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useStudioStore((s) => s.theme)
  const toggleTheme = useStudioStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

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
      <span className="theme-toggle-label">
        {isDark ? 'فاتح' : 'داكن'}
      </span>
    </button>
  )
}
