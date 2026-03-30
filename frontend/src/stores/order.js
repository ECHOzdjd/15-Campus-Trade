import { defineStore } from 'pinia'
import { ref } from 'vue'
import { orders as orderApi } from '../api/index.js'

export const useOrderStore = defineStore('order', () => {
  const list = ref([])
  const detail = ref(null)

  async function fetchList() {
    const res = await orderApi.getList()
    list.value = res.data
  }

  async function fetchDetail(id) {
    const res = await orderApi.getDetail(id)
    detail.value = res.data
  }

  return { list, detail, fetchList, fetchDetail }
})
