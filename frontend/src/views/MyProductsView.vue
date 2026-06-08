<template>
  <div class="my-products-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div class="page-head">
            <div>
              <h1>我的商品</h1>
              <p>管理正在校园内流转的闲置物品。</p>
            </div>
            <el-button type="primary" @click="router.push('/publish')">发布商品</el-button>
          </div>

          <div v-loading="loading" class="product-list">
            <div v-if="productList.length" class="card-grid">
              <ProductCard
                v-for="product in productList"
                :key="product.id"
                :product="product"
                show-actions
                @edit="handleEdit"
                @delete="handleDelete"
              />
            </div>

            <el-empty v-else-if="!loading" description="还没有发布商品">
              <el-button type="primary" @click="router.push('/publish')">去发布</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { products } from '../api/index.js'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'

const router = useRouter()
const loading = ref(false)
const productList = ref([])

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await products.getMine()
    productList.value = res.data.products || []
  } catch (error) {
    console.error('获取我的商品失败:', error)
    ElMessage.error(error.message || '获取我的商品失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (product) => {
  router.push(`/product/${product.id}/edit`)
}

const handleDelete = async (product) => {
  try {
    await ElMessageBox.confirm(`确认删除《${product.title}》吗？`, '删除商品', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await products.remove(product.id)
    ElMessage.success('已删除')
    await fetchProducts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除商品失败:', error)
      ElMessage.error(error.message || '删除商品失败')
    }
  }
}

onMounted(fetchProducts)
</script>

<style scoped>
.my-products-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.page-head h1 {
  margin: 0 0 var(--spacing-xs);
}

.page-head p {
  margin: 0;
  color: var(--text-secondary);
}

.product-list {
  min-height: 320px;
}

@media (max-width: 768px) {
  .page-head {
    flex-direction: column;
  }
}
</style>
