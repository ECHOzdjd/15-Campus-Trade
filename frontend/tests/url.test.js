import { describe, expect, it } from 'vitest'
import { resolveAssetUrl } from '../src/utils/url.js'

describe('resolveAssetUrl', () => {
  it('returns absolute safe URLs unchanged', () => {
    expect(resolveAssetUrl('https://example.com/image.png')).toBe('https://example.com/image.png')
  })

  it('resolves relative upload paths against the API origin', () => {
    expect(resolveAssetUrl('/uploads/book.png')).toBe('http://localhost:3000/uploads/book.png')
  })

  it('rejects dangerous URLs', () => {
    expect(resolveAssetUrl('javascript:alert(1)')).toBe('')
  })

  it('returns an empty string for blank values', () => {
    expect(resolveAssetUrl('')).toBe('')
    expect(resolveAssetUrl(null)).toBe('')
  })
})
