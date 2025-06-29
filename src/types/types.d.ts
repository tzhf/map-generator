/// <reference types="vite/client" />
/// <reference types="google.maps" />
/// <reference types="leaflet-draw" />

type LatLng = {
  lat: number
  lng: number
}

interface Feature extends GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  properties: {
    code: string
    name: string
    country: string
    [key: string]: string
  }
}

interface FeatureCollection extends GeoJSON.FeatureCollection {
  features: Feature[]
}

interface Polygon extends L.Polygon {
  _leaflet_id: number
  feature: Feature
  isProcessing: boolean
  nbNeeded: number
  found: Panorama[]
  checkedPanos: Set<string>
}

interface Panorama {
  panoId: string
  lat: LatLng.lat
  lng: LatLng.lng
  heading: number
  pitch: number
  zoom: number
  imageDate?: string
  links?: string[]
}

type TileOperators = 'AND' | 'OR' | 'NOT'
type TileProvider = 'osm' | 'gmaps'

interface TileColor {
  label: string
  active: boolean
  threshold: number
  colors: string[]
}

interface TileColorConfig {
  enabled: boolean
  zoom: number
  operator: TileOperators
  tileProvider: TileProvider
  tileColors: Record<TileProvider, TileColor[]>
}

interface SearchInDescriptionConfig {
  searchTerms: string
  searchMode: 'fullword' | 'startswith' | 'endswith' | 'contains'
  filterType: 'include' | 'exclude'
}
