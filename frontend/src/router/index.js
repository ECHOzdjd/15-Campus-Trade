import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',               component: () => import('../views/HomeView.vue') },
  { path: '/login',          component: () => import('../views/LoginView.vue') },
  { path: '/register',       component: () => import('../views/RegisterView.vue') },
  { path: '/product/:id',    component: () => import('../views/ProductDetailView.vue') },
  { path: '/publish',        component: () => import('../views/PublishView.vue'),        meta: { requiresAuth: true } },
  { path: '/product/:id/edit', component: () => import('../views/EditProductView.vue'), meta: { requiresAuth: true } },
  { path: '/orders',         component: () => import('../views/OrderListView.vue'),      meta: { requiresAuth: true } },
  { path: '/orders/:id',     component: () => import('../views/OrderDetailView.vue'),    meta: { requiresAuth: true } },
  { path: '/profile',        component: () => import('../views/ProfileView.vue'),        meta: { requiresAuth: true } },
  { path: '/my-products',    component: () => import('../views/MyProductsView.vue'),     meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫：未登录时跳转到登录页
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return '/login'
  }
})

export default router
