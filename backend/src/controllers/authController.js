const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const userModel = require('../models/userModel')

const MIN_PASSWORD_LENGTH = 4

// 注册
async function register(req, res, next) {
  try {
    const { email, password, username, phone } = req.body

    // 参数验证
    if (!email || !password || !username) {
      return res.status(400).json({
        code: 400,
        message: '邮箱、密码和用户名不能为空',
        data: null,
      })
    }

    // 密码长度验证
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        code: 400,
        message: `密码至少 ${MIN_PASSWORD_LENGTH} 位`,
        data: null,
      })
    }

    // 检查邮箱是否已存在
    const emailExists = await userModel.checkEmailExists(email)
    if (emailExists) {
      return res.status(400).json({
        code: 400,
        message: '邮箱已被使用',
        data: null,
      })
    }

    // 检查用户名是否已存在
    const usernameExists = await userModel.checkUsernameExists(username)
    if (usernameExists) {
      return res.status(400).json({
        code: 400,
        message: '用户名已被使用',
        data: null,
      })
    }

    // 创建用户
    const hashedPassword = await bcryptjs.hash(password, 10)
    const userId = await userModel.create({
      username,
      email,
      password: hashedPassword,
      phone: phone || null,
    })

    // 获取新创建的用户信息
    const user = await userModel.findById(userId)

    // 签发 Token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(201).json({
      code: 201,
      message: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          phone: user.phone,
          createdAt: user.created_at,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// 登录
async function login(req, res, next) {
  try {
    const { email, username, password } = req.body
    const loginIdentifier = email || username

    if (!loginIdentifier || !password) {
      // 记录登录失败尝试
      if (res.recordLoginFailure) {
        res.recordLoginFailure()
      }
      return res.status(400).json({
        code: 400,
        message: '邮箱/用户名和密码不能为空',
        data: null,
      })
    }

    // 查找用户（支持邮箱或用户名登录）
    let user
    if (loginIdentifier.includes('@')) {
      user = await userModel.findByEmail(loginIdentifier)
    } else {
      user = await userModel.findByUsername(loginIdentifier)
    }

    if (!user) {
      // 记录登录失败尝试
      if (res.recordLoginFailure) {
        res.recordLoginFailure()
      }
      return res.status(401).json({
        code: 401,
        message: '邮箱/用户名或密码错误',
        data: null,
      })
    }

    // 验证密码
    const isPasswordValid = await bcryptjs.compare(password, user.password)
    if (!isPasswordValid) {
      // 记录登录失败尝试
      if (res.recordLoginFailure) {
        res.recordLoginFailure()
      }
      return res.status(401).json({
        code: 401,
        message: '邮箱/用户名或密码错误',
        data: null,
      })
    }

    // 登录成功，清除该 IP 的失败尝试记录
    if (res.clearLoginAttempts) {
      res.clearLoginAttempts()
    }

    // 签发 Token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.json({
      code: 200,
      message: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          phone: user.phone,
          createdAt: user.created_at,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// 获取当前用户信息
async function getMe(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      })
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    next(error)
  }
}

// 修改密码
async function updatePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        message: '旧密码和新密码不能为空',
        data: null,
      })
    }

    // 获取用户信息（包含密码）
    const user = await userModel.findByEmail(req.user.email)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      })
    }

    // 验证旧密码
    const isOldPasswordValid = await bcryptjs.compare(oldPassword, user.password)
    if (!isOldPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '旧密码错误',
        data: null,
      })
    }

    // 验证新密码长度
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        code: 400,
        message: `新密码至少 ${MIN_PASSWORD_LENGTH} 位`,
        data: null,
      })
    }

    // 更新密码
    const hashedPassword = await bcryptjs.hash(newPassword, 10)
    await userModel.updatePassword(user.id, hashedPassword)

    res.json({
      code: 200,
      message: 'success',
      data: null,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
}
