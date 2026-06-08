<template>
  <div class="admin-page">
    <AppHeader />

    <main class="page-wrapper">
      <div class="container">
        <header class="admin-title">
          <div>
            <p>平台管理</p>
            <h1>管理后台</h1>
          </div>
          <el-button :loading="loading" @click="loadAll">刷新</el-button>
        </header>

        <section class="summary-grid">
          <div class="summary-tile">
            <span>待处理争议</span>
            <strong>{{ adminStats.activeDisputes }}</strong>
          </div>
          <div class="summary-tile">
            <span>待回应</span>
            <strong>{{ adminStats.openDisputes }}</strong>
          </div>
          <div class="summary-tile">
            <span>商品总数</span>
            <strong>{{ adminStats.totalProducts }}</strong>
          </div>
          <div class="summary-tile">
            <span>在售商品</span>
            <strong>{{ adminStats.availableProducts }}</strong>
          </div>
        </section>

        <el-tabs v-model="activeTab" class="admin-tabs">
          <el-tab-pane label="争议仲裁" name="disputes">
            <section class="admin-section">
              <div class="toolbar">
                <el-select
                  v-model="disputeStatusFilter"
                  class="filter-select"
                  @change="loadDisputes"
                >
                  <el-option label="待处理" value="active" />
                  <el-option label="待回应" value="open" />
                  <el-option label="已回应" value="responded" />
                  <el-option label="已退款" value="resolved_refund" />
                  <el-option label="已放款" value="resolved_release" />
                </el-select>
                <el-button :loading="disputeLoading" @click="loadDisputes">刷新争议</el-button>
              </div>

              <el-table v-loading="disputeLoading" :data="disputesList" empty-text="暂无待处理争议">
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column label="商品" min-width="180">
                  <template #default="{ row }">
                    <div class="main-cell">
                      <strong>{{ row.product?.title || '-' }}</strong>
                      <span>订单 #{{ row.orderId }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="双方" min-width="160">
                  <template #default="{ row }">
                    <div class="pair-cell">
                      <span>买家：{{ row.buyer?.username || '-' }}</span>
                      <span>卖家：{{ row.seller?.username || '-' }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="reason" label="争议原因" min-width="220" show-overflow-tooltip />
                <el-table-column label="图片证据" min-width="150">
                  <template #default="{ row }">
                    <div v-if="disputeImages(row).length" class="evidence-images">
                      <el-image
                        v-for="image in disputeImages(row)"
                        :key="image"
                        :src="image"
                        :preview-src-list="disputeImages(row)"
                        fit="cover"
                        class="dispute-evidence-image"
                      />
                    </div>
                    <span v-else class="empty-evidence">无</span>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="110">
                  <template #default="{ row }">
                    <el-tag :type="disputeTagType(row.status)">{{ disputeStatusText(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="处理" width="230" fixed="right">
                  <template #default="{ row }">
                    <div class="row-actions">
                      <el-button type="danger" plain size="small" @click="resolveDispute(row, 'refund')">
                        退款
                      </el-button>
                      <el-button
                        type="success"
                        plain
                        size="small"
                        :disabled="!canResolveDispute(row.status)"
                        @click="resolveDispute(row, 'release')"
                      >
                        放款
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </section>
          </el-tab-pane>

          <el-tab-pane label="商品管理" name="products">
            <section class="admin-section">
              <div class="toolbar">
                <el-select
                  v-model="productStatusFilter"
                  class="filter-select"
                  @change="loadProducts"
                >
                  <el-option label="全部商品" value="all" />
                  <el-option label="在售" value="available" />
                  <el-option label="已售" value="sold" />
                </el-select>
                <el-input
                  v-model="productSearch"
                  clearable
                  placeholder="搜索商品"
                  class="search-box"
                  @keyup.enter="loadProducts"
                  @clear="loadProducts"
                />
                <el-button @click="loadProducts">搜索</el-button>
              </div>

              <el-table v-loading="productLoading" :data="productsList" empty-text="暂无商品">
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column label="商品" min-width="220">
                  <template #default="{ row }">
                    <div class="main-cell">
                      <strong>{{ row.title }}</strong>
                      <span>{{ row.category }} · ¥{{ formatMoney(row.price) }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="卖家" min-width="120">
                  <template #default="{ row }">
                    {{ row.seller?.username || '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="110">
                  <template #default="{ row }">
                    <el-tag :type="productTagType(row.status)">{{ productStatusText(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="130" fixed="right">
                  <template #default="{ row }">
                    <el-button type="danger" plain size="small" @click="removeProduct(row)">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </section>
          </el-tab-pane>
        </el-tabs>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { admin, disputes } from '../api/index.js'
import AppHeader from '../components/AppHeader.vue'
import { resolveAssetUrl } from '../utils/url.js'

const activeTab = ref('disputes')
const disputeLoading = ref(false)
const productLoading = ref(false)
const disputeStatusFilter = ref('active')
const productStatusFilter = ref('all')
const productSearch = ref('')
const disputesList = ref([])
const productsList = ref([])

const loading = computed(() => disputeLoading.value || productLoading.value)
const adminStats = computed(() => ({
  activeDisputes: disputesList.value.filter(item => canResolveDispute(item.status)).length,
  openDisputes: disputesList.value.filter(item => item.status === 'open').length,
  totalProducts: productsList.value.length,
  availableProducts: productsList.value.filter(item => item.status === 'available').length,
}))

const loadDisputes = async () => {
  disputeLoading.value = true
  try {
    const res = await admin.getDisputes({
      status: disputeStatusFilter.value,
      pageSize: 50,
    })
    disputesList.value = res.data.disputes || []
  } catch (error) {
    console.error('加载争议失败:', error)
    ElMessage.error(error.message || '加载争议失败')
  } finally {
    disputeLoading.value = false
  }
}

const loadProducts = async () => {
  productLoading.value = true
  try {
    const res = await admin.getProducts({
      status: productStatusFilter.value,
      search: productSearch.value.trim() || undefined,
      pageSize: 50,
    })
    productsList.value = res.data.products || []
  } catch (error) {
    console.error('加载商品失败:', error)
    ElMessage.error(error.message || '加载商品失败')
  } finally {
    productLoading.value = false
  }
}

const loadAll = async () => {
  await Promise.all([loadDisputes(), loadProducts()])
}

const resolveDispute = async (row, result) => {
  if (!canResolveDispute(row.status)) return

  const label = result === 'refund' ? '退款给买家' : '放款给卖家'

  try {
    const { value } = await ElMessageBox.prompt('请输入处理说明', label, {
      confirmButtonText: '确认处理',
      cancelButtonText: '取消',
      inputValue: label,
      inputValidator: (value) => Boolean(value && value.trim()),
      inputErrorMessage: '处理说明不能为空',
    })

    await disputes.resolve(row.id, {
      result,
      resolutionNote: value.trim(),
    })
    ElMessage.success('争议已处理')
    await loadAll()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('处理争议失败:', error)
      ElMessage.error(error.message || '处理争议失败')
    }
  }
}

const canResolveDispute = (status) => ['open', 'responded'].includes(status)

const removeProduct = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除商品“${row.title}”？`, '删除违规商品', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await admin.removeProduct(row.id)
    ElMessage.success('商品已删除')
    await loadProducts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除商品失败:', error)
      ElMessage.error(error.message || '删除商品失败')
    }
  }
}

const formatMoney = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

const disputeImages = (row) => {
  return [
    ...(row.evidenceImages || []),
    ...(row.responseImages || []),
  ].map(resolveAssetUrl).filter(Boolean)
}

const disputeStatusText = (status) => ({
  open: '待回应',
  responded: '已回应',
  resolved_refund: '已退款',
  resolved_release: '已放款',
}[status] || status)

const disputeTagType = (status) => ({
  open: 'danger',
  responded: 'warning',
  resolved_refund: 'info',
  resolved_release: 'success',
}[status] || 'info')

const productStatusText = (status) => ({
  available: '在售',
  sold: '已售',
  removed: '已删除',
}[status] || status)

const productTagType = (status) => ({
  available: 'success',
  sold: 'warning',
  removed: 'info',
}[status] || 'info')

onMounted(loadAll)
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.admin-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.admin-title p {
  margin: 0 0 4px;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.admin-title h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 28px;
}

.admin-tabs {
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.summary-tile {
  display: grid;
  gap: 6px;
  padding: var(--spacing-lg);
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
}

.summary-tile span {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.summary-tile strong {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1;
}

.admin-section {
  display: grid;
  gap: var(--spacing-md);
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.search-box {
  max-width: 320px;
}

.filter-select {
  width: 150px;
}

.main-cell,
.pair-cell {
  display: grid;
  gap: 4px;
}

.main-cell span,
.pair-cell span {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.row-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.evidence-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dispute-evidence-image {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-standard);
  background: var(--bg-secondary);
}

.empty-evidence {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-title,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-box {
    max-width: none;
  }

  .filter-select {
    width: 100%;
  }
}
</style>
