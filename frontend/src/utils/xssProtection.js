/**
 * XSS 防护工具
 * 用于清理用户输入，防止 XSS 攻击
 */

// HTML 特殊字符转义
const escapeHtmlChars = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

/**
 * 转义 HTML 特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return text
  }
  return text.replace(/[&<>"'/]/g, (char) => escapeHtmlChars[char])
}

/**
 * 验证和清理输入
 * @param {string} input - 用户输入
 * @param {Object} options - 验证选项
 * @returns {string} 清理后的输入
 */
export function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') {
    return ''
  }

  const {
    maxLength = 500,
    allowHtml = false,
    trim = true,
  } = options

  // 去除首尾空格
  let sanitized = trim ? input.trim() : input

  // 限制长度
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // 转义 HTML 特殊字符（防止 XSS）
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized)
  }

  return sanitized
}

/**
 * 验证 URL 是否安全（防止 javascript: 协议等）
 * @param {string} url - 需要验证的 URL
 * @returns {boolean} 是否安全
 */
export function isSafeUrl(url) {
  if (typeof url !== 'string') {
    return false
  }

  const dangerous = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ]

  const lowerUrl = url.toLowerCase().trim()
  return !dangerous.some((protocol) => lowerUrl.startsWith(protocol))
}

/**
 * 清理 URL
 * @param {string} url - 需要清理的 URL
 * @returns {string} 清理后的 URL
 */
export function sanitizeUrl(url) {
  if (!isSafeUrl(url)) {
    return '/'
  }
  return url
}

export default {
  escapeHtml,
  sanitizeInput,
  isSafeUrl,
  sanitizeUrl,
}
