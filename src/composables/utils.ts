export function isOfficial(pano: string) {
  return pano.length === 22 // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
  // return (!/^\xA9 (?:\d+ )?Google$/.test(pano.copyright))
}

export function isPhotosphere(res: google.maps.StreetViewPanoramaData) {
  return res.links?.length === 0
}

export function isDrone(res: google.maps.StreetViewPanoramaData) {
  return isPhotosphere(res) && [2048, 7200].includes(res.tiles.worldSize.height)
}

export function hasAnyDescription(location: google.maps.StreetViewLocation) {
  return location.description || location.shortDescription
}

export function isAcceptableCurve(
  links: google.maps.StreetViewLink[],
  minCurveAngle: number,
): boolean {
  if (links.length !== 2 || links[0].heading == null || links[1].heading == null) return false

  const angleDifference = Math.abs(links[0].heading - links[1].heading) % 360
  const smallestAngle = angleDifference > 180 ? 360 - angleDifference : angleDifference
  const curveAngle = Math.abs(180 - smallestAngle)
  return curveAngle >= minCurveAngle
}

export function getCameraGeneration(pano: google.maps.StreetViewPanoramaData) {
  const { worldSize } = pano.tiles
  switch (worldSize.height) {
    case 1664:
      return 1
    case 6656:
      return 23
    case 8192:
      return 4
    default:
      return 0
  }
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
}

function tokenize(text: string) {
  return text.split(/[\s\-_,.;!?()'"“”«»]+/).filter(Boolean)
}

export function searchInDescription(
  loc: google.maps.StreetViewLocation,
  searchConfig: SearchInDescriptionConfig,
) {
  if (!searchConfig.searchTerms.trim()) return true

  const searchTerms = searchConfig.searchTerms
    .split(',')
    .map((term) => normalizeText(term.trim()))
    .filter(Boolean)

  if (searchTerms.length === 0) return true

  const combinedDescription = `${loc.description ?? ''} ${loc.shortDescription ?? ''}`
  const normalizedText = normalizeText(combinedDescription)
  const words = tokenize(combinedDescription).map(normalizeText)

  const hasMatch = searchTerms.some((term) => {
    switch (searchConfig.searchMode) {
      case 'fullword':
        return words.includes(term)
      case 'startswith':
        return words.some((word) => word.startsWith(term))
      case 'endswith':
        return words.some((word) => word.endsWith(term))
      case 'contains':
      default:
        return normalizedText.includes(term)
    }
  })
  return searchConfig.filterType === 'exclude' ? !hasMatch : hasMatch
}

/**
 * Returns a timestamp (in ms) for the given date, truncated to the year and month (local time).
 * Example: new Date("Fri Oct 01 2021") → 1630454400000 (for "2021-10")
 */
export function getCurrentDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return {
    currentYear: year,
    currentDate: `${year}-${month}`,
  }
}

// this will parse the Date object from res.time[i] (like Fri Oct 01 2021 00:00:00 GMT-0700 (Pacific Daylight Time)) to a local timestamp, like Date.parse("2021-09") == 1630454400000 for Pacific Daylight Time
export function parseDate(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const monthStr = month < 10 ? `0${month}` : `${month}`
  return Date.parse(`${year}-${monthStr}`)
}

export const isDate = (date: string) => {
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

export function randomPointInPoly(polygon: Polygon) {
  const bounds = polygon.getBounds()
  const x_min = bounds.getEast()
  const x_max = bounds.getWest()
  const y_min = bounds.getSouth()
  const y_max = bounds.getNorth()
  const lat =
    (Math.asin(
      Math.random() * (Math.sin((y_max * Math.PI) / 180) - Math.sin((y_min * Math.PI) / 180)) +
        Math.sin((y_min * Math.PI) / 180),
    ) *
      180) /
    Math.PI
  const lng = x_min + Math.random() * (x_max - x_min)
  return { lat, lng }
}

export function distanceBetween(coords1: LatLng, coords2: LatLng) {
  const toRad = (value: number) => (value * Math.PI) / 180 // Converts numeric degrees to radians

  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(coords2.lat - coords1.lat)
  const dLon = toRad(coords2.lng - coords1.lng)
  const lat1 = toRad(coords1.lat)
  const lat2 = toRad(coords2.lat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c
  return d
}

export function randomInRange(min: number, max: number) {
  return Math.round((Math.random() * (max - min + 1) + min) * 100) / 100
}

export function getPolygonName(properties: Polygon['feature']['properties']) {
  return (
    properties.name ||
    properties.NAME ||
    properties.NAMELSAD ||
    properties.NAMELSAD10 ||
    properties.city ||
    properties.CITY ||
    properties.county ||
    properties.COUNTY ||
    properties.COUNTY_STATE_CODE ||
    properties.COUNTY_STATE_NAME ||
    properties.PRNAME ||
    properties.prov_name_en ||
    properties.state ||
    properties.STATE ||
    properties.country ||
    properties.COUNTRY ||
    properties.id ||
    properties.ID ||
    'Untitled Polygon'
  )
}

export function changePolygonName(properties: Polygon['feature']['properties']) {
  // if (typeof polygon.feature.properties.code == 'undefined') {
  const newName = prompt('New name for polygon: ')
  if (typeof newName === 'string' && newName !== '') {
    properties.name = newName
  }
  //let countryCode = prompt("Country code (optional): ");
  //polygon.feature.properties.code = countryCode;
  // }
}

export const polygonStyles = {
  defaultHidden: () => ({
    opacity: 0,
    fillOpacity: 0,
  }),

  customPolygonStyle: () => ({
    weight: 2,
    color: getRandomColor(),
    fillOpacity: 0,
  }),

  highlighted: () => ({
    fillColor: getRandomColor(),
    fillOpacity: 0.5,
  }),

  removeHighlight: () => ({
    fillOpacity: 0,
  }),
}

export function isValidGeoJSON(data: unknown) {
  if (typeof data !== 'object' || data === null) return false

  const type = (data as { type?: unknown }).type
  return type === 'Feature' || type === 'FeatureCollection'
}

function getRandomColor() {
  const red = Math.floor(((1 + Math.random()) * 256) / 2)
  const green = Math.floor(((1 + Math.random()) * 256) / 2)
  const blue = Math.floor(((1 + Math.random()) * 256) / 2)
  return 'rgb(' + red + ', ' + green + ', ' + blue + ')'
}
