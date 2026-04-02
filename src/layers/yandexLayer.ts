import * as L from "leaflet";
import { radians_to_degrees } from '@/composables/utils'

const TILE_SIZE = 256;

const PROJECTION_CACHE: Record<number, Record<number, number[]>> = {};
function getProjectionParams(z: number, tileSize: number): number[] {
    if (!PROJECTION_CACHE[tileSize]) PROJECTION_CACHE[tileSize] = {};
    if (!PROJECTION_CACHE[tileSize][z]) {
        const r = tileSize * Math.pow(2, z);
        PROJECTION_CACHE[tileSize][z] = [r / 360, r / (2 * Math.PI), r / 2, r];
    }
    return PROJECTION_CACHE[tileSize][z];
}

function pixelToLatLng([x, y]: [number, number], z: number, tileSize = TILE_SIZE): [number, number] {
    const [scaleX, scaleY, offset, r] = getProjectionParams(z, tileSize);
    const lng = (x - offset) / scaleX;
    const lat = radians_to_degrees(2 * Math.atan(Math.exp((offset - y) / scaleY)) - Math.PI / 2);
    return [lng, lat];
}

function isInWorldBbox(lon: number, lat: number): boolean {
    return lon >= -180 && lon <= 180 && lat >= -85 && lat <= 85;
}

async function renderTile(
    bbox: [number, number, number, number],
    zoom: number,
    signal?: AbortSignal
): Promise<HTMLCanvasElement> {
    const topLeftTile = L.CRS.EPSG3395.latLngToPoint(L.latLng(bbox[3], bbox[0]), zoom).divideBy(TILE_SIZE);
    const bottomRightTile = L.CRS.EPSG3395.latLngToPoint(L.latLng(bbox[1], bbox[2]), zoom).divideBy(TILE_SIZE);

    const topLeftOffset = [
        (topLeftTile.x - Math.floor(topLeftTile.x)) * TILE_SIZE,
        (topLeftTile.y - Math.floor(topLeftTile.y)) * TILE_SIZE
    ];
    const horzTileCount = Math.floor(bottomRightTile.x) - Math.floor(topLeftTile.x);
    const vertTileCount = Math.floor(bottomRightTile.y) - Math.floor(topLeftTile.y);

    const helper = new OffscreenCanvas(
        TILE_SIZE * (horzTileCount + 1),
        TILE_SIZE * (vertTileCount + 1)
    );
    const ctx = helper.getContext("2d")!;

    for (let x = Math.floor(topLeftTile.x); x <= Math.floor(bottomRightTile.x); x++) {
        for (let y = Math.floor(topLeftTile.y); y <= Math.floor(bottomRightTile.y); y++) {
            if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

            const tileUrl = `https://core-stv-renderer.maps.yandex.net/2.x/tiles?l=stv&x=${x}&y=${y}&z=${zoom}&scale=1&v=2025.07.22.10.31-1_25.07.22-0-26058&client_id=yandex-web-maps`;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = tileUrl;

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load tile: ${tileUrl}`));
            });

            ctx.drawImage(
                img,
                (x - Math.floor(topLeftTile.x)) * TILE_SIZE,
                (y - Math.floor(topLeftTile.y)) * TILE_SIZE
            );
        }
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = TILE_SIZE;
    finalCanvas.height = TILE_SIZE;
    const finalCtx = finalCanvas.getContext("2d")!;
    finalCtx.drawImage(
        helper,
        topLeftOffset[0],
        topLeftOffset[1],
        TILE_SIZE,
        TILE_SIZE,
        0,
        0,
        TILE_SIZE,
        TILE_SIZE
    );

    return finalCanvas;
}

export class YandexLayer extends L.GridLayer {
    filter: string;
    private tiles = new Map<HTMLCanvasElement, AbortController>();

    constructor(options: L.GridLayerOptions & { filter?: string } = {}) {
        super(options);
        this.filter = options.filter || "";
    }

    createTile(coords: L.Coords, done: L.DoneCallback): HTMLCanvasElement {
        const tile = document.createElement("canvas");

        tile.width = TILE_SIZE;
        tile.height = TILE_SIZE;
        if (coords.z < 5) {
            done(undefined, tile);
            return tile
        }

        const topLeftPixel = {
            x: coords.x * TILE_SIZE,
            y: coords.y * TILE_SIZE
        };
        const bottomRightPixel = {
            x: (coords.x + 1) * TILE_SIZE,
            y: (coords.y + 1) * TILE_SIZE
        };

        const topLeft = pixelToLatLng([topLeftPixel.x, topLeftPixel.y], coords.z);
        const bottomRight = pixelToLatLng([bottomRightPixel.x, bottomRightPixel.y], coords.z);

        if (
            !isInWorldBbox(topLeft[0], topLeft[1]) &&
            !isInWorldBbox(bottomRight[0], bottomRight[1])
        ) {
            done(undefined, tile);
            return tile;
        }

        const controller = new AbortController();

        renderTile(
            [topLeft[0], bottomRight[1], bottomRight[0], topLeft[1]],
            coords.z,
            controller.signal
        )
            .then(canvas => {
                const ctx = tile.getContext("2d");
                ctx?.drawImage(canvas, 0, 0);
                tile.style.filter = this.filter;
                done(undefined, tile);
            })
            .catch(err => {
                if (err.name === "AbortError") {
                    done(undefined, tile);
                } else {
                    done(err, tile);
                }
            });

        this.tiles.set(tile, controller);
        return tile;
    }

    unloadTile(tile: HTMLElement) {
        const controller = this.tiles.get(tile as HTMLCanvasElement);
        if (controller) {
            controller.abort();
            this.tiles.delete(tile as HTMLCanvasElement);
        }
    }
}
