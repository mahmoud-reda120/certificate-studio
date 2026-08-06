import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

/**
 * Auto-update from GitHub Releases.
 * Only active in packaged installers (AppImage / NSIS), not npm run dev.
 */
export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) {
    console.log('[updater] skipped — not packaged (dev mode)')
    return
  }

  try {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    // Public repo — no token required for checks
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'mahmoud-reda120',
      repo: 'certificate-studio'
    })

    autoUpdater.on('checking-for-update', () => {
      console.log('[updater] checking… current=', app.getVersion())
    })

    autoUpdater.on('update-available', (info) => {
      console.log('[updater] available', info.version)
      getMainWindow()?.webContents.send('update:status', {
        status: 'available',
        version: info.version
      })
      dialog
        .showMessageBox({
          type: 'info',
          buttons: ['حسناً'],
          title: 'تحديث متاح',
          message: `جارٍ تنزيل الإصدار ${info.version}`,
          detail: `النسخة الحالية: ${app.getVersion()}`
        })
        .catch(() => undefined)
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[updater] already latest', app.getVersion())
    })

    autoUpdater.on('error', (err) => {
      console.error('[updater] error', err)
      getMainWindow()?.webContents.send('update:status', {
        status: 'error',
        message: err?.message ?? String(err)
      })
    })

    autoUpdater.on('update-downloaded', async (info) => {
      console.log('[updater] downloaded', info.version)
      getMainWindow()?.webContents.send('update:status', {
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
        detail: 'أعد تشغيل التطبيق لتطبيق التحديث وظهور الميزات الجديدة.'
      })
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })

    // Delay so window is ready
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => {
        console.error('[updater] check failed', e)
      })
    }, 2500)

    setInterval(
      () => {
        autoUpdater.checkForUpdates().catch(() => undefined)
      },
      6 * 60 * 60 * 1000
    )
  } catch (e) {
    console.error('[updater] setup failed', e)
  }
}
