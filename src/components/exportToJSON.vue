<template>
  <Button @click="exportToJson()" variant="bordered" class="w-full" title="Export as JSON">JSON</Button>
</template>

<script setup>
import Button from './Elements/Button.vue'

const props = defineProps({
  selection: Array,
})

const exportToJson = () => {
  let data = []
  props.selection.forEach((country) => (data = data.concat(country.found)))
  const dataUri =
    'data:application/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify({ customCoordinates: data }))
  const fileName = `Generated map (${data.length} location${data.length > 1 ? 's' : ''}).json`
  const linkElement = document.createElement('a')
  linkElement.href = dataUri
  linkElement.download = fileName
  linkElement.click()
}
</script>
