<script setup lang="ts">
import GeoIcon from '@/assets/icons/geoicon.svg'
const { size } = defineProps({
  size: {
    type: String,
    default: '1',
  },
})
</script>

<template>
  <GeoIcon :style="{ width: size + 'rem' }" />
</template>

<style scoped>
svg {
  animation: spin 10s infinite ease-in-out;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-360deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
