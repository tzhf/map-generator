import 'leaflet'

// Extend Leaflet MarkerOptions to include forceZIndex
declare module 'leaflet' {
  interface MarkerOptions {
    forceZIndex?: number | null
    // Typescript complains if these are not included,
    // seems like contextmenu is expected in MarkerOptions as well even if only used in L.Map
    contextmenu?: boolean
    contextmenuItems?: []
  }

  interface Marker {
    polygonID: number
    // _icon?: HTMLElement
    // _zIndex?: number
    // _updateZIndex(offset: number): void
    // setForceZIndex(forceZIndex?: number | null): void
  }

  interface MarkerClusterGroup {
    enableClustering: () => void
    disableClustering: () => void
  }
}
