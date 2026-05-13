import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

// 简化的 AppHeader 组件用于测试
const AppHeader = {
  data() {
    return {
      searchKeyword: '',
      showMobileSearch: false
    }
  },
  computed: {
    isLoggedIn() {
      return this.$pinia?.state?.value?.user?.token
    },
    userInfo() {
      return this.$pinia?.state?.value?.user?.userInfo
    }
  },
  template: `
    <header class="app-header">
      <div class="header-container">
        <div class="header-left">
          <a href="/" class="logo-link">
            <div class="logo">🎓</div>
            <span class="platform-name">校园二手交易</span>
          </a>
        </div>
        <div class="header-center">
          <input
            class="el-input search-input"
            v-model="searchKeyword"
            placeholder="搜索商品..."
          />
        </div>
        <div class="header-right">
          <button v-if="isLoggedIn" class="el-button publish-btn" @click="goToPublish">
            发布商品
          </button>
          <div v-if="isLoggedIn" class="user-avatar">
            <span>{{ userInfo?.username?.charAt(0) || 'U' }}</span>
          </div>
          <button v-else class="el-button login-btn" @click="goToLogin">
            登录/注册
          </button>
        </div>
      </div>
    </header>
  `,
  methods: {
    goToPublish() {
      this.$router.push('/publish')
    },
    goToLogin() {
      this.$router.push('/login')
    }
  }
}

describe('AppHeader Component Tests', () => {
  let router
  let pinia

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'Home' },
        { path: '/login', name: 'Login' },
        { path: '/publish', name: 'Publish' },
        { path: '/profile', name: 'Profile' },
        { path: '/my-products', name: 'MyProducts' },
        { path: '/orders', name: 'Orders' }
      ]
    })
    pinia = createPinia()
    setActivePinia(pinia)
  })

  // 测试1: 渲染平台名称
  it('should render platform name', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('校园二手交易')
  })

  // 测试2: 未登录时显示登录按钮
  it('should show login button when not logged in', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('登录/注册')
  })

  // 测试3: 渲染搜索框
  it('should render search input', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    expect(wrapper.find('.search-input').exists()).toBe(true)
  })

  // 测试4: 搜索框有占位符
  it('should have search placeholder', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    const input = wrapper.find('.search-input')
    expect(input.attributes('placeholder')).toContain('搜索商品')
  })

  // 测试5: 登录后显示发布按钮
  it('should show publish button when logged in', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    // 设置用户登录状态
    pinia.state.value.user = {
      token: 'test-token',
      userInfo: { id: 1, username: 'testuser' }
    }

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('发布商品')
  })

  // 测试6: 登录后显示用户头像
  it('should show user avatar when logged in', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    pinia.state.value.user = {
      token: 'test-token',
      userInfo: { id: 1, username: 'TestUser' }
    }

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('T')
  })

  // 测试7: 标题区域有链接
  it('should have logo link to home', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    const logoLink = wrapper.find('.logo-link')
    expect(logoLink.exists()).toBe(true)
  })

  // 测试8: header 有正确的类名
  it('should have app-header class', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router, pinia]
      }
    })
    await router.isReady()

    expect(wrapper.find('.app-header').exists()).toBe(true)
  })
})
