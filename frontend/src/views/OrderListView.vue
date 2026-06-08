<template>
  <div class="orders-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div class="page-head">
            <div>
              <h1>我的订单</h1>
              <p>订单记录平台托管、校园面交和放款进度。</p>
            </div>
          </div>

          <div class="filters">
            <el-radio-group v-model="filters.role" @change="fetchOrders">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="buyer">我买到的</el-radio-button>
              <el-radio-button label="seller">我卖出的</el-radio-button>
            </el-radio-group>

            <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchOrders">
              <el-option label="待付款" value="pending_payment" />
              <el-option label="已托管" value="paid_escrow" />
              <el-option label="面交确认中" value="meeting_confirmed" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
              <el-option label="争议中" value="disputed" />
              <el-option label="已退款" value="refunded" />
            </el-select>
          </div>

          <div v-loading="loading" class="order-list">
            <div v-if="orderList.length" class="orders">
              <div
                v-for="order in orderList"
                :key="order?.id"
                class="order-row"
                @click="goOrderDetail(order)"
              >
                <img :src="resolveAssetUrl(order?.product?.images?.[0]) || defaultImage" :alt="order?.product?.title || '商品已删除'">
                <div class="order-main">
                  <h3>{{ order?.product?.title || '商品已删除' }}</h3>
                  <div class="meta">
                    <span>买家：{{ order?.buyer?.username || '未知用户' }}</span>
                    <span>卖家：{{ order?.seller?.username || '未知用户' }}</span>
                  </div>
                  <div class="time">{{ formatDate(order?.createdAt) }}</div>
                </div>
                <div class="order-side">
                  <div class="price">￥{{ formatMoney(order?.product?.price) }}</div>
                  <el-tag :type="statusType(order?.status)">{{ statusText(order?.status) }}</el-tag>
                </div>
              </div>
            </div>

            <el-empty v-else-if="!loading" description="暂无订单" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orders } from '../api/index.js'
import { resolveAssetUrl } from '../utils/url.js'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const loading = ref(false)
const orderList = ref([])
const filters = reactive({
  role: '',
  status: '',
})
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23191a1b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%238a8f98"%3ENo Image%3C/text%3E%3C/svg%3E'

const statusText = (status) => {
  const map = {
    pending_payment: '待付款',
    paid_escrow: '已托管',
    meeting_confirmed: '面交确认中',
    completed: '已完成',
    cancelled: '已取消',
    disputed: '争议中',
    refunded: '已退款',
  }
  return map[status] || status
}

const statusType = (status) => {
  const map = {
    pending_payment: 'warning',
    paid_escrow: 'primary',
    meeting_confirmed: 'warning',
    completed: 'success',
    cancelled: 'info',
    disputed: 'danger',
    refunded: 'info',
  }
  return map[status] || 'info'
}

const formatMoney = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN')
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await orders.getList({
      role: filters.role || undefined,
      status: filters.status || undefined,
    })
    orderList.value = res.data.orders || []
  } catch (error) {
    console.error('获取订单失败:', error)
    ElMessage.error(error.message || '获取订单失败')
  } finally {
    loading.value = false
  }
}

const goOrderDetail = (order) => {
  if (order?.id) {
    router.push(`/orders/${order.id}`)
  }
}

onMounted(fetchOrders)
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.page-head {
  margin-bottom: var(--spacing-xl);
}

.page-head h1 {
  margin: 0 0 var(--spacing-xs);
}

.page-head p {
  margin: 0;
  color: var(--text-secondary);
}

.filters {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
}

.order-list {
  min-height: 320px;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-row {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: var(--spacing-md);
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.order-row:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.order-row img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.order-main h3 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.meta {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.time {
  margin-top: var(--spacing-sm);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.order-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.price {
  color: var(--brand-indigo);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
  }

  .order-row {
    grid-template-columns: 72px 1fr;
  }

  .order-row img {
    width: 72px;
    height: 72px;
  }

  .order-side {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
