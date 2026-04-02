import * as protomapsL from "protomaps-leaflet"

function createPmtilesLayer() {
  return protomapsL.leafletLayer({
    url: "https://qq-map.netlify.app/lines.pmtiles",
    minZoom:5,
    maxDataZoom: 11,
    paintRules: [
      { dataLayer: "sv", symbolizer: new protomapsL.LineSymbolizer({ color: "#bac8ff", width: 5 }), maxzoom: 5 },
      { dataLayer: "sv", symbolizer: new protomapsL.LineSymbolizer({ color: "#bac8ff", width: 3 }), minzoom: 6 },
      { dataLayer: "sv", symbolizer: new protomapsL.LineSymbolizer({ color: "#4263eb", width: 1 }) },
      { dataLayer: "ccf", symbolizer: new protomapsL.LineSymbolizer({ color: "#bac8ff", width: 5 }), maxzoom: 5 },
      { dataLayer: "ccf", symbolizer: new protomapsL.LineSymbolizer({ color: "#bac8ff", width: 3 }), minzoom: 6 },
      { dataLayer: "ccf", symbolizer: new protomapsL.LineSymbolizer({ color: "#4263eb", width: 1 }) }
    ]
  })
}

export const TencentCoverageLayer =createPmtilesLayer() as any
