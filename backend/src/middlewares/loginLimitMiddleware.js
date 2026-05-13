/**
 * 登录失败限频中间件
 * 防止暴力破解攻击
 * 规则：同一 IP 地址 5 分钟内登录失败超过 5 次，则锁定该 IP 5 分钟
 */

// 内存存储登录失败记录（生产环境应使用 Redis）
const loginAttempts = new Map()

const MAX_ATTEMPTS = 5
const LOCK_TIME = 5 * 60 * 1000 // 5 分钟
const ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 分钟时间窗口

function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown'
}

function loginLimitMiddleware(req, res, next) {
  const clientIp = getClientIp(req)
  const now = Date.now()

  // 获取该 IP 的尝试记录
  let attempts = loginAttempts.get(clientIp)

  // 如果没有记录或者已过期，则创建新的
  if (!attempts || now - attempts.firstAttempt > ATTEMPT_WINDOW) {
    attempts = {
      count: 0,
      firstAttempt: now,
      lockedUntil: null,
    }
    loginAttempts.set(clientIp, attempts)
  }

  // 检查是否被锁定
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return res.status(429).json({
      code: 429,
      message: '登录尝试次数过多，请 5 分钟后再试',
      data: null,
    })
  }

  // 如果已解锁，则重置尝试计数
  if (attempts.lockedUntil && now >= attempts.lockedUntil) {
    attempts.count = 0
    attempts.firstAttempt = now
    attempts.lockedUntil = null
  }

  // 附加一个方法到 res，用于记录失败的登录尝试
  res.recordLoginFailure = () => {
    attempts.count++
    if (attempts.count >= MAX_ATTEMPTS) {
      attempts.lockedUntil = now + LOCK_TIME
    }
    loginAttempts.set(clientIp, attempts)
  }

  // 附加一个方法到 res，用于清除该 IP 的尝试记录（登录成功时调用）
  res.clearLoginAttempts = () => {
    loginAttempts.delete(clientIp)
  }

  next()
}

// 定期清理过期的记录（防止内存泄漏）
setInterval(() => {
  const now = Date.now()
  for (const [ip, attempts] of loginAttempts.entries()) {
    if (now - attempts.firstAttempt > ATTEMPT_WINDOW * 2) {
      loginAttempts.delete(ip)
    }
  }
}, 60 * 1000) // 每 60 秒清理一次

module.exports = loginLimitMiddleware
