const express = require('express')
const multer = require('multer')
const path = require('path')
const uploadController = require('../controllers/uploadController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: (req, file, cb) => {
    // 生成唯一的文件名：时间戳 + 原始文件名
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    cb(null, `product_${timestamp}${ext}`)
  },
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedTypes.test(ext) && allowedTypes.test(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件格式'), false)
  }
}

// 创建 multer 实例
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// 上传图片（需要认证）
router.post('/image', authMiddleware, upload.single('file'), uploadController.uploadImage)

module.exports = router

