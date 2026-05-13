<template>
  <div class="home-page">
    <AppHeader />

    <div class="page-wrapper">
      <div class="container">
        <div class="page-content">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <div class="filter-left">
              <el-select
                v-model="filters.category"
                placeholder="全部分类"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="全部分类" value="" />
                <el-option label="数码产品" value="数码产品" />
                <el-option label="图书教材" value="图书教材" />
                <el-option label="生活用品" value="生活用品" />
                <el-option label="交通工具" value="交通工具" />
                <el-option label="其他" value="其他" />
              </el-select>

              <el-select
                v-model="filters.sortBy"
                placeholder="排序方式"
                @change="handleFilterChange"
              >
                <el-option label="最新发布" value="createdAt" />
                <el-option label="价格从低到高" value="price_asc" />
                <el-option label="价格从高到低" value="price_desc" />
              </el-select>
            </div>

            <div class="filter-right">
              <span class="result-count">共 {{ total }} 件商品</span>
            </div>
          </div>

          <!-- 商品列表 -->
          <div v-loading="loading" class="product-list">
            <div v-if="productList.length > 0" class="card-grid">
              <ProductCard
                v-for="product in productList"
                :key="product.id"
                :product="product"
              />
            </div>

            <!-- 空状态 -->
            <div v-else-if="!loading" class="empty-state">
              <div class="empty-state-icon">📦</div>
              <div class="empty-state-text">暂无商品</div>
              <div class="empty-state-hint">
                {{ filters.search ? '试试其他关键词' : '快来发布第一个商品吧' }}
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="total > 0" class="pagination-wrapper">
            <el-pagination
              :current-page="pagination.page"
              :page-size="pagination.pageSize"
              :total="total"
              :page-sizes="[12, 24, 48]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { products } from '../api/index.js'
import { ElMessage } from 'element-plus'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'

const route = useRoute()

const loading = ref(false)
const productList = ref([])
const total = ref(0)

// 筛选条件
const filters = reactive({
  search: '',
  category: '',
  sortBy: 'createdAt'
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 12
})

// 获取商品列表
const fetchProducts = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: filters.search || undefined,
      category: filters.category || undefined,
      status: 'available'
    }

    // 处理排序
    if (filters.sortBy === 'price_asc') {
      params.sortBy = 'price'
      params.sortOrder = 'asc'
    } else if (filters.sortBy === 'price_desc') {
      params.sortBy = 'price'
      params.sortOrder = 'desc'
    } else {
      params.sortBy = 'createdAt'
      params.sortOrder = 'desc'
    }

    const res = await products.getList(params)
    productList.value = res.data.products || []
    total.value = res.data.total || 0
  } catch (error) {
    console.error('获取商品列表失败:', error)
    ElMessage.error(error.message || '获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 筛选变化
const handleFilterChange = () => {
  pagination.page = 1
  fetchProducts()
}

// 页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchProducts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 每页数量变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchProducts()
}

// 监听路由查询参数变化（搜索）
watch(() => route.query.search, (newSearch) => {
  filters.search = newSearch || ''
  pagination.page = 1
  fetchProducts()
}, { immediate: true })

// 初始化
onMounted(() => {
  filters.search = route.query.search || ''
  fetchProducts()
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #ffffff;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
}

.filter-left {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.filter-right {
  flex-shrink: 0;
}

.result-count {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.product-list {
  min-height: 400px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-xl) 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-left {
    width: 100%;
  }

  .filter-left .el-select {
    flex: 1;
  }

  .filter-right {
    text-align: center;
  }

  .pagination-wrapper :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
