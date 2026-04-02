export function sendNotification(title: string, body: string) {
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  } catch (error) {
    console.warn('Notification failed:', error)
  }
}

export function isOfficial(pano: string, provider: string) {
  switch (provider) {
    case 'google':
      return pano.length === 22  // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
    // return (!/^\xA9 (?:\d+ )?Google$/.test(pano.copyright))
    case 'apple':
      return pano.length === 19
    case 'bing':
      return true
    case 'yandex':
      return pano.length === 34
    case 'tencent':
      return pano.length === 23
    case 'baidu':
      return pano.length === 27
    case 'kakao':
      return true
    default:
      return false
  }
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

export function getStreetViewStatus(key: keyof typeof google.maps.StreetViewStatus): google.maps.StreetViewStatus {
  return google?.maps?.StreetViewStatus?.[key] ?? key
}

export function makeLatLng(lat: number, lng: number): google.maps.LatLng {
  return new google.maps.LatLng(lat, lng)
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

export function getCameraGeneration(
  pano: google.maps.StreetViewPanoramaData,
  provider: string
): number | string {
  const {width, height} = pano.tiles.worldSize;

  if (provider === 'google') {
    switch (height) {
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

  if (provider === 'apple' || provider === 'bing') {
    return Number(pano.location?.description);
  }

  if (provider === 'yandex') {
    if (!width) return 0;
    if (width === 17664) return 2;
    if (width === 5632) return 1;
    return 'trekker';
  }

  return 0;
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove punctuation
    .trim()
}

function tokenize(text: string) {
  return text.split(/[\s_,.;!?()'"“”«»]+/).filter(Boolean)
}

function sectionmatch(text: string, target: string): boolean {
  const term = normalizeText(target)
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents

  const pattern = new RegExp(`(^${term}$|^${term},|,\\s*${term}$|,\\s*${term},)`, 'i')

  return pattern.test(normalized)
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

  const description = loc.description ?? ''
  const shortDescription = loc.shortDescription ?? ''
  const combinedDescription = `${description} ${shortDescription}`

  const normalizedText = normalizeText(combinedDescription)
  const words = tokenize(combinedDescription).map(normalizeText)

  const hasMatch = searchTerms.some((term) => {
    switch (searchConfig.searchMode) {
      case 'contains':
        return normalizedText.includes(term)
      case 'fullword':
        const phrase = words.join(' ')
        return new RegExp(`\\b${term}\\b`, 'i').test(phrase)
      case 'startswith':
        return words.some((word) => word.startsWith(term))
      case 'endswith':
        return words.some((word) => word.endsWith(term))
      case 'sectionmatch':
        return sectionmatch(description, term) || sectionmatch(shortDescription, term)
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

export function extractDateFromPanoId(pano: string) {
  const year = 2000 + Number(pano.slice(0, 2));
  const month = pano.slice(2, 4);
  const day = pano.slice(4, 6);
  const hour = pano.slice(6, 8);
  const minute = pano.slice(8, 10);
  const second = pano.slice(10, 12);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export function formatTimeStr(datetimeStr: string): string {
  const date = new Date(datetimeStr);
  if (isNaN(date.getTime())) throw new Error("Invalid date string");
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const sec = date.getSeconds().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
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

export function radians_to_degrees(radians: number) {
  var pi = Math.PI;
  return radians * (180 / pi);
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

const A$1 = 114.59155902616465;
const SCALE = 111319.49077777778;
function deg2rad(deg: number) {
  return deg * Math.PI / 180;
}

export function tencentToGcj02([x, y]: [number, number]) {
  return [
    x / SCALE,
    A$1 * Math.atan(Math.exp(deg2rad(y / SCALE))) - 90
  ];
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

export async function readFileAsText(file: File) {
  const result = await new Promise<string>((resolve) => {
    const fileReader = new FileReader()
    fileReader.onload = () => resolve(fileReader.result as string)
    fileReader.readAsText(file)
  })
  return result
}

export function isValidGeoJSON(data: unknown) {
  if (typeof data !== 'object' || data === null) return false

  const type = (data as { type?: unknown }).type
  return type === 'Feature' || type === 'FeatureCollection'
}
