import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
})

// 生成 CSRF token（用于 POST/PUT/DELETE 请求）
function generateCsrfToken() {
  if (!sessionStorage.getItem('_csrf_token')) {
    // 生成一个伪随机 token
    const token = 'csrf_' + Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('_csrf_token', token)
  }
  return sessionStorage.getItem('_csrf_token')
}

// 请求拦截器：自动附加 JWT Token 和 CSRF 保护
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 为 POST、PUT、DELETE 请求添加 CSRF token
    if (['post', 'put', 'delete'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRF-Token'] = generateCsrfToken()
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一处理错误
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('_csrf_token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default request

