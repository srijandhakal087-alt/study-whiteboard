import { invoke } from '@tauri-apps/api/core'

export function reportDiagnostic(message: string) {
  const entry = `${new Date().toISOString()} ${message}`
  console.log(entry)
  void invoke('frontend_log', { message: entry }).catch(() => undefined)
}
