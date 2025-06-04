<script setup lang="ts">
import { computed } from 'vue'

const {
  size = 'md',
  variant = 'default',
  squared = false,
  disabled = false,
} = defineProps<{
  size?: 'sm' | 'md' | 'lg'
  squared?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'warning' | 'bordered'
  disabled?: boolean
}>()

const baseClass =
  'text-nowrap hover:brightness-105 border border-black/20 transition-filter duration-200 cursor-pointer rounded-sm shadow-[0_0_3px_rgba(0,0,0,0.3)]'

const sizeClass = computed(() => {
  const squaredSizes = {
    sm: 'text-xs p-0.25',
    md: 'text-sm p-1.5',
    lg: 'p-2',
  }

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-3 py-2',
    lg: 'px-6 py-3',
  }
  return squared ? squaredSizes[size] : sizes[size]
})

const variantClass = computed(() => {
  const variants = {
    default: 'bg-gray-200 text-black',
    primary: 'bg-primary text-black',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-black',
    bordered: 'border border-primary bg-black/50',
  }
  return variants[variant]
})

const disabledClass = computed(() =>
  disabled ? '!bg-gray-400 text-white pointer-events-none' : '',
)
</script>

<template>
  <button
    @mousedown.prevent
    tabindex="-1"
    :class="[baseClass, sizeClass, variantClass, disabledClass]"
  >
    <slot />
  </button>
</template>
