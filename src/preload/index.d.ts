import type { CertificateAPI } from '../../preload/index'

declare global {
  interface Window {
    certificateAPI: CertificateAPI
  }
}

export {}
