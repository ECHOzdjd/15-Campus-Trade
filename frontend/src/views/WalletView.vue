<template>
  <div class="wallet-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div class="wallet-head">
            <div>
              <h1>我的钱包</h1>
              <p>余额可用于订单付款到平台托管。</p>
            </div>
            <div class="balance-card">
              <span>当前余额</span>
              <strong>￥{{ formatMoney(walletData.balance) }}</strong>
            </div>
          </div>

          <section class="recharge-panel">
            <h2>模拟充值</h2>
            <div class="recharge-form">
              <el-input-number
                v-model="amount"
                :min="1"
                :max="10000"
                :precision="2"
                :step="10"
                controls-position="right"
              />
              <el-button type="primary" :loading="recharging" @click="handleRecharge">
                模拟充值
              </el-button>
            </div>
          </section>

          <section class="transactions-panel">
            <h2>交易流水</h2>
            <el-table
              v-loading="loading"
              :data="walletData.transactions"
              class="transaction-table"
              empty-text="暂无流水"
            >
              <el-table-column prop="type" label="类型" min-width="120">
                <template #default="{ row }">{{ typeText(row.type) }}</template>
              </el-table-column>
              <el-table-column prop="direction" label="方向" min-width="100">
                <template #default="{ row }">{{ directionText(row.direction) }}</template>
              </el-table-column>
              <el-table-column prop="amount" label="金额" min-width="120">
                <template #default="{ row }">￥{{ formatMoney(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="note" label="说明" min-width="180" />
              <el-table-column prop="createdAt" label="时间" min-width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { wallet } from '../api/index.js'
import AppHeader from '../components/AppHeader.vue'

const loading = ref(false)
const recharging = ref(false)
const amount = ref(100)
const walletData = reactive({
  balance: 0,
  frozenBalance: 0,
  transactions: [],
})

const formatMoney = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN')
}

const typeText = (type) => {
  const map = {
    recharge: '充值',
    escrow_pay: '托管付款',
    escrow_release: '托管放款',
    refund: '退款',
  }
  return map[type] || type
}

const directionText = (direction) => {
  const map = {
    in: '收入',
    out: '支出',
  }
  return map[direction] || direction
}

const applyWallet = (data) => {
  walletData.balance = data?.balance || 0
  walletData.frozenBalance = data?.frozenBalance || 0
  walletData.transactions = data?.transactions || []
}

const fetchWallet = async () => {
  loading.value = true
  try {
    const res = await wallet.get()
    applyWallet(res.data)
  } catch (error) {
    console.error('获取钱包失败:', error)
    ElMessage.error(error.message || '获取钱包失败')
  } finally {
    loading.value = false
  }
}

const handleRecharge = async () => {
  if (recharging.value) return

  recharging.value = true
  try {
    const res = await wallet.recharge({ amount: amount.value })
    applyWallet(res.data)
    ElMessage.success('充值成功')
  } catch (error) {
    console.error('充值失败:', error)
    ElMessage.error(error.message || '充值失败')
  } finally {
    recharging.value = false
  }
}

onMounted(fetchWallet)
</script>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.wallet-head {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-lg);
  align-items: stretch;
  margin-bottom: var(--spacing-xl);
}

.wallet-head h1 {
  margin: 0 0 var(--spacing-xs);
}

.wallet-head p {
  margin: 0;
  color: var(--text-secondary);
}

.balance-card,
.recharge-panel,
.transactions-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
}

.balance-card {
  min-width: 240px;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-xs);
}

.balance-card span {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.balance-card strong {
  color: var(--brand-indigo);
  font-size: var(--font-size-3xl);
}

.recharge-panel,
.transactions-panel {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.recharge-panel h2,
.transactions-panel h2 {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-xl);
}

.recharge-form {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.transaction-table {
  width: 100%;
}

@media (max-width: 768px) {
  .wallet-head {
    flex-direction: column;
  }

  .balance-card {
    min-width: 0;
  }

  .recharge-form {
    align-items: stretch;
  }

  .recharge-form :deep(.el-input-number),
  .recharge-form .el-button {
    width: 100%;
  }
}
</style>
