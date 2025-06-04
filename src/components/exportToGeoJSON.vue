<template>
  <Button @click="exportToGeoJson()" variant="bordered" class="w-full" title="Export as GeoJSON"
    >GeoJSON</Button
  >
</template>

<script setup lang="ts">
import Button from './Elements/Button.vue'

const props = defineProps({
  selection: Array,
})

const exportToGeoJson = () => {
  const features = props.selection
    .map((country) =>
      country.found.map(({ lat, lng }) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      })),
    )
    .flat()

  const dataUri =
    'data:application/vnd.geo+json;charset=utf-8,' +
    encodeURIComponent(
      JSON.stringify({
        type: 'FeatureCollection',
        features: features,
      }),
    )
  const fileName = `Generated map (${features.length} location${features.length > 1 ? 's' : ''}).geojson`
  const linkElement = document.createElement('a')
  linkElement.href = dataUri
  linkElement.download = fileName
  linkElement.click()
}
</script>
