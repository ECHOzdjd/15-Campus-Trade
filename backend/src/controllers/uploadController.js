const path = require('path')
const fs = require('fs')

// 确保上传文件夹存在
const uploadsDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// 安全的文件名生成函数
function generateSafeFilename(originalName, timestamp) {
  // 提取文件扩展名
  const ext = path.extname(originalName).toLowerCase()
  
  // 验证扩展名，防止上传恶意文件
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif']
  if (!allowedExts.includes(ext)) {
    throw new Error('不支持的文件格式')
  }
  
  // 生成安全的文件名：product_<timestamp>_<random>.ext
  // 这样可以防止路径遍历攻击（../../等）
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  return `product_${timestamp}_${randomSuffix}${ext}`
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

    // 验证上传的文件路径是否在允许的目录内
    const uploadedFilePath = path.resolve(req.file.path)
    const allowedDir = path.resolve(uploadsDir)
    
    if (!uploadedFilePath.startsWith(allowedDir)) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        code: 400,
        message: '文件上传位置不合法',
        data: null,
      })
    }

    // 返回文件 URL（使用相对路径，避免硬编码 localhost）
    // 前端应该根据当前域名构建完整的 URL
    const fileName = path.basename(req.file.path)
    const url = `/uploads/${fileName}`

    res.status(201).json({
      code: 201,
      message: 'success',
      data: {
        url,
        filename: fileName,
      },
    })
  } catch (error) {
    // 清理已上传的文件
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError)
      }
    }
    next(error)
  }
}

module.exports = {
  uploadImage,
  generateSafeFilename,
}

