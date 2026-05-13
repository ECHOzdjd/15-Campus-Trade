import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../api/index.js'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function clearToken() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  async function fetchUserInfo() {
    const res = await auth.getMe()
    userInfo.value = res.data
  }

  return { token, userInfo, setToken, clearToken, fetchUserInfo }
})
