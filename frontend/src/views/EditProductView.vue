<template>
  <div class="edit-product-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <el-card class="form-card" v-loading="loading">
            <template #header>
              <h2>编辑商品</h2>
            </template>

            <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
              <el-form-item label="商品标题" prop="title">
                <el-input v-model="form.title" maxlength="100" show-word-limit clearable />
              </el-form-item>

              <el-form-item label="商品价格" prop="price">
                <el-input v-model.number="form.price" type="number" clearable>
                  <template #prepend>¥</template>
                </el-input>
              </el-form-item>

              <el-form-item label="商品分类" prop="category">
                <el-select v-model="form.category" clearable>
                  <el-option label="数码产品" value="数码产品" />
                  <el-option label="图书教材" value="图书教材" />
                  <el-option label="生活用品" value="生活用品" />
                  <el-option label="交通工具" value="交通工具" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </el-form-item>

              <el-form-item label="商品成色" prop="condition">
                <el-select v-model="form.condition" clearable>
                  <el-option label="全新" value="new" />
                  <el-option label="几乎全新" value="like_new" />
                  <el-option label="轻微使用痕迹" value="good" />
                  <el-option label="明显使用痕迹" value="fair" />
                </el-select>
              </el-form-item>

              <el-form-item label="商品状态" prop="status">
                <el-select v-model="form.status">
                  <el-option label="在售" value="available" />
                  <el-option label="已售出" value="sold" />
                  <el-option label="下架" value="removed" />
                </el-select>
              </el-form-item>

              <el-form-item label="商品描述" prop="description">
                <el-input v-model="form.description" type="textarea" :rows="5" maxlength="500" show-word-limit />
              </el-form-item>

              <el-form-item label="商品图片">
                <ImageUploader v-model="form.images" :max-count="5" />
              </el-form-item>

              <div class="actions">
                <el-button @click="router.back()">取消</el-button>
                <el-button type="primary" :loading="saving" @click="handleSubmit">保存修改</el-button>
              </div>
            </el-form>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { products } from '../api/index.js'
import AppHeader from '../components/AppHeader.vue'
import ImageUploader from '../components/ImageUploader.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const formRef = ref(null)

const form = reactive({
  title: '',
  price: null,
  category: '',
  condition: '',
  status: 'available',
  description: '',
  images: []
})

const rules = {
  title: [
    { required: true, message: '请输入商品标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度为 1-100 个字符', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', message: '价格必须是数字', trigger: 'blur' }
  ],
  category: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  condition: [{ required: true, message: '请选择商品成色', trigger: 'change' }],
  status: [{ required: true, message: '请选择商品状态', trigger: 'change' }]
}

const fetchProduct = async () => {
  loading.value = true
  try {
    const res = await products.getDetail(route.params.id)
    Object.assign(form, {
      title: res.data.title,
      price: Number(res.data.price),
      category: res.data.category,
      condition: res.data.condition,
      status: res.data.status,
      description: res.data.description || '',
      images: res.data.images || []
    })
  } catch (error) {
    console.error('获取商品失败:', error)
    ElMessage.error(error.message || '获取商品失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    await products.update(route.params.id, {
      title: form.title,
      price: form.price,
      category: form.category,
      condition: form.condition,
      status: form.status,
      description: form.description,
      images: form.images
    })
    ElMessage.success('已保存')
    router.push(`/product/${route.params.id}`)
  } catch (error) {
    if (error !== false) {
      console.error('保存商品失败:', error)
      ElMessage.error(error.message || '保存商品失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(fetchProduct)
</script>

<style scoped>
.edit-product-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.form-card {
  max-width: 820px;
  margin: 0 auto;
}

.form-card h2 {
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

@media (max-width: 768px) {
  .actions {
    flex-direction: column-reverse;
  }
}
</style>
