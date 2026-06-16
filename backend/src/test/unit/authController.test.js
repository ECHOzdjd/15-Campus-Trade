jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

jest.mock('../../models/userModel', () => ({
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  updatePassword: jest.fn(),
}))

const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const userModel = require('../../models/userModel')
const authController = require('../../controllers/authController')

function createRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.recordLoginFailure = jest.fn()
  res.clearLoginAttempts = jest.fn()
  return res
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    bcryptjs.hash.mockResolvedValue('hashed-password')
    bcryptjs.compare.mockResolvedValue(true)
    userModel.checkEmailExists.mockResolvedValue(false)
    userModel.checkUsernameExists.mockResolvedValue(false)
    userModel.create.mockResolvedValue(7)
    userModel.findById.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      username: 'tester',
      avatar: null,
      phone: null,
      role: 'user',
      created_at: '2026-01-01',
      password: 'hashed-password',
    })
    userModel.findByEmail.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      username: 'tester',
      avatar: null,
      phone: null,
      role: 'user',
      created_at: '2026-01-01',
      password: 'hashed-password',
    })
    userModel.findByUsername.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      username: 'tester',
      avatar: null,
      phone: null,
      role: 'user',
      created_at: '2026-01-01',
      password: 'hashed-password',
    })
  })

  test('register rejects invalid inputs and duplicate identities', async () => {
    const cases = [
      [{ body: {} }],
      [{ body: { email: 'a@example.com', password: '1234', username: 'test' } }, 'short-password'],
      [{ body: { email: 'a@example.com', password: '1234', username: 'test' }, emailExists: true }],
      [{ body: { email: 'a@example.com', password: '1234', username: 'test' }, usernameExists: true }],
    ]

    for (const [req, marker] of cases) {
      const res = createRes()
      if (marker === 'short-password') {
        req.body.password = '123'
      }
      userModel.checkEmailExists.mockReset()
      userModel.checkUsernameExists.mockReset()
      userModel.checkEmailExists.mockResolvedValue(Boolean(req.emailExists))
      userModel.checkUsernameExists.mockResolvedValue(Boolean(req.usernameExists))

      await authController.register(req, res, jest.fn())

      expect(res.status).toHaveBeenCalledWith(400)
    }
  })

  test('register creates user and signs a token', async () => {
    const res = createRes()

    await authController.register({
      body: {
        email: 'test@example.com',
        password: 'Password123!',
        username: 'tester',
        phone: '123',
      },
    }, res, jest.fn())

    expect(bcryptjs.hash).toHaveBeenCalledWith('Password123!', 10)
    expect(userModel.create).toHaveBeenCalledWith({
      username: 'tester',
      email: 'test@example.com',
      password: 'hashed-password',
      phone: '123',
    })
    expect(jwt.sign).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls.at(-1)[0].data.token).toBe('signed-token')
  })

  test('login handles missing credentials, unknown users, bad passwords, and success', async () => {
    const missingRes = createRes()
    await authController.login({ body: {} }, missingRes, jest.fn())
    expect(missingRes.status).toHaveBeenCalledWith(400)
    expect(missingRes.recordLoginFailure).toHaveBeenCalled()

    userModel.findByEmail.mockResolvedValueOnce(null)
    const missingUserRes = createRes()
    await authController.login({ body: { email: 'x@example.com', password: 'Password123!' } }, missingUserRes, jest.fn())
    expect(missingUserRes.status).toHaveBeenCalledWith(401)
    expect(missingUserRes.recordLoginFailure).toHaveBeenCalled()

    bcryptjs.compare.mockResolvedValueOnce(false)
    const badPasswordRes = createRes()
    await authController.login({ body: { email: 'test@example.com', password: 'wrong' } }, badPasswordRes, jest.fn())
    expect(badPasswordRes.status).toHaveBeenCalledWith(401)
    expect(badPasswordRes.recordLoginFailure).toHaveBeenCalled()

    bcryptjs.compare.mockResolvedValueOnce(true)
    const okRes = createRes()
    await authController.login({ body: { username: 'tester', password: 'Password123!' } }, okRes, jest.fn())
    expect(okRes.clearLoginAttempts).toHaveBeenCalled()
    expect(okRes.json.mock.calls.at(-1)[0].data.token).toBe('signed-token')
  })

  test('getMe and updatePassword cover success and error branches', async () => {
    const missingUserRes = createRes()
    userModel.findById.mockResolvedValueOnce(null)
    await authController.getMe({ user: { id: 1 } }, missingUserRes, jest.fn())
    expect(missingUserRes.status).toHaveBeenCalledWith(404)

    const okRes = createRes()
    userModel.findById.mockResolvedValueOnce({
      id: 1,
      email: 'ok@example.com',
      username: 'ok',
      avatar: null,
      phone: null,
      role: 'user',
      created_at: '2026-01-01',
    })
    await authController.getMe({ user: { id: 1 } }, okRes, jest.fn())
    expect(okRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 200,
      message: 'success',
    }))

    const missingPasswordRes = createRes()
    await authController.updatePassword({ body: {} }, missingPasswordRes, jest.fn())
    expect(missingPasswordRes.status).toHaveBeenCalledWith(400)

    const missingAccountRes = createRes()
    userModel.findByEmail.mockResolvedValueOnce(null)
    await authController.updatePassword({
      body: { oldPassword: 'old', newPassword: 'new' },
      user: { email: 'missing@example.com' },
    }, missingAccountRes, jest.fn())
    expect(missingAccountRes.status).toHaveBeenCalledWith(404)

    const badOldRes = createRes()
    userModel.findByEmail.mockResolvedValueOnce({ id: 2, password: 'hashed-password' })
    bcryptjs.compare.mockResolvedValueOnce(false)
    await authController.updatePassword({
      body: { oldPassword: 'old', newPassword: 'new' },
      user: { email: 'test@example.com' },
    }, badOldRes, jest.fn())
    expect(badOldRes.status).toHaveBeenCalledWith(401)

    const shortNewRes = createRes()
    userModel.findByEmail.mockResolvedValueOnce({ id: 2, password: 'hashed-password' })
    bcryptjs.compare.mockResolvedValueOnce(true)
    await authController.updatePassword({
      body: { oldPassword: 'old', newPassword: '123' },
      user: { email: 'test@example.com' },
    }, shortNewRes, jest.fn())
    expect(shortNewRes.status).toHaveBeenCalledWith(400)

    const successRes = createRes()
    userModel.findByEmail.mockResolvedValueOnce({ id: 2, password: 'hashed-password' })
    bcryptjs.compare.mockResolvedValueOnce(true)
    bcryptjs.hash.mockResolvedValueOnce('new-hash')
    await authController.updatePassword({
      body: { oldPassword: 'old', newPassword: 'new-pass' },
      user: { email: 'test@example.com' },
    }, successRes, jest.fn())
    expect(userModel.updatePassword).toHaveBeenCalledWith(2, 'new-hash')
    expect(successRes.json).toHaveBeenCalledWith({
      code: 200,
      message: 'success',
      data: null,
    })
  })
})
