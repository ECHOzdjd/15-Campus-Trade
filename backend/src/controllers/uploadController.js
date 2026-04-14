const path = require('path')
const fs = require('fs')

// 确保上传文件夹存在
const uploadsDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// 上传图片
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '没有文件被上传',
        data: null,
      })
    }

    // 文件类型验证
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg']
    if (!allowedTypes.includes(req.file.mimetype)) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        code: 400,
        message: '不支持的文件格式，仅支持 jpg、jpeg、png、gif',
        data: null,
      })
    }

    // 文件大小验证（5MB）
    const maxSize = 5 * 1024 * 1024
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        code: 400,
        message: '文件过大，单文件不超过 5MB',
        data: null,
      })
    }

    // 返回文件 URL
    const port = process.env.PORT || 3001
    const url = `http://localhost:${port}/uploads/${req.file.filename}`

    res.status(201).json({
      code: 201,
      message: 'success',
      data: {
        url,
        filename: req.file.filename,
      },
    })
  } catch (error) {
    // 清理已上传的文件
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path)
    }
    next(error)
  }
}

module.exports = {
  uploadImage,
}
