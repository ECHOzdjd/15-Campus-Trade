<template>
  <div class="publish-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <el-card class="publish-card">
            <template #header>
              <h2 class="card-title">发布商品</h2>
            </template>

            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="100px"
              label-position="top"
              size="large"
            >
              <el-form-item label="商品标题" prop="title">
                <el-input
                  v-model="form.title"
                  placeholder="请输入商品标题（2-50字）"
                  maxlength="50"
                  show-word-limit
                  clearable
                />
              </el-form-item>

              <el-form-item label="商品价格" prop="price">
                <el-input
                  v-model.number="form.price"
                  type="number"
                  placeholder="请输入商品价格"
                  clearable
                >
                  <template #prepend>￥</template>
                </el-input>
              </el-form-item>

              <el-form-item label="商品分类" prop="category">
                <el-select
                  v-model="form.category"
                  placeholder="请选择商品分类"
                  clearable
                >
                  <el-option label="数码产品" value="数码产品" />
                  <el-option label="图书教材" value="图书教材" />
                  <el-option label="生活用品" value="生活用品" />
                  <el-option label="交通工具" value="交通工具" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </el-form-item>

              <el-form-item label="商品成色" prop="condition">
                <el-select
                  v-model="form.condition"
                  placeholder="请选择商品成色"
                  clearable
                >
                  <el-option label="全新" value="new" />
                  <el-option label="几乎全新" value="like_new" />
                  <el-option label="轻微使用痕迹" value="good" />
                  <el-option label="明显使用痕迹" value="fair" />
                </el-select>
              </el-form-item>

              <el-form-item label="商品描述" prop="description">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  placeholder="可选：描述商品的状况、购买时间、使用情况等（最多500字）"
                  :rows="6"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="商品图片" prop="images">
                <ImageUploader v-model="form.images" :max-count="5" />
                <div class="form-hint">可选，最多上传 5 张图片，每张不超过 5MB</div>
              </el-form-item>

              <el-form-item>
                <div class="button-group">
                  <el-button @click="handleCancel">取消</el-button>
                  <el-button :loading="aiLoading" :disabled="loading" @click="handleAiDraft">
                    生成文案
                  </el-button>
                  <el-button :loading="aiLoading" :disabled="loading" @click="handlePriceSuggestion">
                    建议定价
                  </el-button>
                  <el-button
                    type="primary"
                    :loading="loading"
                    :disabled="aiLoading"
                    @click="handleSubmit"
                  >
                    发布商品
                  </el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ai, products } from '../api/index.js'
import { ElMessage } from 'element-plus'
import AppHeader from '../components/AppHeader.vue'
import ImageUploader from '../components/ImageUploader.vue'

const router = useRouter()

const loading = ref(false)
const aiLoading = ref(false)
const formRef = ref(null)

const form = reactive({
  title: '',
  price: null,
  category: '',
  condition: '',
  description: '',
  images: []
})

const rules = {
  title: [
    { required: true, message: '请输入商品标题', trigger: 'blur' },
    { min: 2, max: 50, message: '标题长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', message: '价格必须为数字', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value <= 0) {
          callback(new Error('价格必须大于 0'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  category: [
    { required: true, message: '请选择商品分类', trigger: 'change' }
  ],
  condition: [
    { required: true, message: '请选择商品成色', trigger: 'change' }
  ],
  description: [
    { max: 500, message: '描述最多 500 个字符', trigger: 'blur' }
  ]
}

const handleAiDraft = async () => {
  if (aiLoading.value) return

  aiLoading.value = true
  try {
    const res = await ai.productDraft(form)
    const draft = res.data || {}
    form.title = draft.title ?? form.title
    form.description = draft.description ?? form.description
    form.category = draft.category ?? form.category
    form.condition = draft.condition ?? form.condition
    ElMessage.success('已生成发布文案')
  } catch (error) {
    console.error('AI 文案生成失败:', error)
    ElMessage.error(error.message || 'AI 文案生成失败')
  } finally {
    aiLoading.value = false
  }
}

const handlePriceSuggestion = async () => {
  if (aiLoading.value) return

  aiLoading.value = true
  try {
    const res = await ai.priceSuggestion({
      title: form.title,
      price: form.price,
      category: form.category,
      condition: form.condition,
      description: form.description,
      images: form.images
    })
    form.price = res.data.fairPrice
    ElMessage.success(`建议成交价 ￥${form.price}`)
  } catch (error) {
    console.error('AI 定价失败:', error)
    ElMessage.error(error.message || 'AI 定价失败')
  } finally {
    aiLoading.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    const res = await products.create({
      title: form.title,
      price: form.price,
      category: form.category,
      condition: form.condition,
      description: form.description,
      images: form.images
    })

    ElMessage.success('商品发布成功')
    router.push(`/product/${res.data.id}`)
  } catch (error) {
    if (error !== false) {
      console.error('发布商品失败:', error)
      ElMessage.error(error.message || '发布商品失败')
    }
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.back()
}
</script>

<style scoped>
.publish-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.publish-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.form-hint {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: var(--spacing-xs);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

.button-group .el-button {
  min-width: 120px;
}

@media (max-width: 768px) {
  .publish-card {
    margin: 0;
  }

  .button-group {
    flex-direction: column-reverse;
  }

  .button-group .el-button {
    width: 100%;
  }
}
</style>
