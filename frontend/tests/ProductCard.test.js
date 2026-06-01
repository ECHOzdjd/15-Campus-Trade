import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

// 简单的 ProductCard 组件（用于测试）
const ProductCard = {
  props: ['product', 'showActions'],
  emits: ['edit', 'delete'],
  template: `
    <div class="product-card" @click="goToDetail">
      <h3 class="product-title">{{ product.title }}</h3>
      <div class="product-price">
        <span>¥</span><span class="price-value">{{ product.price }}</span>
      </div>
      <div class="product-tags">
        <span v-if="product.status === 'available'" class="el-tag">在售</span>
        <span v-else class="el-tag">已售出</span>
        <span v-if="product.category" class="el-tag">{{ product.category }}</span>
      </div>
      <div class="seller-info">
        <span class="seller-name">{{ product.seller?.username || '匿名用户' }}</span>
      </div>
      <div v-if="showActions" class="product-actions">
        <button class="el-button" @click.stop="$emit('edit', product)">编辑</button>
        <button class="el-button" @click.stop="$emit('delete', product)">删除</button>
      </div>
    </div>
  `,
  methods: {
    goToDetail() {
      this.$router.push('/product/' + this.product.id)
    }
  }
}

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: { template: '<div />' } },
    { path: '/product/:id', name: 'ProductDetail', component: { template: '<div />' } }
  ]
})

describe('ProductCard Component Tests', () => {
  let mockProduct

  beforeEach(() => {
    mockProduct = {
      id: 1,
      title: '测试商品',
      price: 99.99,
      status: 'available',
      category: '电子产品',
      images: ['https://example.com/image.jpg'],
      seller: { id: 1, username: '卖家用户', avatar: null },
      createdAt: new Date().toISOString()
    }
  })

  // 测试1: 渲染商品标题
  it('should render product title', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('测试商品')
  })

  // 测试2: 渲染商品价格
  it('should render product price', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('99.99')
  })

  // 测试3: 显示在售状态标签
  it('should show available status tag', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('在售')
  })

  // 测试4: 显示已售出状态
  it('should show sold status', async () => {
    mockProduct.status = 'sold'
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('已售出')
  })

  // 测试5: 显示分类标签
  it('should show category tag', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('电子产品')
  })

  // 测试6: 显示卖家名称
  it('should show seller name', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.text()).toContain('卖家用户')
  })

  // 测试7: showActions 为 false 时不显示操作按钮
  it('should not show action buttons by default', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.find('.product-actions').exists()).toBe(false)
  })

  // 测试8: showActions 为 true 时显示操作按钮
  it('should show action buttons when showActions is true', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct, showActions: true },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    expect(wrapper.find('.product-actions').exists()).toBe(true)
    expect(wrapper.text()).toContain('编辑')
    expect(wrapper.text()).toContain('删除')
  })

  // 测试9: 点击编辑按钮触发 edit 事件
  it('should emit edit event when edit button clicked', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct, showActions: true },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    const buttons = wrapper.findAll('.el-button')
    await buttons[0].trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')[0]).toEqual([mockProduct])
  })

  // 测试10: 点击删除按钮触发 delete 事件
  it('should emit delete event when delete button clicked', async () => {
    const wrapper = mount(ProductCard, {
      props: { product: mockProduct, showActions: true },
      global: {
        plugins: [router]
      }
    })
    await router.isReady()

    const buttons = wrapper.findAll('.el-button')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')[0]).toEqual([mockProduct])
  })
})
