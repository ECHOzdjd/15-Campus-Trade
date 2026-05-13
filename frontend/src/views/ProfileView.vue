<template>
  <div class="profile-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div v-loading="loading" class="page-content">
          <!-- 用户信息卡片 -->
          <el-card class="user-card">
            <div class="user-header">
              <el-avatar :size="80" :src="userStore.userInfo?.avatar">
                {{ userStore.userInfo?.username?.charAt(0) || 'U' }}
              </el-avatar>
              <div class="user-info">
                <h2 class="username">{{ userStore.userInfo?.username || '未知用户' }}</h2>
                <p class="user-email">{{ userStore.userInfo?.email || '' }}</p>
              </div>
            </div>
          </el-card>

          <!-- Tab 切换 -->
          <el-card class="content-card">
            <el-tabs v-model="activeTab">
              <!-- 我的商品 -->
              <el-tab-pane label="我的商品" name="products">
                <div v-loading="productsLoading" class="tab-content">
                  <div v-if="myProducts.length > 0" class="card-grid">
                    <ProductCard
                      v-for="product in myProducts"
                      :key="product.id"
                      :product="product"
                      :show-actions="true"
                      @edit="handleEditProduct"
                      @delete="handleDeleteProduct"
                    />
                  </div>
                  <div v-else class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-text">暂无商品</div>
                    <el-button type="primary" @click="$router.push('/publish')">
                      发布商品
                    </el-button>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 我的订单 -->
              <el-tab-pane label="我的订单" name="orders">
                <div v-loading="ordersLoading" class="tab-content">
                  <div v-if="myOrders.length > 0" class="order-list">
                    <el-card
                      v-for="order in myOrders"
                      :key="order.id"
                      class="order-item"
                      @click="$router.push(`/orders/${order.id}`)"
                    >
                      <div class="order-header">
                        <span class="order-id">订单号：{{ order.id }}</span>
                        <el-tag :type="getOrderStatusType(order.status)">
                          {{ getOrderStatusText(order.status) }}
                        </el-tag>
                      </div>
                      <div class="order-content">
                        <img
                          :src="order.product?.images?.[0]"
                          :alt="order.product?.title"
                          class="order-image"
                        />
                        <div class="order-info">
                          <div class="order-title">{{ order.product?.title }}</div>
                          <div class="order-price">¥{{ order.product?.price }}</div>
                        </div>
                      </div>
                      <div class="order-footer">
                        <span class="order-time">{{ formatDate(order.createdAt) }}</span>
                      </div>
                    </el-card>
                  </div>
                  <div v-else class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">暂无订单</div>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 账户设置 -->
              <el-tab-pane label="账户设置" name="settings">
                <div class="tab-content">
                  <el-form
                    ref="passwordFormRef"
                    :model="passwordForm"
                    :rules="passwordRules"
                    label-width="100px"
                    class="password-form"
                  >
                    <el-form-item label="旧密码" prop="oldPassword">
                      <el-input
                        v-model="passwordForm.oldPassword"
                        type="password"
                        placeholder="请输入旧密码"
                        show-password
                      />
                    </el-form-item>

                    <el-form-item label="新密码" prop="newPassword">
                      <el-input
                        v-model="passwordForm.newPassword"
                        type="password"
                        placeholder="请输入新密码（至少6位）"
                        show-password
                      />
                    </el-form-item>

                    <el-form-item label="确认密码" prop="confirmPassword">
                      <el-input
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        placeholder="请再次输入新密码"
                        show-password
                      />
                    </el-form-item>

                    <el-form-item>
                      <el-button
                        type="primary"
                        :loading="passwordLoading"
                        @click="handleUpdatePassword"
                      >
                        修改密码
                      </el-button>
                    </el-form-item>
                  </el-form>

                  <el-divider />

                  <el-button type="danger" @click="handleLogout">退出登录</el-button>
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { products, orders, auth } from '../api/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const productsLoading = ref(false)
const ordersLoading = ref(false)
const passwordLoading = ref(false)

const activeTab = ref('products')
const myProducts = ref([])
const myOrders = ref([])

// 密码表单
const passwordFormRef = ref(null)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 获取我的商品
const fetchMyProducts = async () => {
  productsLoading.value = true
  try {
    const res = await products.getMine()
    myProducts.value = res.data.products || res.data || []
  } catch (error) {
    console.error('获取我的商品失败:', error)
    ElMessage.error(error.message || '获取我的商品失败')
  } finally {
    productsLoading.value = false
  }
}

// 获取我的订单
const fetchMyOrders = async () => {
  ordersLoading.value = true
  try {
    const res = await orders.getList()
    myOrders.value = res.data.orders || res.data || []
  } catch (error) {
    console.error('获取我的订单失败:', error)
    ElMessage.error(error.message || '获取我的订单失败')
  } finally {
    ordersLoading.value = false
  }
}

// 编辑商品
const handleEditProduct = (product) => {
  router.push(`/product/${product.id}/edit`)
}

// 删除商品
const handleDeleteProduct = async (product) => {
  try {
    await ElMessageBox.confirm(
      `确认删除《${product.title}》吗？`,
      '确认删除',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await products.remove(product.id)
    ElMessage.success('删除成功')
    fetchMyProducts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 修改密码
const handleUpdatePassword = async () => {
  try {
    await passwordFormRef.value.validate()

    passwordLoading.value = true
    await auth.updatePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })

    ElMessage.success('密码修改成功，请重新登录')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''

    setTimeout(() => {
      userStore.clearToken()
      router.push('/login')
    }, 1500)
  } catch (error) {
    if (error !== false) {
      console.error('修改密码失败:', error)
      ElMessage.error(error.message || '修改密码失败')
    }
  } finally {
    passwordLoading.value = false
  }
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确认退出登录吗？', '提示', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    userStore.clearToken()
    ElMessage.success('已退出登录')
    router.push('/')
  } catch (error) {
    // 用户取消
  }
}

// 订单状态类型
const getOrderStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

// 订单状态文本
const getOrderStatusText = (status) => {
  const textMap = {
    pending: '待确认',
    confirmed: '已确认',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 初始化
onMounted(async () => {
  loading.value = true
  try {
    if (!userStore.userInfo) {
      await userStore.fetchUserInfo()
    }
    await Promise.all([fetchMyProducts(), fetchMyOrders()])
  } catch (error) {
    console.error('初始化失败:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.user-card {
  margin-bottom: var(--spacing-xl);
}

.user-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.user-info {
  flex: 1;
}

.username {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.user-email {
  font-size: var(--font-size-base);
  color: var(--text-tertiary);
  margin: 0;
}

.content-card {
  min-height: 500px;
}

.tab-content {
  padding: var(--spacing-lg) 0;
  min-height: 400px;
}

/* 订单列表 */
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-item {
  cursor: pointer;
  transition: all var(--transition-base);
}

.order-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-subtle);
}

.order-id {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.order-content {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.order-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background-color: var(--bg-secondary);
}

.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.order-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.order-price {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-indigo);
}

.order-footer {
  display: flex;
  justify-content: flex-end;
}

.order-time {
  font-size: var(--font-size-xs);
  color: var(--text-quaternary);
}

/* 密码表单 */
.password-form {
  max-width: 500px;
}

/* 响应式 */
@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    text-align: center;
  }

  .password-form {
    max-width: 100%;
  }
}
</style>
