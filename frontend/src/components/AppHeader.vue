<template>
  <header class="app-header">
    <div class="header-container">
      <!-- 左侧：Logo + 平台名称 -->
      <div class="header-left">
        <router-link to="/" class="logo-link">
          <div class="logo">🎓</div>
          <span class="platform-name">校园二手交易</span>
        </router-link>
      </div>

      <!-- 中间：搜索框 -->
      <div class="header-center">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索商品..."
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 右侧：用户菜单 -->
      <div class="header-right">
        <template v-if="userStore.token">
          <!-- 发布按钮 -->
          <el-button type="primary" @click="goToPublish" class="publish-btn">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">发布商品</span>
          </el-button>

          <!-- 用户下拉菜单 -->
          <el-dropdown @command="handleCommand" trigger="click">
            <div class="user-avatar">
              <el-avatar :size="36" :src="userStore.userInfo?.avatar">
                {{ userStore.userInfo?.username?.charAt(0) || 'U' }}
              </el-avatar>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="my-products">
                  <el-icon><Box /></el-icon>
                  我的商品
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><Document /></el-icon>
                  我的订单
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <template v-else>
          <el-button @click="goToLogin" class="login-btn">登录/注册</el-button>
        </template>
      </div>

      <!-- 移动端搜索图标 -->
      <div class="header-mobile-search">
        <el-icon @click="showMobileSearch = true" :size="20"><Search /></el-icon>
      </div>
    </div>

    <!-- 移动端搜索弹窗 -->
    <el-dialog
      v-model="showMobileSearch"
      title="搜索商品"
      width="90%"
      :show-close="true"
    >
      <el-input
        v-model="searchKeyword"
        placeholder="搜索商品..."
        clearable
        @keyup.enter="handleMobileSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <template #footer>
        <el-button @click="showMobileSearch = false">取消</el-button>
        <el-button type="primary" @click="handleMobileSearch">搜索</el-button>
      </template>
    </el-dialog>
  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { ElMessage } from 'element-plus'
import { Search, Plus, User, Box, Document, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const showMobileSearch = ref(false)

// 获取用户信息
onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }
})

// 搜索处理
const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push({
      path: '/',
      query: { search: searchKeyword.value.trim() }
    })
  }
}

// 移动端搜索处理
const handleMobileSearch = () => {
  showMobileSearch.value = false
  handleSearch()
}

// 跳转到发布页面
const goToPublish = () => {
  router.push('/publish')
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/login')
}

// 下拉菜单命令处理
const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'my-products':
      router.push('/my-products')
      break
    case 'orders':
      router.push('/orders')
      break
    case 'logout':
      userStore.clearToken()
      ElMessage.success('已退出登录')
      router.push('/')
      break
  }
}
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
  z-index: var(--z-fixed);
  backdrop-filter: blur(8px);
}

.header-container {
  max-width: 1400px;
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

/* 左侧 Logo */
.header-left {
  flex-shrink: 0;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.logo-link:hover {
  opacity: 0.8;
}

.logo {
  font-size: 28px;
  line-height: 1;
}

.platform-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
}

/* 中间搜索框 */
.header-center {
  flex: 1;
  max-width: 500px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

/* 右侧用户菜单 */
.header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.publish-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.user-avatar {
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.user-avatar:hover {
  opacity: 0.8;
}

.login-btn {
  white-space: nowrap;
}

/* 移动端搜索图标 */
.header-mobile-search {
  display: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.header-mobile-search:hover {
  color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-container {
    padding: 0 var(--spacing-md);
    gap: var(--spacing-md);
  }

  .platform-name {
    display: none;
  }

  .header-center {
    display: none;
  }

  .header-mobile-search {
    display: block;
  }

  .publish-btn .btn-text {
    display: none;
  }

  .publish-btn {
    padding: 8px 12px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .header-center {
    max-width: 400px;
  }
}
</style>
