// Mock the database pool before requiring userModel
jest.mock('../../src/config/db', () => {
  const mockQuery = jest.fn()
  return { query: mockQuery }
})

const pool = require('../../src/config/db')
const userModel = require('../../src/models/userModel')

describe('userModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  // 测试1: findByEmail - 找到用户
  test('findByEmail should return user when found', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      phone: '1234567890',
      avatar: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
    pool.query.mockResolvedValueOnce([[mockUser]])

    const result = await userModel.findByEmail('test@example.com')

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM users WHERE email = ?'),
      ['test@example.com']
    )
    expect(result).toEqual(mockUser)
  })

  // 测试2: findByEmail - 未找到用户
  test('findByEmail should return null when not found', async () => {
    pool.query.mockResolvedValueOnce([[]])

    const result = await userModel.findByEmail('nonexistent@example.com')

    expect(result).toBeNull()
  })

  // 测试3: checkEmailExists - 邮箱存在
  test('checkEmailExists should return true when email exists', async () => {
    pool.query.mockResolvedValueOnce([[{ count: 1 }]])

    const result = await userModel.checkEmailExists('existing@example.com')

    expect(result).toBe(true)
  })

  // 测试4: checkUsernameExists - 用户名不存在
  test('checkUsernameExists should return false when username does not exist', async () => {
    pool.query.mockResolvedValueOnce([[{ count: 0 }]])

    const result = await userModel.checkUsernameExists('newuser')

    expect(result).toBe(false)
  })

  // 测试5: create - 创建新用户
  test('create should insert user and return new user id', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 5 }])

    const userData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'hashedpassword',
      phone: '1234567890'
    }

    const result = await userModel.create(userData)

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['newuser', 'new@example.com', 'hashedpassword', '1234567890', null]
    )
    expect(result).toBe(5)
  })

  // 测试6: findById - 找到用户
  test('findById should return user without password', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      phone: '1234567890',
      avatar: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
    pool.query.mockResolvedValueOnce([[mockUser]])

    const result = await userModel.findById(1)

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM users WHERE id = ?'),
      [1]
    )
    expect(result).toEqual(mockUser)
    expect(result).not.toHaveProperty('password')
  })

  // 测试7: updatePassword - 更新密码
  test('updatePassword should update password and return true', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await userModel.updatePassword(1, 'newhashedpassword')

    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE users SET password = ? WHERE id = ?',
      ['newhashedpassword', 1]
    )
    expect(result).toBe(true)
  })

  // 测试8: update - 更新用户信息
  test('update should update user fields and return true', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await userModel.update(1, { username: 'newname', phone: '9999999999' })

    expect(result).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET'),
      expect.arrayContaining(['newname', '9999999999', 1])
    )
  })
})
