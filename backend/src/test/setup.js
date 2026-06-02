// Jest setup file - 支持 CI 环境变量
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key'
process.env.DB_HOST = process.env.DB_HOST || 'localhost'
process.env.DB_PORT = process.env.DB_PORT || '3306'
process.env.DB_USER = process.env.DB_USER || 'root'
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '1234'
process.env.DB_NAME = process.env.DB_NAME || 'campus_trade'
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent'
