<template>
  <div style="padding: 40px; text-align: center;">
    <h2>{{ title }}</h2>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const title = computed(() => route.path)
</script>
