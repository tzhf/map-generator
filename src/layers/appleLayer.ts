import * as L from 'leaflet';
import VectorTileLayer from 'leaflet-vector-tile-layer';

enum CoverageType {
    Car = 2,
    Trekker = 3,
}

type FeatureProps = {
    timestamp: number;
    coverage_type: CoverageType;
};

function determineLineColor(props: FeatureProps): string {
    return props.coverage_type === CoverageType.Trekker
        ? 'rgba(173, 140, 191, 1)'
        : 'rgba(26, 159, 176, 1)';
}

function determineLineWidth(zoom: number): number {
    return zoom > 13 ? 2 : zoom > 9 ? 1.5 : 1;
}


function createVectorLayer(minZoom: number, maxZoom: number,): L.Layer {
    return VectorTileLayer('https://lookmap.eu.pythonanywhere.com/bluelines2/{z}/{x}/{y}/', {
        style: (feature: any, zoom: number) => {
            if (feature.type !== 2) {
                return { opacity: 0, radius: 0, weight: 0 };
            }
            return {
                color: determineLineColor(feature.properties),
                weight: determineLineWidth(zoom),
                opacity: 1,
                fill: false,
            };
        },
        minZoom,
        maxNativeZoom: 14,
        maxZoom,
        interactive: false,
    });
}


export const AppleLayer = createVectorLayer(8, 15);
