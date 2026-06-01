<template>
  <div class="conversation-detail-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div v-loading="loading" class="chat-shell">
            <aside v-if="conversation" class="product-side">
              <img :src="resolveAssetUrl(conversation.product.images?.[0]) || defaultImage" :alt="conversation.product.title">
              <h2>{{ conversation.product.title }}</h2>
              <div class="price">￥{{ conversation.product.price }}</div>
              <p>和 {{ conversation.peer.username }} 沟通面交地点、时间、验货方式。</p>
              <el-button type="primary" plain @click="router.push(`/product/${conversation.product.id}`)">
                查看商品
              </el-button>
            </aside>

            <section v-if="conversation" class="chat-panel">
              <div class="chat-head">
                <div>
                  <h1>{{ conversation.peer.username }}</h1>
                  <span>校园面交沟通</span>
                </div>
              </div>

              <div ref="messageBox" class="messages">
                <div
                  v-for="message in messageList"
                  :key="message.id"
                  class="message"
                  :class="{
                    mine: message.senderId === userStore.userInfo?.id && message.type !== 'system',
                    system: message.type === 'system'
                  }"
                >
                  <div v-if="message.type === 'system'" class="system-message">
                    {{ message.content }}
                  </div>
                  <div v-else class="bubble">
                    <div class="sender">{{ message.sender?.username || '系统消息' }}</div>
                    <img
                      v-if="message.type === 'image'"
                      class="chat-image"
                      :src="resolveAssetUrl(message.content)"
                      :alt="message.metadata?.filename || '聊天图片'"
                    >
                    <p v-else>{{ message.content }}</p>
                    <span>{{ formatDate(message.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="riskHint" class="risk-hint">
                {{ riskHint }}
              </div>

              <div class="handoff-hint">
                提示：建议约在校园公共区域，当面验货后再完成付款。
              </div>

              <div class="composer">
                <input
                  ref="imageInput"
                  class="image-input"
                  type="file"
                  accept="image/*"
                  @change="handleImageSelected"
                >
                <el-input
                  v-model="messageText"
                  type="textarea"
                  :rows="3"
                  maxlength="500"
                  show-word-limit
                  placeholder="输入消息，例如：今晚 7 点图书馆门口方便吗？"
                  @keyup.ctrl.enter="handleSend"
                />
                <div class="composer-actions">
                  <el-button :loading="uploadingImage" :disabled="sending || uploadingImage" @click="openImagePicker">
                    图片
                  </el-button>
                  <el-button type="primary" :loading="sending" :disabled="uploadingImage" @click="handleSend">
                    发送
                  </el-button>
                </div>
              </div>
            </section>

            <el-empty v-else-if="!loading" description="会话不存在" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ai, conversations, upload } from '../api/index.js'
import { useUserStore } from '../stores/user.js'
import { resolveAssetUrl } from '../utils/url.js'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const sending = ref(false)
const uploadingImage = ref(false)
const conversation = ref(null)
const messageList = ref([])
const messageText = ref('')
const messageBox = ref(null)
const imageInput = ref(null)
const riskHint = ref('')
let eventSource = null
let riskCheckSeq = 0
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="240"%3E%3Crect width="240" height="240" fill="%23191a1b"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="28" fill="%238a8f98"%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C/text%3E%3C/svg%3E'
const riskHintText = '这条消息可能涉及平台外付款或高风险交易，建议确认订单已付款到托管后再面交。'

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight
  }
}

const appendMessage = (message) => {
  if (!message || messageList.value.some(item => item.id === message.id)) {
    return
  }
  messageList.value.push(message)
  scrollToBottom()
}

const checkMessageRisk = async (content, seq) => {
  try {
    const riskRes = await ai.riskCheck({ content })
    if (seq !== riskCheckSeq) return
    riskHint.value = riskRes.data?.risky ? riskHintText : ''
  } catch (error) {
    console.warn('消息风险检查失败:', error)
  }
}

const openStream = () => {
  if (!userStore.token || !conversation.value) return
  if (eventSource) eventSource.close()

  eventSource = new EventSource(conversations.streamUrl(conversation.value.id, userStore.token))
  eventSource.addEventListener('message', (event) => {
    appendMessage(JSON.parse(event.data))
  })
  eventSource.onerror = () => {
    eventSource.close()
    eventSource = null
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    if (userStore.token && !userStore.userInfo) {
      await userStore.fetchUserInfo()
    }
    const res = await conversations.getDetail(route.params.id)
    conversation.value = res.data.conversation
    messageList.value = res.data.messages || []
    await conversations.markRead(route.params.id)
    await scrollToBottom()
    openStream()
  } catch (error) {
    console.error('获取会话失败:', error)
    ElMessage.error(error.message || '获取会话失败')
  } finally {
    loading.value = false
  }
}

const handleSend = async () => {
  const content = messageText.value.trim()
  if (!content || sending.value) return

  sending.value = true
  riskHint.value = ''
  const seq = ++riskCheckSeq
  try {
    const sendPromise = conversations.sendMessage(route.params.id, { type: 'text', content })
    checkMessageRisk(content, seq)
    const res = await sendPromise
    appendMessage(res.data)
    messageText.value = ''
  } catch (error) {
    riskCheckSeq++
    riskHint.value = ''
    console.error('发送消息失败:', error)
    ElMessage.error(error.message || '发送消息失败')
  } finally {
    sending.value = false
  }
}

const openImagePicker = () => {
  if (sending.value || uploadingImage.value) return
  imageInput.value?.click()
}

const handleImageSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || sending.value || uploadingImage.value) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }

  uploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const uploadRes = await upload.image(formData)
    if (!uploadRes.data?.url) {
      ElMessage.error('图片上传失败')
      return
    }
    const res = await conversations.sendMessage(route.params.id, {
      type: 'image',
      content: uploadRes.data.url,
      metadata: { filename: file.name }
    })
    appendMessage(res.data)
  } catch (error) {
    console.error('发送图片失败:', error)
    ElMessage.error(error.message || '发送图片失败')
  } finally {
    uploadingImage.value = false
  }
}

onMounted(fetchDetail)

onBeforeUnmount(() => {
  if (eventSource) {
    eventSource.close()
  }
})
</script>

<style scoped>
.conversation-detail-page {
  min-height: 100vh;
  background: #ffffff;
}

.chat-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: var(--spacing-xl);
  min-height: 680px;
}

.product-side,
.chat-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
}

.product-side {
  padding: var(--spacing-lg);
  align-self: start;
}

.product-side img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.product-side h2 {
  margin: var(--spacing-md) 0 var(--spacing-sm);
}

.product-side p {
  color: var(--text-secondary);
}

.price {
  color: var(--brand-indigo);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
}

.chat-panel {
  display: grid;
  grid-template-rows: auto 1fr auto auto auto;
  min-height: 680px;
}

.chat-head {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-subtle);
}

.chat-head h1 {
  margin: 0 0 var(--spacing-xs);
}

.chat-head span {
  color: var(--text-tertiary);
}

.messages {
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.message {
  display: flex;
}

.message.mine {
  justify-content: flex-end;
}

.message.system {
  justify-content: center;
}

.bubble {
  max-width: min(560px, 78%);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: #ffffff;
  border: 1px solid var(--border-standard);
}

.message.mine .bubble {
  background: #eef0ff;
  border-color: rgba(94, 106, 210, 0.2);
}

.system-message {
  max-width: min(560px, 84%);
  padding: 6px var(--spacing-md);
  border-radius: var(--radius-md);
  background: #f3f4f6;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.sender {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  margin-bottom: var(--spacing-xs);
}

.bubble p {
  margin: 0 0 var(--spacing-xs);
  color: var(--text-primary);
  white-space: pre-wrap;
}

.chat-image {
  display: block;
  max-width: min(360px, 100%);
  max-height: 320px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  background: var(--bg-secondary);
}

.bubble span {
  color: var(--text-quaternary);
  font-size: var(--font-size-xs);
}

.risk-hint,
.handoff-hint {
  margin: 0 var(--spacing-lg) var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.risk-hint {
  background: #fff7ed;
  border: 1px solid rgba(234, 88, 12, 0.2);
  color: #9a3412;
}

.handoff-hint {
  background: #f6f7ff;
  border: 1px solid rgba(94, 106, 210, 0.18);
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-subtle);
}

.image-input {
  display: none;
}

.composer-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.composer-actions .el-button {
  align-self: stretch;
  min-width: 80px;
}

@media (max-width: 900px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .composer {
    grid-template-columns: 1fr;
  }

  .composer-actions {
    justify-content: flex-end;
  }

  .bubble {
    max-width: 90%;
  }
}
</style>
