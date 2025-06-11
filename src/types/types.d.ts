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
  imageDate?: string
  links?: string[]
}
