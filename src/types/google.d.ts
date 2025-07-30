declare namespace google.maps {
  interface StreetViewPanoramaData {
    time?: {
      pano: string
      [key?: string]: Date
    }[]
  }

  interface StreetViewLocation {
    altitude?: number | null;
    country?: string | null;
  }
}
