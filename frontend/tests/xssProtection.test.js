import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  isSafeUrl,
  sanitizeInput,
  sanitizeUrl,
} from '../src/utils/xssProtection.js'

describe('xssProtection utilities', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>alert('x')</script>`))
      .toBe('&lt;script&gt;alert(&#x27;x&#x27;)&lt;&#x2F;script&gt;')
  })

  it('returns non-string values unchanged for escapeHtml', () => {
    expect(escapeHtml(null)).toBeNull()
    expect(escapeHtml(42)).toBe(42)
  })

  it('sanitizes text input with trimming, length limit, and escaping', () => {
    expect(sanitizeInput('  <b>hello</b>  ', { maxLength: 8 }))
      .toBe('&lt;b&gt;hello')
  })

  it('can preserve HTML and whitespace when explicitly allowed', () => {
    expect(sanitizeInput('  <b>hello</b>  ', { allowHtml: true, trim: false }))
      .toBe('  <b>hello</b>  ')
  })

  it('returns an empty string for non-string input', () => {
    expect(sanitizeInput(undefined)).toBe('')
  })

  it('rejects dangerous URL protocols', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl(' DATA:text/html,<p>x</p>')).toBe(false)
    expect(isSafeUrl('https://example.com/item')).toBe(true)
  })

  it('sanitizes unsafe URLs to root', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('/')
    expect(sanitizeUrl('/uploads/a.png')).toBe('/uploads/a.png')
  })
})
