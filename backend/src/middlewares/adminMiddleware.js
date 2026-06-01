const userModel = require('../models/userModel')

async function adminMiddleware(req, res, next) {
  try {
    const user = req.user?.id ? await userModel.findById(req.user.id) : null

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '\u9700\u8981\u7ba1\u7406\u5458\u6743\u9650',
        data: null
      })
    }

    req.user.role = user.role
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = adminMiddleware
