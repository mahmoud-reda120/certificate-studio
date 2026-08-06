import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { IPC } from '../shared/ipc'
import { parseExcelFile } from './excelParser'
import { setupAutoUpdater } from './updater'

// Chromium SUID sandbox is often misconfigured on Linux; disable for local app use.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: `Certificate Studio v${app.getVersion()}`,
    backgroundColor: '#0f1218',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  const win = mainWindow
  win.on('ready-to-show', () => win.show())
  win.on('closed', () => {
    mainWindow = null
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle(IPC.PICK_EXCEL, async () => {
    const result = await dialog.showOpenDialog({
      title: 'اختر ملف Excel',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PICK_IMAGE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'اختر صورة القالب',
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PICK_SAVE_PDF, async (_e, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      title: 'حفظ ملف PDF',
      defaultPath: defaultName.endsWith('.pdf') ? defaultName : `${defaultName}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle(IPC.PICK_SAVE_PROJECT, async (_e, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      title: 'حفظ المشروع',
      defaultPath: defaultName.endsWith('.certproj')
        ? defaultName
        : `${defaultName}.certproj`,
      filters: [{ name: 'Certificate Project', extensions: ['certproj'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle(IPC.PICK_OPEN_PROJECT, async () => {
    const result = await dialog.showOpenDialog({
      title: 'فتح مشروع',
      properties: ['openFile'],
      filters: [{ name: 'Certificate Project', extensions: ['certproj', 'json'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PARSE_EXCEL, async (_e, filePath: string) => {
    return parseExcelFile(filePath)
  })

  ipcMain.handle(IPC.READ_FILE_DATA_URL, async (_e, filePath: string) => {
    const buf = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  ipcMain.handle(
    IPC.SAVE_PROJECT,
    async (_e, filePath: string, json: string) => {
      await writeFile(filePath, json, 'utf-8')
      return true
    }
  )

  ipcMain.handle(IPC.OPEN_PROJECT, async (_e, filePath: string) => {
    const raw = await readFile(filePath, 'utf-8')
    return raw
  })

  ipcMain.handle(
    IPC.SAVE_PDF,
    async (_e, filePath: string, base64Pdf: string) => {
      const buf = Buffer.from(base64Pdf, 'base64')
      await writeFile(filePath, buf)
      return true
    }
  )

  ipcMain.handle(IPC.GET_APP_VERSION, async () => app.getVersion())
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  setupAutoUpdater(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
