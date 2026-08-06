import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { ParseExcelResult } from '../shared/types'

const api = {
  pickExcel: (): Promise<string | null> => ipcRenderer.invoke(IPC.PICK_EXCEL),
  pickImage: (): Promise<string | null> => ipcRenderer.invoke(IPC.PICK_IMAGE),
  pickSavePdf: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PICK_SAVE_PDF, defaultName),
  pickSaveProject: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PICK_SAVE_PROJECT, defaultName),
  pickOpenProject: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PICK_OPEN_PROJECT),
  parseExcel: (filePath: string): Promise<ParseExcelResult> =>
    ipcRenderer.invoke(IPC.PARSE_EXCEL, filePath),
  readFileDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.READ_FILE_DATA_URL, filePath),
  saveProject: (filePath: string, json: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.SAVE_PROJECT, filePath, json),
  openProject: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.OPEN_PROJECT, filePath),
  savePdf: (filePath: string, base64Pdf: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.SAVE_PDF, filePath, base64Pdf)
}

contextBridge.exposeInMainWorld('certificateAPI', api)

export type CertificateAPI = typeof api
