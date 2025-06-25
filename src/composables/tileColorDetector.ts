function lat2tile(lat: number, zoom: number) {
  return Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      Math.pow(2, zoom),
  )
}

function lng2tile(lng: number, zoom: number) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
}

export function getTileUrl(loc: LatLng, type: TileProvider, zoom: number) {
  const tileX = lng2tile(loc.lng, zoom)
  const tileY = lat2tile(loc.lat, zoom)
  return type === 'osm'
    ? `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`
    : `https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i${zoom}!2i${tileX}!3i${tileY}!2i9!3x1!2m2!1e0!2sm!3m5!2sen!3sus!5e1105!12m1!1e3!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0`
  // `https://mt1.google.com/vt/lyrs=m&x=${tileX}&y=${tileY}&z=${zoom}`
}

export async function getTileColorPresence(loc: LatLng, config: TileColorConfig): Promise<boolean> {
  const tileSize = 256
  const url = getTileUrl({ lat: loc.lat, lng: loc.lng }, config.tileProvider, config.zoom)
  const response = await fetch(url)
  const blob = await response.blob()
  const imageBitmap = await createImageBitmap(blob)

  const canvas = new OffscreenCanvas(tileSize, tileSize)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  ctx.drawImage(imageBitmap, 0, 0, tileSize, tileSize)
  const data = ctx.getImageData(0, 0, tileSize, tileSize).data

  const pixelCount = tileSize * tileSize
  const matchCountMap = new Map<string, number>()

  const targetColors = config.tileColors[config.tileProvider]

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const key = `${r},${g},${b}`

    if (targetColors[key]?.active) {
      matchCountMap.set(key, (matchCountMap.get(key) || 0) + 1)
    }
  }

  // Evaluate matches
  const activeKeys = Object.keys(targetColors).filter((k) => targetColors[k].active)

  const results = activeKeys.map((key) => {
    const count = matchCountMap.get(key) || 0
    const ratio = count / pixelCount
    return ratio >= targetColors[key].threshold
  })

  if (config.operator === 'AND') {
    return results.length > 0 && results.every(Boolean)
  } else if (config.operator === 'OR') {
    return results.some(Boolean)
  } else if (config.operator === 'NOT') {
    return results.every((match) => !match)
  }

  return false // fallback, shouldn't happen
}
