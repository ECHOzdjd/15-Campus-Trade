jest.mock('fs', () => {
  const actual = jest.requireActual('fs')
  return {
    ...actual,
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
  }
})

const fs = require('fs')
const path = require('path')
const uploadController = require('../../controllers/uploadController')

function createRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('uploadController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('generateSafeFilename only allows image extensions', () => {
    const name = uploadController.generateSafeFilename('Avatar.JPG', 123)
    expect(name).toMatch(/^product_123_[a-z0-9]{8}\.jpg$/)
    expect(() => uploadController.generateSafeFilename('avatar.txt', 123)).toThrow('不支持的文件格式')
  })

  test('uploadImage rejects empty request and invalid files', async () => {
    const next = jest.fn()

    const emptyRes = createRes()
    await uploadController.uploadImage({}, emptyRes, next)
    expect(emptyRes.status).toHaveBeenCalledWith(400)

    const badTypeRes = createRes()
    await uploadController.uploadImage({
      file: { path: 'C:\\temp\\bad.txt', mimetype: 'text/plain', size: 100 },
    }, badTypeRes, next)
    expect(badTypeRes.status).toHaveBeenCalledWith(400)
    expect(fs.unlinkSync).toHaveBeenCalledWith('C:\\temp\\bad.txt')

    const tooLargeRes = createRes()
    await uploadController.uploadImage({
      file: { path: 'C:\\temp\\big.png', mimetype: 'image/png', size: 6 * 1024 * 1024 },
    }, tooLargeRes, next)
    expect(tooLargeRes.status).toHaveBeenCalledWith(400)
    expect(fs.unlinkSync).toHaveBeenCalledWith('C:\\temp\\big.png')
  })

  test('uploadImage accepts valid files and returns a public url', async () => {
    const res = createRes()
    await uploadController.uploadImage({
      file: {
        path: path.join(__dirname, '../../../uploads/product_1_test.png'),
        mimetype: 'image/png',
        size: 1024,
      },
    }, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      code: 201,
      message: 'success',
      data: {
        url: '/uploads/product_1_test.png',
        filename: 'product_1_test.png',
      },
    })
  })
})
