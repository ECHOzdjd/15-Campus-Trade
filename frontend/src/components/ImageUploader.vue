<template>
  <div class="image-uploader">
    <el-upload
      :file-list="fileList"
      :action="uploadUrl"
      :headers="uploadHeaders"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :before-upload="beforeUpload"
      :limit="maxCount"
      :on-exceed="handleExceed"
      list-type="picture-card"
      :disabled="disabled"
      drag
      multiple
    >
      <div class="upload-trigger">
        <el-icon class="upload-icon"><Plus /></el-icon>
        <div class="upload-text">点击或拖拽上传</div>
        <div class="upload-hint">最多上传 {{ maxCount }} 张图片</div>
      </div>
    </el-upload>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxCount: {
    type: Number,
    default: 5
  },
  maxSize: {
    type: Number,
    default: 5 // MB
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 上传地址和请求头
const uploadUrl = computed(() => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  return `${baseURL}/upload/image`
})

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return {
    Authorization: token ? `Bearer ${token}` : ''
  }
})

// 文件列表
const fileList = ref([])

// 初始化文件列表
watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal.length > 0) {
    fileList.value = newVal.map((url, index) => ({
      uid: Date.now() + index,
      name: `image-${index}`,
      status: 'success',
      url: url
    }))
  } else {
    fileList.value = []
  }
}, { immediate: true })

// 上传前验证
const beforeUpload = (file) => {
  // 验证文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }

  // 验证文件大小
  const isLtMaxSize = file.size / 1024 / 1024 < props.maxSize
  if (!isLtMaxSize) {
    ElMessage.error(`图片大小不能超过 ${props.maxSize}MB！`)
    return false
  }

  return true
}

// 上传成功
const handleSuccess = (response, file, fileList) => {
  if (response.code === 200 || response.code === 201) {
    // 更新文件列表中的 URL
    const index = fileList.findIndex(item => item.uid === file.uid)
    if (index !== -1) {
      fileList[index].url = response.data.url
    }

    // 提取所有成功上传的图片 URL
    const urls = fileList
      .filter(item => item.status === 'success' && item.url)
      .map(item => item.url)

    emit('update:modelValue', urls)
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.message || '图片上传失败')
    // 移除上传失败的文件
    const index = fileList.findIndex(item => item.uid === file.uid)
    if (index !== -1) {
      fileList.splice(index, 1)
    }
  }
}

// 上传失败
const handleError = (error, file, fileList) => {
  console.error('上传失败:', error)
  ElMessage.error('图片上传失败，请重试')

  // 移除上传失败的文件
  const index = fileList.findIndex(item => item.uid === file.uid)
  if (index !== -1) {
    fileList.splice(index, 1)
  }
}

// 移除文件
const handleRemove = (file, fileList) => {
  const urls = fileList
    .filter(item => item.status === 'success' && item.url)
    .map(item => item.url)

  emit('update:modelValue', urls)
}

// 超出限制
const handleExceed = () => {
  ElMessage.warning(`最多只能上传 ${props.maxCount} 张图片`)
}
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.image-uploader :deep(.el-upload-list) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.image-uploader :deep(.el-upload--picture-card) {
  width: 148px;
  height: 148px;
  background-color: var(--bg-secondary);
  border: 2px dashed var(--border-standard);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.image-uploader :deep(.el-upload--picture-card:hover) {
  border-color: var(--brand-indigo);
  background-color: var(--bg-tertiary);
}

.image-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  padding: var(--spacing-md);
}

.image-uploader :deep(.el-upload-dragger:hover) {
  background-color: transparent;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  text-align: center;
}

.upload-icon {
  font-size: 32px;
  color: var(--text-tertiary);
}

.upload-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.upload-hint {
  font-size: var(--font-size-xs);
  color: var(--text-quaternary);
}

.image-uploader :deep(.el-upload-list__item) {
  width: 148px;
  height: 148px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.image-uploader :deep(.el-upload-list__item:hover) {
  border-color: var(--border-strong);
}

.image-uploader :deep(.el-upload-list__item-thumbnail) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-uploader :deep(.el-upload-list__item-actions) {
  background-color: rgba(0, 0, 0, 0.7);
}

.image-uploader :deep(.el-upload-list__item-actions .el-icon) {
  color: white;
}

.image-uploader :deep(.el-progress) {
  width: 90%;
}

.image-uploader :deep(.el-progress__text) {
  color: var(--text-primary);
}

/* 禁用状态 */
.image-uploader :deep(.el-upload--picture-card.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-uploader :deep(.el-upload--picture-card.is-disabled:hover) {
  border-color: var(--border-standard);
  background-color: var(--bg-secondary);
}

/* 响应式 */
@media (max-width: 768px) {
  .image-uploader :deep(.el-upload--picture-card),
  .image-uploader :deep(.el-upload-list__item) {
    width: 120px;
    height: 120px;
  }
}
</style>
