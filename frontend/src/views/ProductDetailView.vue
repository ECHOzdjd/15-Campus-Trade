<template>
  <div class="product-detail-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div v-loading="loading">
            <div v-if="product" class="detail-container">
              <div class="image-section">
                <div class="main-image">
                  <img :src="currentImage || defaultImage" :alt="product.title" />
                </div>
                <div v-if="displayImages.length > 1" class="thumbnail-list">
                  <button
                    v-for="(image, index) in displayImages"
                    :key="image"
                    class="thumbnail-item"
                    :class="{ active: currentImage === image }"
                    type="button"
                    @click="currentImage = image"
                  >
                    <img :src="image" :alt="`${product.title} ${index + 1}`" />
                  </button>
                </div>
              </div>

              <div class="info-section">
                <div class="product-header">
                  <h1 class="product-title">{{ product.title }}</h1>
                  <div class="product-status">
                    <el-tag v-if="product.status === 'available'" type="success">在售</el-tag>
                    <el-tag v-else type="info">已售出</el-tag>
                    <el-tag v-if="product.category">{{ product.category }}</el-tag>
                  </div>
                </div>

                <div class="product-price">
                  <span class="price-label">价格</span>
                  <span class="price-value">
                    <span class="price-symbol">￥</span>
                    {{ product.price }}
                  </span>
                </div>

                <div class="product-description">
                  <h3 class="section-title">商品描述</h3>
                  <p class="description-text">{{ product.description || '暂无描述' }}</p>
                </div>

                <div class="seller-card">
                  <h3 class="section-title">卖家信息</h3>
                  <div class="seller-info">
                    <el-avatar :size="48" :src="product.seller?.avatar">
                      {{ product.seller?.username?.charAt(0) || 'U' }}
                    </el-avatar>
                    <div class="seller-details">
                      <div class="seller-name">{{ product.seller?.username || '匿名用户' }}</div>
                      <div class="seller-meta">
                        <span>发布于 {{ formatDate(product.createdAt) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="action-buttons">
                  <template v-if="isOwner">
                    <el-button type="primary" @click="handleEdit">
                      <el-icon><Edit /></el-icon>
                      编辑商品
                    </el-button>
                    <el-button type="danger" @click="handleDelete">
                      <el-icon><Delete /></el-icon>
                      删除商品
                    </el-button>
                  </template>
                  <template v-else>
                    <el-button
                      size="large"
                      :disabled="product.status !== 'available'"
                      @click="handleContactSeller"
                    >
                      <el-icon><ChatLineRound /></el-icon>
                      联系卖家
                    </el-button>
                    <el-button
                      size="large"
                      :loading="favoriteLoading"
                      @click="handleToggleFavorite"
                    >
                      <el-icon><Star /></el-icon>
                      {{ isFavorited ? '取消收藏' : '收藏' }}
                    </el-button>
                    <el-button
                      type="primary"
                      size="large"
                      class="buy-button"
                      :disabled="product.status !== 'available'"
                      :loading="buyLoading"
                      @click="handleBuy"
                    >
                      <el-icon><ShoppingCart /></el-icon>
                      {{ product.status === 'available' ? '立即购买' : '已售出' }}
                    </el-button>
                  </template>
                </div>

                <div v-if="!isOwner" class="trade-hint">
                  下单后请先付款到平台托管，再与卖家约定校园面交。双方确认面交完成后，平台会把托管金额放款给卖家。
                </div>
              </div>
            </div>

            <div v-else-if="!loading" class="empty-state">
              <div class="empty-state-icon">暂无</div>
              <div class="empty-state-text">商品不存在</div>
              <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatLineRound, Delete, Edit, ShoppingCart, Star } from '@element-plus/icons-vue'
import { conversations, favorites, orders, products } from '../api/index.js'
import { useUserStore } from '../stores/user.js'
import { resolveAssetUrl } from '../utils/url.js'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const product = ref(null)
const currentImage = ref('')
const isFavorited = ref(false)
const favoriteLoading = ref(false)
const buyLoading = ref(false)
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23191a1b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="42" fill="%238a8f98"%3ENo Image%3C/text%3E%3C/svg%3E'

const displayImages = computed(() => {
  return (product.value?.images || [])
    .map((image) => resolveAssetUrl(image))
    .filter(Boolean)
})

const isOwner = computed(() => {
  return userStore.userInfo && product.value &&
    userStore.userInfo.id === product.value.seller?.id
})

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const fetchFavoriteStatus = async () => {
  if (!userStore.token || !product.value || isOwner.value) {
    isFavorited.value = false
    return
  }

  try {
    const res = await favorites.check(product.value.id)
    isFavorited.value = Boolean(res.data.favorited)
  } catch (error) {
    console.error('获取收藏状态失败:', error)
  }
}

const fetchProductDetail = async () => {
  loading.value = true
  try {
    const res = await products.getDetail(route.params.id)
    product.value = res.data
    currentImage.value = displayImages.value[0] || ''
    await fetchFavoriteStatus()
  } catch (error) {
    console.error('获取商品详情失败:', error)
    ElMessage.error(error.message || '获取商品详情失败')
  } finally {
    loading.value = false
  }
}

const handleBuy = async () => {
  if (buyLoading.value) return

  if (!userStore.token) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  buyLoading.value = true
  try {
    await ElMessageBox.confirm(
      `确认购买《${product.value.title}》吗？下单后请先付款到平台托管，再与卖家约定校园面交。`,
      '确认校园交易',
      {
        confirmButtonText: '确认下单',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const res = await orders.create({ productId: product.value.id })
    ElMessage.success('订单已创建，请先完成托管付款')
    router.push(`/orders/${res.data.id}`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('购买失败:', error)
      ElMessage.error(error.message || '购买失败')
    }
  } finally {
    buyLoading.value = false
  }
}

const handleContactSeller = async () => {
  if (!userStore.token) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  try {
    const res = await conversations.create({ productId: product.value.id })
    router.push(`/messages/${res.data.id}`)
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error(error.message || '联系卖家失败')
  }
}

const handleToggleFavorite = async () => {
  if (!userStore.token) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  favoriteLoading.value = true
  try {
    if (isFavorited.value) {
      await favorites.remove(product.value.id)
      isFavorited.value = false
      ElMessage.success('已取消收藏')
    } else {
      await favorites.add(product.value.id)
      isFavorited.value = true
      ElMessage.success('已加入收藏')
    }
  } catch (error) {
    console.error('更新收藏失败:', error)
    ElMessage.error(error.message || '收藏操作失败')
  } finally {
    favoriteLoading.value = false
  }
}

const handleEdit = () => {
  router.push(`/product/${product.value.id}/edit`)
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '确认删除该商品吗？此操作不可恢复。',
      '确认删除',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await products.remove(product.value.id)
    ElMessage.success('删除成功')
    router.push('/my-products')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
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
  fetchProductDetail()
})
</script>

<style scoped>
.product-detail-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.detail-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
}

.image-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.main-image {
  width: 100%;
  aspect-ratio: 1;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-list {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
}

.thumbnail-item {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  padding: 0;
  background-color: var(--bg-surface);
  border: 2px solid var(--border-standard);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.thumbnail-item:hover {
  border-color: var(--border-strong);
}

.thumbnail-item.active {
  border-color: var(--brand-indigo);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.product-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.product-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.product-status {
  display: flex;
  gap: var(--spacing-sm);
}

.product-price {
  padding: var(--spacing-lg);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md);
}

.price-label {
  font-size: var(--font-size-base);
  color: var(--text-tertiary);
}

.price-value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--brand-indigo);
}

.price-symbol {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
}

.product-description,
.seller-card {
  padding: var(--spacing-lg);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md);
}

.description-text {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}

.seller-info {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.seller-details {
  flex: 1;
}

.seller-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.seller-meta {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-standard);
  flex-wrap: wrap;
}

.buy-button {
  flex: 1;
  height: 48px;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
}

.trade-hint {
  padding: var(--spacing-md);
  background-color: #f6f7ff;
  border: 1px solid rgba(94, 106, 210, 0.18);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .detail-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }

  .product-title,
  .price-value {
    font-size: var(--font-size-2xl);
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
