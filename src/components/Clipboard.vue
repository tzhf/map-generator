<template>
  <Button
    v-if="isSupported"
    size="sm"
    squared
    :disabled
    title="Copy to clipboard"
    @click="handleCopy"
  >
    <ClipboardCheckedIcon v-if="copied" class="w-5 h-5" />
    <ClipboardIcon v-else class="w-5 h-5" />
  </Button>
</template>

<script setup lang="ts">
import Button from './Elements/Button.vue'
import ClipboardIcon from '@/assets/icons/clipboard.svg'
import ClipboardCheckedIcon from '@/assets/icons/clipboard-checked.svg'
import { useClipboard } from '@vueuse/core'
const { copy, copied, isSupported } = useClipboard()

const props = defineProps<{
  data: Polygon[]
  disabled?: boolean
}>()

function handleCopy() {
  let data: Panorama[] = []
  props.data.forEach((polygon) => (data = data.concat(polygon.found)))
  copy(JSON.stringify({ customCoordinates: data }))
}
</script>
