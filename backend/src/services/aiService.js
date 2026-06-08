const fs = require('fs')
const path = require('path')

const conditionTextMap = {
  new: '全新未拆',
  like_new: '几乎全新',
  good: '轻微使用痕迹',
  fair: '有明显使用痕迹'
}

const riskKeywords = ['先转账', '不走平台', '押金', '校外', '私下付款', '扫码付款']
const ARK_DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_DEFAULT_MODEL = 'doubao-seed-2-0-mini-260215'

function createAiError(message, status = 502) {
  const error = new Error(message)
  error.status = status
  error.code = status
  return error
}

function getConditionText(condition) {
  return conditionTextMap[condition] || '成色正常'
}

function formatPrice(value) {
  return Number(value.toFixed(2))
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function getUploadedImageDataUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null

  let pathname = imageUrl
  try {
    pathname = new URL(imageUrl).pathname
  } catch (_error) {
    pathname = imageUrl
  }

  const normalizedPath = pathname.replace(/\\/g, '/')
  const marker = '/uploads/'
  const markerIndex = normalizedPath.indexOf(marker)
  if (markerIndex === -1) return null

  const relativeUploadPath = decodeURIComponent(normalizedPath.slice(markerIndex + marker.length))
  if (!relativeUploadPath || relativeUploadPath.includes('..')) {
    throw createAiError('上传图片路径无效', 400)
  }

  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
  const filePath = path.resolve(uploadRoot, relativeUploadPath)
  const relativePath = path.relative(uploadRoot, filePath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw createAiError('上传图片路径无效', 400)
  }

  let buffer
  try {
    buffer = fs.readFileSync(filePath)
  } catch (_error) {
    throw createAiError('上传图片读取失败', 400)
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw createAiError('上传图片过大，无法用于 AI 生成', 400)
  }

  return `data:${getMimeType(filePath)};base64,${buffer.toString('base64')}`
}

function buildUserContent(promptText, input = {}) {
  const content = [{ type: 'text', text: promptText }]
  const firstImage = Array.isArray(input.images) ? input.images[0] : null
  const imageDataUrl = getUploadedImageDataUrl(firstImage)

  if (firstImage && !imageDataUrl) {
    throw createAiError('上传图片格式无效，无法用于 AI 生成', 400)
  }

  if (imageDataUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: imageDataUrl }
    })
  }

  return content
}

function buildMockProductDraft(input = {}) {
  input = input || {}
  const rawTitle = typeof input.title === 'string' ? input.title : ''
  const trimmedTitle = rawTitle.trim()
  const category = input.category || '二手好物'
  const condition = input.condition || 'good'
  const displayTitle = trimmedTitle || category
  const conditionText = getConditionText(condition)

  return {
    title: `${displayTitle} 校园面交`,
    description: `商品成色：${conditionText}。建议在校园内面交，支持当面验货后完成交易。`,
    category,
    condition
  }
}

function buildProductDraftMessages(input) {
  const promptText = JSON.stringify({
    task: '根据用户输入和上传图片生成适合校园二手交易的商品标题和描述。',
    input,
    requirements: [
      '必须优先识别图片中的真实物品；当图片和用户填写的标题、分类不一致时，以图片内容为准。',
      '标题要贴近图片里的真实商品，不要生成空泛标题。',
      '描述要像学生真实发布闲置，包含商品状态、使用情况和交易提示。',
      '不要照抄固定模板，不要用冒号式成色句作为描述开头。',
      'condition 必须从 allowedConditions 中选择。'
    ],
    allowedConditions: Object.keys(conditionTextMap)
  })

  return [
    {
      role: 'system',
      content: '你是校园二手交易发布助手。只返回 JSON，不要输出 Markdown。JSON 字段必须是 title、description、category、condition。'
    },
    {
      role: 'user',
      content: buildUserContent(promptText, input)
    }
  ]
}

function buildPriceSuggestionMessages(input) {
  const promptText = JSON.stringify({
    task: '根据原价、成色、分类、描述和上传图片给出校园二手商品定价建议。',
    input,
    requirements: [
      '必须优先识别图片中的真实物品；当图片和文字不一致时，以图片内容为准。',
      '价格要结合商品类别、成色、描述和校园二手交易场景。',
      'reason 要说明具体估算依据，不要返回固定模板句。',
      'quickSalePrice <= fairPrice <= highDisplayPrice。'
    ]
  })

  return [
    {
      role: 'system',
      content: '你是校园二手交易定价助手。只返回 JSON，不要输出 Markdown。JSON 字段必须是 quickSalePrice、fairPrice、highDisplayPrice、reason。价格字段必须是数字。'
    },
    {
      role: 'user',
      content: buildUserContent(promptText, input)
    }
  ]
}

function buildMockRiskCheck(content = '') {
  const text = typeof content === 'string' ? content : String(content || '')
  const keywords = riskKeywords.filter(keyword => text.includes(keyword))
  const risky = keywords.length > 0

  return {
    risky,
    keywords,
    message: risky
      ? '这条消息可能涉及平台外付款或高风险交易，建议确认订单已付款到托管后再面交。'
      : ''
  }
}

function buildRiskCheckMessages(content, fallback) {
  return [
    {
      role: 'system',
      content: '你是校园交易风控助手。只返回 JSON，不要输出 Markdown。JSON 字段必须是 risky、keywords、message。'
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '判断聊天内容是否涉及平台外付款、押金、校外交易等风险。',
        content,
        fallback,
        localRiskKeywords: riskKeywords
      })
    }
  ]
}

function getArkBaseUrl() {
  return (process.env.ARK_BASE_URL || ARK_DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function getArkModel() {
  return process.env.ARK_MODEL || ARK_DEFAULT_MODEL
}

function cleanJsonContent(content) {
  const text = String(content || '').trim()
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : text
}

function parseJsonContent(content) {
  const text = cleanJsonContent(content)
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (error) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1))
    }
    throw error
  }
}

async function callArkJson(messages, options = {}) {
  const apiKey = process.env.ARK_API_KEY
  if (!apiKey) {
    throw createAiError('未配置 ARK_API_KEY，无法调用 Doubao AI', 503)
  }

  if (typeof fetch !== 'function') {
    throw createAiError('当前 Node 版本不支持 fetch，无法调用 Doubao AI', 503)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(`${getArkBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: getArkModel(),
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 512,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    })

    let responseText = ''
    let payload = null
    if (typeof response.text === 'function') {
      responseText = await response.text()
      payload = JSON.parse(responseText)
    } else {
      payload = await response.json()
      responseText = JSON.stringify(payload)
    }

    if (!response.ok) {
      throw createAiError(`Doubao AI 调用失败：${response.status} ${responseText.slice(0, 200)}`)
    }

    const parsed = parseJsonContent(payload?.choices?.[0]?.message?.content)
    if (!parsed) {
      throw createAiError('Doubao AI 未返回可解析的 JSON')
    }

    return parsed
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createAiError('Doubao AI 调用超时')
    }
    if (error.status) throw error
    throw createAiError(`Doubao AI 调用异常：${error.message}`)
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeProductDraft(value, fallback) {
  const result = value && typeof value === 'object' ? value : {}
  const title = typeof result.title === 'string' ? result.title.trim() : ''
  const description = typeof result.description === 'string' ? result.description.trim() : ''
  if (
    !title ||
    !description ||
    title.endsWith('校园面交') ||
    description.startsWith('商品成色：') ||
    description.includes('建议在校园内面交，支持当面验货后完成交易')
  ) {
    throw createAiError('Doubao AI 返回格式无效')
  }

  return {
    title: title.slice(0, 50),
    description: description.slice(0, 500),
    category: typeof result.category === 'string' && result.category.trim() ? result.category.trim() : fallback.category,
    condition: Object.prototype.hasOwnProperty.call(conditionTextMap, result.condition)
      ? result.condition
      : fallback.condition
  }
}

function normalizePriceSuggestion(value) {
  const result = value && typeof value === 'object' ? value : {}
  const quickSalePrice = Number(result.quickSalePrice)
  const fairPrice = Number(result.fairPrice)
  const highDisplayPrice = Number(result.highDisplayPrice)
  if (!Number.isFinite(fairPrice) || fairPrice <= 0) {
    throw createAiError('Doubao AI 返回格式无效')
  }

  return {
    quickSalePrice: Number.isFinite(quickSalePrice) && quickSalePrice > 0 ? formatPrice(quickSalePrice) : formatPrice(fairPrice * 0.9),
    fairPrice: formatPrice(fairPrice),
    highDisplayPrice: Number.isFinite(highDisplayPrice) && highDisplayPrice > 0 ? formatPrice(highDisplayPrice) : formatPrice(fairPrice * 1.12),
    reason: typeof result.reason === 'string' && result.reason.trim() ? result.reason.trim() : 'Doubao AI 已根据商品信息给出定价建议。'
  }
}

function normalizeRiskCheck(value, fallback) {
  const result = value && typeof value === 'object' ? value : {}
  const risky = typeof result.risky === 'boolean' ? result.risky : fallback.risky
  const keywords = Array.isArray(result.keywords)
    ? result.keywords.filter(keyword => typeof keyword === 'string' && keyword.trim())
    : fallback.keywords

  return {
    risky,
    keywords,
    message: risky
      ? (typeof result.message === 'string' && result.message.trim() ? result.message.trim() : fallback.message)
      : ''
  }
}

async function buildProductDraft(input = {}) {
  const fallback = buildMockProductDraft(input)
  const result = await callArkJson(buildProductDraftMessages(input), { maxTokens: 600 })
  return normalizeProductDraft(result, fallback)
}

async function suggestPrice(input = {}) {
  const result = await callArkJson(buildPriceSuggestionMessages(input), { maxTokens: 500 })
  return normalizePriceSuggestion(result)
}

async function riskCheck(content = '') {
  const fallback = buildMockRiskCheck(content)
  try {
    const result = await callArkJson(buildRiskCheckMessages(content, fallback), { maxTokens: 300 })
    return normalizeRiskCheck(result, fallback)
  } catch (error) {
    return fallback
  }
}

module.exports = {
  ARK_DEFAULT_BASE_URL,
  ARK_DEFAULT_MODEL,
  buildProductDraft,
  suggestPrice,
  riskCheck
}
