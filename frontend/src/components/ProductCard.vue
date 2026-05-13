<template>
  <el-card class="product-card" :body-style="{ padding: '0' }" @click="goToDetail">
    <!-- 商品图片 -->
    <div class="product-image">
      <img :src="product.images?.[0] || defaultImage" :alt="product.title" />
      <div v-if="product.status === 'sold'" class="sold-overlay">
        <span class="sold-badge">已售出</span>
      </div>
    </div>

    <!-- 商品信息 -->
    <div class="product-info">
      <!-- 标题 -->
      <h3 class="product-title">{{ product.title }}</h3>

      <!-- 价格 -->
      <div class="product-price">
        <span class="price-symbol">¥</span>
        <span class="price-value">{{ product.price }}</span>
      </div>

      <!-- 底部信息 -->
      <div class="product-footer">
        <div class="seller-info">
          <el-avatar :size="20" :src="product.seller?.avatar">
            {{ product.seller?.username?.charAt(0) || 'U' }}
          </el-avatar>
          <span class="seller-name">{{ product.seller?.username || '匿名用户' }}</span>
        </div>
        <span class="publish-time">{{ formatTime(product.createdAt) }}</span>
      </div>

      <!-- 状态标签 -->
      <div class="product-tags">
        <el-tag v-if="product.status === 'available'" type="success" size="small">在售</el-tag>
        <el-tag v-else type="info" size="small">已售出</el-tag>
        <el-tag v-if="product.category" size="small">{{ product.category }}</el-tag>
      </div>
    </div>

    <!-- 操作按钮（可选） -->
    <div v-if="showActions" class="product-actions" @click.stop>
      <el-button size="small" @click="handleEdit">
        <el-icon><Edit /></el-icon>
        编辑
      </el-button>
      <el-button size="small" type="danger" @click="handleDelete">
        <el-icon><Delete /></el-icon>
        删除
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete'])

const router = useRouter()

// 默认图片
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23191a1b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="%238a8f98"%3E暂无图片%3C/text%3E%3C/svg%3E'

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''

  const date = new Date(time)
  const now = new Date()
  const diff = now - date

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
}

// 跳转到详情页
const goToDetail = () => {
  router.push(`/product/${props.product.id}`)
}

// 编辑商品
const handleEdit = () => {
  emit('edit', props.product)
}

// 删除商品
const handleDelete = () => {
  emit('delete', props.product)
}
</script>

<style scoped>
.product-card {
  cursor: pointer;
  transition: all var(--transition-base);
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--border-strong);
}

/* 商品图片 */
.product-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.sold-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sold-badge {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
}

/* 商品信息 */
.product-info {
  padding: var(--spacing-md);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin: 0;
}

.product-price {
  display: flex;
  align-items: baseline;
  color: var(--brand-indigo);
  margin: var(--spacing-xs) 0;
}

.price-symbol {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.price-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin-left: 2px;
}

.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--spacing-sm);
}

.seller-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
  min-width: 0;
}

.seller-name {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-time {
  font-size: var(--font-size-xs);
  color: var(--text-quaternary);
  flex-shrink: 0;
}

.product-tags {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

/* 操作按钮 */
.product-actions {
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--border-standard);
  display: flex;
  gap: var(--spacing-sm);
  background-color: var(--bg-panel);
}

.product-actions .el-button {
  flex: 1;
}

/* 响应式 */
@media (max-width: 768px) {
  .product-title {
    font-size: var(--font-size-sm);
  }

  .price-value {
    font-size: var(--font-size-xl);
  }

  .product-info {
    padding: var(--spacing-sm);
  }
}
</style>
