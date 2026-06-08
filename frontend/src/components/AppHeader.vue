<template>
  <header class="app-header">
    <div class="header-container">
      <div class="header-left">
        <router-link to="/" class="logo-link">
          <div class="logo">🎓</div>
          <span class="platform-name">校园二手交易</span>
        </router-link>
      </div>

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

      <div class="header-right">
        <template v-if="userStore.token">
          <el-button type="primary" class="publish-btn" @click="goToPublish">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">发布商品</span>
          </el-button>

          <el-dropdown trigger="click" @command="handleCommand">
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
                <el-dropdown-item command="favorites">
                  <el-icon><Star /></el-icon>
                  我的收藏
                </el-dropdown-item>
                <el-dropdown-item command="messages">
                  <el-icon><Message /></el-icon>
                  <el-badge v-if="unreadMessageCount" :value="unreadMessageCount" class="menu-badge">
                    <span>我的消息</span>
                  </el-badge>
                  <span v-else>我的消息</span>
                </el-dropdown-item>
                <el-dropdown-item command="wallet">
                  <el-icon><Wallet /></el-icon>
                  钱包
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><Document /></el-icon>
                  我的订单
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="userStore.userInfo?.role === 'admin'"
                  command="admin"
                  @click.stop="goToAdmin"
                >
                  <el-icon><Setting /></el-icon>
                  管理后台
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
          <el-button class="login-btn" @click="goToLogin">登录/注册</el-button>
        </template>
      </div>

      <div class="header-mobile-search">
        <el-icon :size="20" @click="showMobileSearch = true"><Search /></el-icon>
      </div>
    </div>

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
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Box, Document, Message, Plus, Search, Setting, Star, SwitchButton, User, Wallet } from '@element-plus/icons-vue'
import { conversations } from '../api/index.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const showMobileSearch = ref(false)
const unreadMessageCount = ref(0)

const fetchUnreadMessageCount = async () => {
  if (!userStore.token) return

  try {
    const res = await conversations.getList()
    unreadMessageCount.value = (res.data.conversations || [])
      .reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0)
  } catch (error) {
    console.error('获取未读消息数量失败:', error)
  }
}

onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }
  await fetchUnreadMessageCount()
})

const handleSearch = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  router.push({
    path: '/',
    query: { search: keyword },
  })
}

const handleMobileSearch = () => {
  showMobileSearch.value = false
  handleSearch()
}

const goToPublish = () => {
  router.push('/publish')
}

const goToLogin = () => {
  router.push('/login')
}

const goToAdmin = () => {
  router.push('/admin')
}

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'my-products':
      router.push('/my-products')
      break
    case 'favorites':
      router.push('/favorites')
      break
    case 'messages':
      router.push('/messages')
      break
    case 'wallet':
      router.push('/wallet')
      break
    case 'orders':
      router.push('/orders')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      userStore.clearToken()
      unreadMessageCount.value = 0
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

.menu-badge {
  line-height: 1;
}

.login-btn {
  white-space: nowrap;
}

.header-mobile-search {
  display: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.header-mobile-search:hover {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .header-container {
    padding: 0 var(--spacing-md);
    gap: var(--spacing-md);
  }

  .platform-name,
  .header-center,
  .publish-btn .btn-text {
    display: none;
  }

  .header-mobile-search {
    display: block;
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
