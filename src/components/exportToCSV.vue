<template>
  <Button size="sm" squared :disabled title="Export to CSV" @click="handleExport">
    <FileCSV class="w-5 h-5" />
  </Button>
</template>

<script setup lang="ts">
import Button from './Elements/Button.vue'
import FileCSV from '@/assets/icons/file-csv.svg'

const props = defineProps<{
  selection: Polygon[]
  disabled?: boolean
}>()

function handleExport() {
  let csv = ''
  let nbLocs = 0
  props.selection.forEach((polygon) => {
    polygon.found.forEach((coords) => {
      csv += `${coords.lat},${coords.lng},\n`
      nbLocs++
    })
  })
  const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
  const fileName = `Generated map (${nbLocs} location${nbLocs > 1 ? 's' : ''}).csv`
  const linkElement = document.createElement('a')
  linkElement.href = dataUri
  linkElement.download = fileName
  linkElement.click()
}
</script>
