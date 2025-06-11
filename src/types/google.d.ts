declare namespace google.maps {
  interface StreetViewPanoramaData {
    time?: {
      pano: string
      [key?: string]: Date
    }[]
  }
}
