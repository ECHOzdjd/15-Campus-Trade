import { sanitizeUrl } from './xssProtection.js'

export function resolveAssetUrl(url) {
  const safeUrl = sanitizeUrl(url || '')
  if (!safeUrl || safeUrl === '/') {
    return ''
  }

  try {
    return new URL(safeUrl).toString()
  } catch {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const apiUrl = new URL(apiBase, window.location.origin)
    return new URL(safeUrl, apiUrl.origin).toString()
  }
}
