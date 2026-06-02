<template>
  <div class="favorites-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <div class="page-head">
            <h1>我的收藏</h1>
            <p>保存感兴趣的商品，后续再联系卖家沟通面交。</p>
          </div>

          <div v-loading="loading" class="favorite-list">
            <div v-if="productList.length" class="card-grid">
              <ProductCard
                v-for="product in productList"
                :key="product.id"
                :product="product"
              />
            </div>

            <el-empty v-else-if="!loading" description="暂无收藏">
              <el-button type="primary" @click="router.push('/')">去首页看看</el-button>
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
import { favorites } from '../api/index.js'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'

const router = useRouter()
const loading = ref(false)
const productList = ref([])

const fetchFavorites = async () => {
  loading.value = true
  try {
    const res = await favorites.getList()
    productList.value = res.data.products || []
  } catch (error) {
    console.error('获取收藏失败:', error)
    ElMessage.error(error.message || '获取收藏失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchFavorites)
</script>

<style scoped>
.favorites-page {
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

.favorite-list {
  min-height: 320px;
}
</style>
