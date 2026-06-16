// Jest setup file - align local defaults with CI
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key'
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1'
process.env.DB_PORT = process.env.DB_PORT || '3306'
process.env.DB_USER = process.env.DB_USER || 'root'
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password'
process.env.DB_NAME = process.env.DB_NAME || 'campus_trade_test'
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent'
process.env.ARK_API_KEY = ''
