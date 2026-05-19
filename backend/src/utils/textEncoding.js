const MOJIBAKE_MARKERS = /[\u0080-\u009f\u00c0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u201a-\u201e\u2020-\u2022\u2030\u2039\u203a\u20ac\u2122]/

const WINDOWS_1252_BYTES = {
  '\u20ac': 0x80,
  '\u201a': 0x82,
  '\u0192': 0x83,
  '\u201e': 0x84,
  '\u2026': 0x85,
  '\u2020': 0x86,
  '\u2021': 0x87,
  '\u02c6': 0x88,
  '\u2030': 0x89,
  '\u0160': 0x8a,
  '\u2039': 0x8b,
  '\u0152': 0x8c,
  '\u017d': 0x8e,
  '\u2018': 0x91,
  '\u2019': 0x92,
  '\u201c': 0x93,
  '\u201d': 0x94,
  '\u2022': 0x95,
  '\u2013': 0x96,
  '\u2014': 0x97,
  '\u02dc': 0x98,
  '\u2122': 0x99,
  '\u0161': 0x9a,
  '\u203a': 0x9b,
  '\u0153': 0x9c,
  '\u017e': 0x9e,
  '\u0178': 0x9f
}

const WINDOWS_1252_CHARS = Object.fromEntries(
  Object.entries(WINDOWS_1252_BYTES).map(([char, byte]) => [byte, char])
)

function decodeMojibake(value) {
  const bytes = []
  for (const char of value) {
    const code = char.codePointAt(0)
    if (Object.prototype.hasOwnProperty.call(WINDOWS_1252_BYTES, char)) {
      bytes.push(WINDOWS_1252_BYTES[char])
    } else if (code <= 0xff) {
      bytes.push(code)
    } else {
      return value
    }
  }
  return Buffer.from(bytes).toString('utf8')
}

function encodeMojibake(value) {
  return Array.from(Buffer.from(value, 'utf8'))
    .map(byte => WINDOWS_1252_CHARS[byte] || String.fromCharCode(byte))
    .join('')
}

function normalizeText(value) {
  if (typeof value !== 'string' || !MOJIBAKE_MARKERS.test(value)) {
    return value
  }

  const decoded = decodeMojibake(value)
  if (/[\u4e00-\u9fff]/.test(decoded) && !decoded.includes('\ufffd')) {
    return decoded
  }

  return value
}

function getTextVariants(value) {
  if (typeof value !== 'string') {
    return []
  }

  const normalized = normalizeText(value).trim()
  if (!normalized) {
    return []
  }

  return [...new Set([value.trim(), normalized, encodeMojibake(normalized)])]
}

module.exports = {
  getTextVariants,
  normalizeText
}
