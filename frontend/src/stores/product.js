import { defineStore } from 'pinia'
import { ref } from 'vue'
import { products as productApi } from '../api/index.js'

export const useProductStore = defineStore('product', () => {
  const list = ref([])
  const detail = ref(null)
  const myProducts = ref([])

  async function fetchList(params) {
    const res = await productApi.getList(params)
    list.value = res.data
  }

  async function fetchDetail(id) {
    const res = await productApi.getDetail(id)
    detail.value = res.data
  }

  async function fetchMyProducts() {
    const res = await productApi.getMine()
    myProducts.value = res.data
  }

  return { list, detail, myProducts, fetchList, fetchDetail, fetchMyProducts }
})
