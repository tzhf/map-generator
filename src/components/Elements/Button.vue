<script setup lang="ts">
import { computed } from 'vue'

const { size = 'md', variant = 'primary' } = defineProps<{
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'danger' | 'warning' | 'bordered'
}>()

const baseClass =
  'hover:brightness-105 transition-filter duration-200 cursor-pointer rounded-sm shadow-[0_0_3px_rgba(0,0,0,0.3)]'

const sizeClass = computed(() => {
  const sizes = {
    sm: 'text-xs px-1 py-0.5',
    md: 'text-sm px-3 py-2',
    lg: 'px-6 py-3',
  }
  return sizes[size]
})

const variantClass = computed(() => {
  const variants = {
    primary: 'bg-primary text-black',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-black',
    bordered: 'border border-primary bg-black/50',
  }
  return variants[variant]
})
</script>

<template>
  <button :class="[baseClass, sizeClass, variantClass]">
    <slot />
  </button>
</template>
