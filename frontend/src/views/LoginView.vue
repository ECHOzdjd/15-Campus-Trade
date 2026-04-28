<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-logo">🎓</div>
          <h1 class="brand-title">校园二手交易平台</h1>
          <p class="brand-slogan">让闲置物品流动起来，让校园生活更美好</p>
          <div class="brand-features">
            <div class="feature-item">
              <el-icon><Check /></el-icon>
              <span>安全可靠</span>
            </div>
            <div class="feature-item">
              <el-icon><Check /></el-icon>
              <span>便捷交易</span>
            </div>
            <div class="feature-item">
              <el-icon><Check /></el-icon>
              <span>校园专属</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="form-section">
        <el-card class="form-card">
          <el-tabs v-model="activeTab" class="login-tabs">
            <!-- 登录表单 -->
            <el-tab-pane label="登录" name="login">
              <el-form
                ref="loginFormRef"
                :model="loginForm"
                :rules="loginRules"
                label-position="top"
                size="large"
              >
                <el-form-item label="用户名或邮箱" prop="username">
                  <el-input
                    v-model="loginForm.username"
                    placeholder="请输入用户名或邮箱"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><User /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="密码" prop="password">
                  <el-input
                    v-model="loginForm.password"
                    type="password"
                    placeholder="请输入密码"
                    show-password
                    @keyup.enter="handleLogin"
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item>
                  <div class="form-footer">
                    <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
                    <el-link type="primary" :underline="false">忘记密码？</el-link>
                  </div>
                </el-form-item>

                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="loginLoading"
                    @click="handleLogin"
                    class="submit-btn"
                  >
                    登录
                  </el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <!-- 注册表单 -->
            <el-tab-pane label="注册" name="register">
              <el-form
                ref="registerFormRef"
                :model="registerForm"
                :rules="registerRules"
                label-position="top"
                size="large"
              >
                <el-form-item label="用户名" prop="username">
                  <el-input
                    v-model="registerForm.username"
                    placeholder="请输入用户名"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><User /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="邮箱" prop="email">
                  <el-input
                    v-model="registerForm.email"
                    placeholder="请输入邮箱"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Message /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="密码" prop="password">
                  <el-input
                    v-model="registerForm.password"
                    type="password"
                    placeholder="请输入密码（至少6位）"
                    show-password
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="registerForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    show-password
                    @keyup.enter="handleRegister"
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="registerLoading"
                    @click="handleRegister"
                    class="submit-btn"
                  >
                    注册
                  </el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { auth } from '../api/index.js'
import { ElMessage } from 'element-plus'
import { User, Lock, Message, Check } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')
const loginLoading = ref(false)
const registerLoading = ref(false)

// 登录表单
const loginFormRef = ref(null)
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

// 注册表单
const registerFormRef = ref(null)
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在2-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    loginLoading.value = true
    try {
      const res = await auth.login({
        username: loginForm.username,
        password: loginForm.password
      })

      if (res.code === 200) {
        userStore.setToken(res.data.token)
        ElMessage.success('登录成功')

        // 跳转到来源页面或首页
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      } else {
        ElMessage.error(res.message || '登录失败')
      }
    } catch (error) {
      ElMessage.error(error.message || '登录失败，请重试')
    } finally {
      loginLoading.value = false
    }
  })
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (!valid) return

    registerLoading.value = true
    try {
      const res = await auth.register({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password
      })

      if (res.code === 200) {
        ElMessage.success('注册成功，请登录')
        activeTab.value = 'login'
        loginForm.username = registerForm.username
      } else {
        ElMessage.error(res.message || '注册失败')
      }
    } catch (error) {
      ElMessage.error(error.message || '注册失败，请重试')
    } finally {
      registerLoading.value = false
    }
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  padding: var(--spacing-lg);
}

.login-container {
  width: 100%;
  max-width: 1000px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: center;
}

/* 左侧品牌区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-content {
  text-align: center;
}

.brand-logo {
  font-size: 80px;
  margin-bottom: var(--spacing-lg);
}

.brand-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.brand-slogan {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
  line-height: 1.6;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  align-items: center;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.feature-item .el-icon {
  color: var(--success);
  font-size: 20px;
}

/* 右侧表单区域 */
.form-section {
  width: 100%;
}

.form-card {
  padding: var(--spacing-xl);
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: var(--spacing-xl);
}

.login-tabs :deep(.el-tabs__item) {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
}

.form-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
}

/* 响应式 */
@media (max-width: 768px) {
  .login-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }

  .brand-section {
    display: none;
  }

  .form-card {
    padding: var(--spacing-lg);
  }

  .brand-logo {
    font-size: 60px;
  }

  .brand-title {
    font-size: var(--font-size-2xl);
  }

  .brand-slogan {
    font-size: var(--font-size-base);
  }
}
</style>
