<template>
  <div
    v-show="shouldRender"
    ref="target"
    :style="computedStyle"
    data-scope="collapsible"
    :data-state
  >
    <div v-bind="innerAttrs || $attrs">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref, computed, toRef, onMounted, onBeforeUnmount } from 'vue'
import { useAnimatedVisibility } from './composables/useAnimatedVisibility'
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  isOpen: boolean

  innerAttrs?: HTMLAttributes
}>()

const target = ref<HTMLElement | null>(null)
const height = ref('0px')

const { shouldRender } = useAnimatedVisibility(
  target,
  toRef(() => props.isOpen),
)

const computedStyle = computed(() => ({
  '--height': height.value,
  overflow: 'hidden',
}))

let observer: ResizeObserver | null = null

onMounted(() => {
  if (!target.value) return

  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const newHeight = entry.target.scrollHeight
      height.value = `${newHeight}px`
    }
  })

  observer.observe(target.value)
})

onBeforeUnmount(() => {
  if (observer && target.value) {
    observer.unobserve(target.value)
    observer.disconnect()
  }
})

const dataState = computed(() => (props.isOpen ? 'open' : 'closed'))
</script>
