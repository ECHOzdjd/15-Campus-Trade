<template>
  <div class="order-detail-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div v-loading="loading">
            <div v-if="order" class="detail-layout">
              <section class="main-panel">
                <div class="status-line">
                  <el-tag :type="statusType(order?.status)" size="large">{{ statusText(order?.status) }}</el-tag>
                  <span>订单编号 #{{ order?.id || '-' }}</span>
                </div>

                <div class="product-block">
                  <img :src="resolveAssetUrl(order?.product?.images?.[0]) || defaultImage" :alt="order?.product?.title || '商品已删除'">
                  <div>
                    <h1>{{ order?.product?.title || '商品已删除' }}</h1>
                    <div class="price">￥{{ formatMoney(order?.product?.price) }}</div>
                    <p>{{ order?.product?.description || '暂无描述' }}</p>
                  </div>
                </div>

                <div class="handoff-box">
                  <h3>托管与面交说明</h3>
                  <p>买家先将款项支付到平台托管，再与卖家约定校园面交。双方确认面交完成后，平台会放款给卖家。</p>
                  <el-button type="primary" plain @click="goMessages">去消息页沟通</el-button>
                </div>

                <div v-if="canCreateDispute" class="dispute-box">
                  <h3>发起争议</h3>
                  <el-input
                    v-model="disputeReason"
                    type="textarea"
                    :rows="3"
                    maxlength="300"
                    show-word-limit
                    placeholder="请说明争议原因"
                  />
                  <ImageUploader v-model="disputeEvidenceImages" :max-count="5" />
                  <el-button type="danger" plain :loading="disputeLoading" @click="handleCreateDispute">
                    提交争议
                  </el-button>
                </div>

                <div v-if="latestDispute" class="dispute-box dispute-detail-box">
                  <div class="dispute-title-row">
                    <h3>争议处理</h3>
                    <el-tag :type="disputeStatusType(latestDispute.status)">
                      {{ disputeStatusText(latestDispute.status) }}
                    </el-tag>
                  </div>

                  <div class="dispute-field">
                    <span>争议原因</span>
                    <p>{{ latestDispute.reason }}</p>
                  </div>
                  <div v-if="latestDispute.evidenceImages?.length" class="dispute-field">
                    <span>争议图片</span>
                    <div class="dispute-images">
                      <el-image
                        v-for="image in resolveImageList(latestDispute.evidenceImages)"
                        :key="image"
                        :src="image"
                        :preview-src-list="resolveImageList(latestDispute.evidenceImages)"
                        fit="cover"
                        class="dispute-image"
                      />
                    </div>
                  </div>
                  <div v-if="latestDispute.response" class="dispute-field">
                    <span>补充说明</span>
                    <p>{{ latestDispute.response }}</p>
                  </div>
                  <div v-if="latestDispute.responseImages?.length" class="dispute-field">
                    <span>补充图片</span>
                    <div class="dispute-images">
                      <el-image
                        v-for="image in resolveImageList(latestDispute.responseImages)"
                        :key="image"
                        :src="image"
                        :preview-src-list="resolveImageList(latestDispute.responseImages)"
                        fit="cover"
                        class="dispute-image"
                      />
                    </div>
                  </div>
                  <div v-if="latestDispute.resolutionNote" class="dispute-field">
                    <span>处理说明</span>
                    <p>{{ latestDispute.resolutionNote }}</p>
                  </div>

                  <template v-if="activeDispute">
                    <el-input
                      v-model="disputeResponse"
                      type="textarea"
                      :rows="3"
                      maxlength="300"
                      show-word-limit
                      placeholder="补充说明验货、退款或放款依据"
                    />
                    <ImageUploader v-model="disputeResponseImages" :max-count="5" />
                    <div class="dispute-actions">
                      <el-button :loading="disputeResponseLoading" @click="handleRespondDispute">
                        补充说明
                      </el-button>
                    </div>

                  </template>
                </div>
              </section>

              <aside class="side-panel">
                <h3>交易信息</h3>
                <div class="person">
                  <span>买家</span>
                  <strong>{{ order?.buyer?.username || '未知用户' }}</strong>
                </div>
                <div class="person">
                  <span>卖家</span>
                  <strong>{{ order?.seller?.username || '未知用户' }}</strong>
                </div>
                <div class="person">
                  <span>创建时间</span>
                  <strong>{{ formatDate(order?.createdAt) || '-' }}</strong>
                </div>
                <div v-if="order?.paymentExpiresAt && order?.status === 'pending_payment'" class="person">
                  <span>支付截止</span>
                  <strong>{{ formatDate(order?.paymentExpiresAt) }}</strong>
                </div>
                <div v-if="order?.escrow" class="person">
                  <span>托管金额</span>
                  <strong>￥{{ formatMoney(order?.escrow?.amount) }}</strong>
                </div>
                <div v-if="order?.escrow" class="person">
                  <span>托管状态</span>
                  <strong>{{ escrowText(order?.escrow?.status) }}</strong>
                </div>
                <div v-if="order?.escrow?.paidAt" class="person">
                  <span>付款时间</span>
                  <strong>{{ formatDate(order?.escrow?.paidAt) }}</strong>
                </div>

                <div class="handoff-flags">
                  <div :class="{ done: order?.buyerHandoffConfirmed }">
                    买家收货确认：{{ order?.buyerHandoffConfirmed ? '已确认' : '未确认' }}
                  </div>
                  <div :class="{ done: order?.sellerHandoffConfirmed }">
                    卖家面交确认：{{ order?.sellerHandoffConfirmed ? '已确认' : '未确认' }}
                  </div>
                </div>

                <div class="actions">
                  <el-button v-if="canPay" type="primary" :loading="actionLoading" @click="handlePay">
                    付款到平台托管
                  </el-button>
                  <el-button v-if="canConfirmReceived" type="success" :loading="actionLoading" @click="handleConfirmReceived">
                    我已收到商品
                  </el-button>
                  <el-button v-if="canConfirmHandoff" type="success" :loading="actionLoading" @click="handleConfirmHandoff">
                    我已完成面交
                  </el-button>
                  <el-button v-if="canCancel" type="danger" plain :loading="actionLoading" @click="handleCancel">
                    取消订单
                  </el-button>
                </div>
              </aside>
            </div>

            <el-empty v-else-if="!loading" description="订单不存在" />
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
import { conversations, disputes, orders } from '../api/index.js'
import { useUserStore } from '../stores/user.js'
import { resolveAssetUrl } from '../utils/url.js'
import AppHeader from '../components/AppHeader.vue'
import ImageUploader from '../components/ImageUploader.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const actionLoading = ref(false)
const disputeLoading = ref(false)
const disputeResponseLoading = ref(false)
const disputeReason = ref('')
const disputeResponse = ref('')
const disputeEvidenceImages = ref([])
const disputeResponseImages = ref([])
const order = ref(null)
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect width="300" height="300" fill="%23191a1b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="%238a8f98"%3ENo Image%3C/text%3E%3C/svg%3E'

const activeHandoffStatuses = ['paid_escrow', 'meeting_confirmed']

const isBuyer = computed(() => order.value?.buyer?.id === userStore.userInfo?.id)
const isSeller = computed(() => order.value?.seller?.id === userStore.userInfo?.id)
const canPay = computed(() => isBuyer.value && order.value?.status === 'pending_payment')
const canConfirmReceived = computed(() => {
  return isBuyer.value &&
    activeHandoffStatuses.includes(order.value?.status) &&
    !order.value?.buyerHandoffConfirmed
})
const canConfirmHandoff = computed(() => {
  return isSeller.value &&
    activeHandoffStatuses.includes(order.value?.status) &&
    !order.value?.sellerHandoffConfirmed
})
const canCancel = computed(() => order.value?.status === 'pending_payment' && (isBuyer.value || isSeller.value))
const latestDispute = computed(() => order.value?.disputes?.[0] || null)
const activeDispute = computed(() => {
  if (!latestDispute.value) return null
  return ['open', 'responded'].includes(latestDispute.value.status) ? latestDispute.value : null
})
const canCreateDispute = computed(() => {
  return (isBuyer.value || isSeller.value) &&
    activeHandoffStatuses.includes(order.value?.status) &&
    !activeDispute.value
})

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

const escrowText = (status) => {
  const map = {
    held: '托管中',
    released: '已放款',
    refunded: '已退款',
    disputed: '争议冻结',
  }
  return map[status] || status
}

const disputeStatusText = (status) => {
  const map = {
    open: '待回应',
    responded: '已回应',
    resolved_refund: '已退款',
    resolved_release: '已放款',
  }
  return map[status] || status
}

const disputeStatusType = (status) => {
  const map = {
    open: 'danger',
    responded: 'warning',
    resolved_refund: 'info',
    resolved_release: 'success',
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

const resolveImageList = (images = []) => {
  return images.map(resolveAssetUrl).filter(Boolean)
}

const fetchOrder = async () => {
  loading.value = true
  try {
    if (userStore.token && !userStore.userInfo) {
      await userStore.fetchUserInfo()
    }
    const res = await orders.getDetail(route.params.id)
    order.value = res.data
    const dispute = res.data?.disputes?.[0]
    disputeResponse.value = dispute?.response || ''
    disputeResponseImages.value = dispute?.responseImages || []
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error(error.message || '获取订单详情失败')
  } finally {
    loading.value = false
  }
}

const handleRespondDispute = async () => {
  if (!activeDispute.value || disputeResponseLoading.value) return

  const response = disputeResponse.value.trim()
  if (response.length < 5) {
    ElMessage.warning('补充说明至少 5 个字')
    return
  }

  disputeResponseLoading.value = true
  try {
    await disputes.respond(activeDispute.value.id, {
      response,
      responseImages: disputeResponseImages.value,
    })
    ElMessage.success('补充说明已提交')
    await fetchOrder()
  } catch (error) {
    console.error('提交补充说明失败:', error)
    ElMessage.error(error.message || '提交补充说明失败')
  } finally {
    disputeResponseLoading.value = false
  }
}

const runOrderAction = async (action, successMessage, failureMessage) => {
  if (actionLoading.value) return

  actionLoading.value = true
  try {
    await action()
    ElMessage.success(successMessage)
    await fetchOrder()
  } catch (error) {
    console.error(`${failureMessage}:`, error)
    ElMessage.error(error.message || failureMessage)
  } finally {
    actionLoading.value = false
  }
}

const handlePay = () => {
  if (!order.value?.id) return

  runOrderAction(
    () => orders.pay(order.value.id),
    '付款成功',
    '付款失败',
  )
}

const handleConfirmReceived = () => {
  if (!order.value?.id) return

  runOrderAction(
    () => orders.confirmReceived(order.value.id),
    '已确认收到商品',
    '确认收货失败',
  )
}

const handleConfirmHandoff = () => {
  if (!order.value?.id) return

  runOrderAction(
    () => orders.confirmHandoff(order.value.id),
    '已确认完成面交',
    '确认面交失败',
  )
}

const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确认取消这个订单吗？', '取消订单', {
      confirmButtonText: '确认取消',
      cancelButtonText: '保留订单',
      type: 'warning',
    })

    await runOrderAction(
      () => orders.cancel(order.value.id),
      '订单已取消',
      '取消订单失败',
    )
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订单失败:', error)
      ElMessage.error(error.message || '取消订单失败')
    }
  }
}

const handleCreateDispute = async () => {
  if (!order.value?.id) return

  const reason = disputeReason.value.trim()
  if (reason.length < 5) {
    ElMessage.warning('争议原因至少 5 个字')
    return
  }

  disputeLoading.value = true
  try {
    await orders.createDispute(order.value.id, {
      reason,
      evidenceImages: disputeEvidenceImages.value,
    })
    disputeReason.value = ''
    disputeEvidenceImages.value = []
    ElMessage.success('争议已提交')
    await fetchOrder()
  } catch (error) {
    console.error('提交争议失败:', error)
    ElMessage.error(error.message || '提交争议失败')
  } finally {
    disputeLoading.value = false
  }
}

const goMessages = async () => {
  const productId = order.value?.product?.id
  if (!productId) {
    router.push('/messages')
    return
  }

  try {
    if (isBuyer.value) {
      const res = await conversations.create({ productId })
      router.push(`/messages/${res.data.id}`)
      return
    }

    const res = await conversations.getList()
    const target = (res.data.conversations || [])
      .find((item) => item.product?.id === productId)
    router.push(target ? `/messages/${target.id}` : '/messages')
  } catch (error) {
    console.error('打开消息页失败:', error)
    router.push('/messages')
  }
}

onMounted(fetchOrder)
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background: #ffffff;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--spacing-xl);
}

.main-panel,
.side-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
}

.status-line {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  color: var(--text-tertiary);
}

.product-block {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--spacing-xl);
}

.product-block img {
  width: 220px;
  height: 220px;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.product-block h1 {
  margin: 0 0 var(--spacing-sm);
}

.product-block p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.price {
  color: var(--brand-indigo);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}

.handoff-box,
.dispute-box {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg);
  border: 1px solid rgba(94, 106, 210, 0.18);
  border-radius: var(--radius-md);
  background: #f6f7ff;
}

.handoff-box h3,
.dispute-box h3 {
  margin: 0 0 var(--spacing-sm);
}

.handoff-box p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.dispute-box {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background: #fff8f8;
  border-color: rgba(220, 38, 38, 0.16);
}

.dispute-detail-box {
  background: #fffaf0;
}

.dispute-title-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  align-items: center;
}

.dispute-title-row h3 {
  margin: 0;
}

.dispute-field {
  display: grid;
  gap: var(--spacing-xs);
}

.dispute-field span {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.dispute-field p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.dispute-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.side-panel h3 {
  margin-top: 0;
}

.person {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.person span {
  color: var(--text-tertiary);
}

.person strong {
  text-align: right;
}

.handoff-flags {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.handoff-flags .done {
  color: var(--el-color-success);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}

@media (max-width: 900px) {
  .detail-layout,
  .product-block {
    grid-template-columns: 1fr;
  }

  .product-block img {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
  }
}
</style>
