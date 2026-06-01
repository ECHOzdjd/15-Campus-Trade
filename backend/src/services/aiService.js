const conditionTextMap = {
  new: '全新未拆',
  like_new: '几乎全新',
  good: '轻微使用痕迹',
  fair: '有明显使用痕迹'
}

const priceRatioMap = {
  new: 0.85,
  like_new: 0.75,
  good: 0.6,
  fair: 0.45
}

const riskKeywords = ['先转账', '不走平台', '押金', '校外', '私下付款', '扫码付款']

function getConditionText(condition) {
  return conditionTextMap[condition] || '成色正常'
}

function getPriceRatio(condition) {
  return priceRatioMap[condition] || 0.6
}

function formatPrice(value) {
  return Number(value.toFixed(2))
}

function buildProductDraft(input = {}) {
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

function suggestPrice(input = {}) {
  input = input || {}
  const parsedPrice = Number(input.originalPrice || input.price || 0)
  const basePrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0
  const ratio = getPriceRatio(input.condition)
  const fairPrice = formatPrice(basePrice * ratio)

  return {
    quickSalePrice: formatPrice(fairPrice * 0.9),
    fairPrice,
    highDisplayPrice: formatPrice(fairPrice * 1.12),
    reason: `按原价和成色估算，建议标价留出小幅议价空间。`
  }
}

function riskCheck(content = '') {
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

module.exports = {
  buildProductDraft,
  suggestPrice,
  riskCheck
}
