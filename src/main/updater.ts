import { app, dialog, BrowserWindow } from 'electron'

/**
 * Auto-update from GitHub Releases (electron-builder + electron-updater).
 * Only runs in packaged apps (not `npm run dev`).
 */
export async function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): Promise<void> {
  if (!app.isPackaged) return

  try {
    // Dynamic import keeps dev lighter if module missing temporarily
    const { autoUpdater } = await import('electron-updater')
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      const win = getMainWindow()
      win?.webContents.send('update:status', {
        status: 'available',
        version: info.version
      })
    })

    autoUpdater.on('update-downloaded', async (info) => {
      const win = getMainWindow()
      win?.webContents.send('update:status', {
        status: 'downloaded',
        version: info.version
      })
      const result = await dialog.showMessageBox({
        type: 'info',
        buttons: ['إعادة التشغيل الآن', 'لاحقاً'],
        defaultId: 0,
        cancelId: 1,
        title: 'تحديث جاهز',
        message: `تم تنزيل الإصدار ${info.version}`,
        detail: 'أعد تشغيل التطبيق لتطبيق التحديث.'
      })
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })

    autoUpdater.on('error', (err) => {
      const win = getMainWindow()
      win?.webContents.send('update:status', {
        status: 'error',
        message: err?.message ?? String(err)
      })
    })

    // Check on launch + every 6 hours
    await autoUpdater.checkForUpdatesAndNotify()
    setInterval(
      () => {
        autoUpdater.checkForUpdatesAndNotify().catch(() => undefined)
      },
      6 * 60 * 60 * 1000
    )
  } catch (e) {
    console.warn('auto-updater unavailable', e)
  }
}
