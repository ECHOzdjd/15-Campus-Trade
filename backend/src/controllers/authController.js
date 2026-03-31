const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')

// 模拟数据库 - 实际项目应使用真实数据库
const users = [
  {
    id: 1,
    studentId: '2312190301',
    email: 'user1@campustrade.com',
    username: '张三',
    avatar: null,
    phone: null,
    // 初始密码：Password123!
    password: bcryptjs.hashSync('Password123!', 10),
    createdAt: new Date('2026-03-01'),
  }
]

let nextUserId = 2

// 注册
async function register(req, res, next) {
  try {
    const { studentId, email, password, username } = req.body

    // 参数验证
    if (!studentId || !email || !password || !username) {
      return res.status(400).json({
        code: 400,
        message: '参数缺失',
        data: null,
      })
    }

    // 密码强度验证
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        code: 400,
        message: '密码至少 8 位，需包含大小写字母和数字',
        data: null,
      })
    }

    // 检查用户是否已存在
    if (users.find(u => u.email === email || u.studentId === studentId)) {
      return res.status(400).json({
        code: 400,
        message: '学号或邮箱已被使用',
        data: null,
      })
    }

    // 创建用户
    const hashedPassword = bcryptjs.hashSync(password, 10)
    const user = {
      id: nextUserId++,
      studentId,
      email,
      username,
      avatar: null,
      phone: null,
      password: hashedPassword,
      createdAt: new Date(),
    }
    users.push(user)

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
          studentId: user.studentId,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          phone: user.phone,
          createdAt: user.createdAt,
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
    const { email, password } = req.body

    console.log('登录请求:', { email, password: password ? '***' : 'undefined' })
    console.log('已注册用户:', users.map(u => ({ id: u.id, email: u.email })))

    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: '邮箱和密码不能为空',
        data: null,
      })
    }

    const user = users.find(u => u.email === email)
    console.log('查找到的用户:', user ? { id: user.id, email: user.email } : '未找到')
    
    if (!user || !bcryptjs.compareSync(password, user.password)) {
      console.log('登录失败: 用户不存在或密码错误')
      return res.status(401).json({
        code: 401,
        message: '邮箱或密码错误',
        data: null,
      })
    }

    // 签发 Token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    console.log('登录成功:', { id: user.id, email: user.email })
    res.json({
      code: 200,
      message: 'success',
      data: {
        token,
        user: {
          id: user.id,
          studentId: user.studentId,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          phone: user.phone,
          createdAt: user.createdAt,
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
    const user = users.find(u => u.id === req.user.id)
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
        studentId: user.studentId,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.createdAt,
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

    const user = users.find(u => u.id === req.user.id)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      })
    }

    if (!bcryptjs.compareSync(oldPassword, user.password)) {
      return res.status(401).json({
        code: 401,
        message: '旧密码错误',
        data: null,
      })
    }

    // 验证新密码强度
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({
        code: 400,
        message: '新密码至少 8 位，需包含大小写字母和数字',
        data: null,
      })
    }

    user.password = bcryptjs.hashSync(newPassword, 10)

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
