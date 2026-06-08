import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../api/index.js'

const routes = [
  { path: '/',               component: () => import('../views/HomeView.vue') },
  { path: '/login',          component: () => import('../views/LoginView.vue') },
  { path: '/register',       component: () => import('../views/RegisterView.vue') },
  { path: '/test',           component: () => import('../views/TestView.vue') },
  { path: '/product/:id',    component: () => import('../views/ProductDetailView.vue') },
  { path: '/publish',        component: () => import('../views/PublishView.vue'),        meta: { requiresAuth: true } },
  { path: '/product/:id/edit', component: () => import('../views/EditProductView.vue'), meta: { requiresAuth: true } },
  { path: '/orders',         component: () => import('../views/OrderListView.vue'),      meta: { requiresAuth: true } },
  { path: '/orders/:id',     component: () => import('../views/OrderDetailView.vue'),    meta: { requiresAuth: true } },
  { path: '/wallet',         component: () => import('../views/WalletView.vue'),         meta: { requiresAuth: true } },
  { path: '/messages',       component: () => import('../views/ConversationListView.vue'), meta: { requiresAuth: true } },
  { path: '/messages/:id',   component: () => import('../views/ConversationDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/favorites',      component: () => import('../views/FavoritesView.vue'),      meta: { requiresAuth: true } },
  { path: '/profile',        component: () => import('../views/ProfileView.vue'),        meta: { requiresAuth: true } },
  { path: '/my-products',    component: () => import('../views/MyProductsView.vue'),     meta: { requiresAuth: true } },
  { path: '/admin',          component: () => import('../views/AdminView.vue'),          meta: { requiresAuth: true, requiresAdmin: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫：未登录时跳转到登录页
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return '/login'
  }

  if (to.meta.requiresAdmin && !(await isCurrentAdmin())) {
    return '/'
  }
})

export default router

function getTokenRole() {
  const token = localStorage.getItem('token')
  if (!token) return ''

  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role || ''
  } catch (_error) {
    return ''
  }
}

async function isCurrentAdmin() {
  if (getTokenRole() === 'admin') {
    return true
  }

  try {
    const res = await auth.getMe()
    return res.data?.role === 'admin'
  } catch (_error) {
    return false
  }
}
