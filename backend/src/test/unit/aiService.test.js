const fs = require('fs')
const os = require('os')
const path = require('path')
const aiService = require('../../services/aiService')

describe('aiService Ark integration', () => {
  let originalFetch
  let originalEnv

  beforeEach(() => {
    originalFetch = global.fetch
    originalEnv = {
      ARK_API_KEY: process.env.ARK_API_KEY,
      ARK_BASE_URL: process.env.ARK_BASE_URL,
      ARK_MODEL: process.env.ARK_MODEL,
      UPLOAD_DIR: process.env.UPLOAD_DIR
    }
    delete process.env.ARK_API_KEY
    delete process.env.ARK_BASE_URL
    delete process.env.ARK_MODEL
    delete process.env.UPLOAD_DIR
  })

  afterEach(() => {
    global.fetch = originalFetch
    restoreEnv('ARK_API_KEY', originalEnv.ARK_API_KEY)
    restoreEnv('ARK_BASE_URL', originalEnv.ARK_BASE_URL)
    restoreEnv('ARK_MODEL', originalEnv.ARK_MODEL)
    restoreEnv('UPLOAD_DIR', originalEnv.UPLOAD_DIR)
  })

  function restoreEnv(name, value) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }

  function mockArkResponse(content) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(content)
            }
          }
        ]
      })
    })
  }

  test('throws when Ark key is not configured for product draft and price suggestion', async () => {
    global.fetch = jest.fn()

    await expect(aiService.buildProductDraft({ title: '高数教材', condition: 'like_new' }))
      .rejects.toThrow('未配置 ARK_API_KEY')
    await expect(aiService.suggestPrice({ price: 100, condition: 'like_new' }))
      .rejects.toThrow('未配置 ARK_API_KEY')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('calls Ark chat completions for product draft', async () => {
    process.env.ARK_API_KEY = 'test-ark-key'
    mockArkResponse({
      title: 'AI 标题',
      description: 'AI 描述',
      category: '图书教材',
      condition: 'good'
    })

    const draft = await aiService.buildProductDraft({ title: '教材' })

    expect(draft).toEqual({
      title: 'AI 标题',
      description: 'AI 描述',
      category: '图书教材',
      condition: 'good'
    })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch.mock.calls[0][0]).toBe(`${aiService.ARK_DEFAULT_BASE_URL}/chat/completions`)

    const request = global.fetch.mock.calls[0][1]
    expect(request.method).toBe('POST')
    expect(request.headers.Authorization).toBe('Bearer test-ark-key')
    expect(JSON.parse(request.body)).toMatchObject({
      model: aiService.ARK_DEFAULT_MODEL,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' }
    })
    expect(request.body).not.toContain('校园面交')
    expect(request.body).not.toContain('商品成色：')
  })

  test('sends uploaded image data to Ark for product draft', async () => {
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campus-ai-upload-'))
    process.env.UPLOAD_DIR = uploadDir
    process.env.ARK_API_KEY = 'test-ark-key'
    fs.writeFileSync(path.join(uploadDir, 'shirt.png'), Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a
    ]))
    mockArkResponse({
      title: '灰色短袖 POLO 闲置',
      description: '图片里是一件灰色短袖 POLO 衫，衣领和门襟完整，适合校园日常穿着。',
      category: '生活用品',
      condition: 'like_new'
    })

    await aiService.buildProductDraft({
      title: '校园闲置数码产品（附实拍图）',
      category: '3C数码',
      condition: 'like_new',
      images: ['/uploads/shirt.png']
    })

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    const userContent = requestBody.messages[1].content
    expect(userContent).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'image_url',
        image_url: expect.objectContaining({
          url: expect.stringMatching(/^data:image\/png;base64,/)
        })
      })
    ]))
  })

  test('normalizes numeric Ark price suggestion', async () => {
    process.env.ARK_API_KEY = 'test-ark-key'
    mockArkResponse({
      quickSalePrice: '80.126',
      fairPrice: 90.555,
      highDisplayPrice: 100,
      reason: 'AI 定价理由'
    })

    const suggestion = await aiService.suggestPrice({ originalPrice: 150, condition: 'good' })

    expect(suggestion).toEqual({
      quickSalePrice: 80.13,
      fairPrice: 90.56,
      highDisplayPrice: 100,
      reason: 'AI 定价理由'
    })
  })

  test('throws instead of falling back when Ark product draft request fails', async () => {
    process.env.ARK_API_KEY = 'test-ark-key'
    global.fetch = jest.fn().mockRejectedValue(new Error('network failed'))

    await expect(aiService.buildProductDraft({ title: '高数教材', condition: 'like_new' }))
      .rejects.toThrow('Doubao AI 调用异常')
  })

  test('rejects template-like Ark product draft output', async () => {
    process.env.ARK_API_KEY = 'test-ark-key'
    mockArkResponse({
      title: '高数教材 校园面交',
      description: '商品成色：几乎全新。建议在校园内面交，支持当面验货后完成交易。',
      category: '图书教材',
      condition: 'like_new'
    })

    await expect(aiService.buildProductDraft({ title: '高数教材', condition: 'like_new' }))
      .rejects.toThrow('Doubao AI 返回格式无效')
  })

  test('falls back when Ark request fails', async () => {
    process.env.ARK_API_KEY = 'test-ark-key'
    global.fetch = jest.fn().mockRejectedValue(new Error('network failed'))

    const result = await aiService.riskCheck('我们不走平台，扫码付款可以吗')

    expect(result.risky).toBe(true)
    expect(result.keywords).toEqual(['不走平台', '扫码付款'])
    expect(result.message).toContain('平台外付款')
  })
})
