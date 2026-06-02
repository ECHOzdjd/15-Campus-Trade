<template>
  <div class="messages-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div class="page-head">
            <h1>我的消息</h1>
            <p>购买前先和挂售者沟通，约定校园内面交地点、时间和验货方式。</p>
          </div>

          <div v-loading="loading" class="conversation-list">
            <div v-if="conversationList.length" class="rows">
              <div
                v-for="conversation in conversationList"
                :key="conversation.id"
                class="conversation-row"
                @click="router.push(`/messages/${conversation.id}`)"
              >
                <img :src="resolveAssetUrl(conversation.product.images?.[0]) || defaultImage" :alt="conversation.product.title">
                <div class="conversation-main">
                  <div class="row-title">
                    <h3>{{ conversation.product.title }}</h3>
                    <el-badge v-if="conversation.unreadCount" :value="conversation.unreadCount" />
                  </div>
                  <div class="peer">对方：{{ conversation.peer.username }}</div>
                  <p>{{ conversation.lastMessage || '还没有消息，点击进入开始沟通' }}</p>
                </div>
                <span class="time">{{ formatDate(conversation.lastMessageAt || conversation.updatedAt) }}</span>
              </div>
            </div>

            <el-empty v-else-if="!loading" description="暂无会话">
              <el-button type="primary" @click="router.push('/')">去看看商品</el-button>
            </el-empty>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { conversations } from '../api/index.js'
import { resolveAssetUrl } from '../utils/url.js'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const loading = ref(false)
const conversationList = ref([])
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect width="160" height="160" fill="%23191a1b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%238a8f98"%3E暂无图片%3C/text%3E%3C/svg%3E'

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN')
}

const fetchConversations = async () => {
  loading.value = true
  try {
    const res = await conversations.getList()
    conversationList.value = res.data.conversations || []
  } catch (error) {
    console.error('获取消息失败:', error)
    ElMessage.error(error.message || '获取消息失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchConversations)
</script>

<style scoped>
.messages-page {
  min-height: 100vh;
  background: #ffffff;
}

.page-head {
  margin-bottom: var(--spacing-xl);
}

.page-head h1 {
  margin: 0 0 var(--spacing-xs);
}

.page-head p {
  margin: 0;
}

.conversation-list {
  min-height: 320px;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.conversation-row {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  gap: var(--spacing-md);
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.conversation-row:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.conversation-row img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.row-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.row-title h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.peer {
  margin: var(--spacing-xs) 0;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.conversation-main p {
  margin: 0;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .conversation-row {
    grid-template-columns: 64px 1fr;
  }

  .conversation-row img {
    width: 64px;
    height: 64px;
  }

  .time {
    grid-column: 2;
  }
}
</style>
