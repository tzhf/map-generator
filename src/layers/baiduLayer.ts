import * as L from "leaflet";
import gcoord from "gcoord";

const TILE_SIZE = 256;

function h(n: number) { return n * 180 / Math.PI; }

const I$1: Record<number, Record<number, number[]>> = {};
function y(n: number, t: number) {
    if (I$1[t] === undefined) I$1[t] = {};
    if (!Array.isArray(I$1[t][n])) I$1[t][n] = L$1(n, t);
    return I$1[t][n];
}
function L$1(n: number, t: number) {
    const r = t * Math.pow(2, n);
    return [r / 360, r / (2 * Math.PI), r / 2, r];
}
function X$1(n: [number, number], t: number, r = 512): [number, number] {
    const { atan: u, exp: o, PI: e } = Math;
    const [s, m, c] = y(t, r);
    const a = (n[1] - c) / -m;
    const p = (n[0] - c) / s;
    const A = h(2 * u(o(a)) - 0.5 * e);
    return [p, A];
}

function isInChinaBbox(lon: number, lat: number): boolean {
    return lon >= 72.004 && lon <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
}

function googleToBaidu([lng, lat]: [number, number]): [number, number] {
    return gcoord.transform([lng, lat], gcoord.GCJ02, gcoord.BD09MC);
}

function baiduToTile([x, y]: [number, number], zoom: number): [number, number] {
    const dpi = 2 ** (18 - zoom);
    return [x / dpi / TILE_SIZE, y / dpi / TILE_SIZE];
}

async function renderTile(
    bbox: [number, number, number, number],
    zoom: number,
    signal?: AbortSignal
): Promise<HTMLCanvasElement> {
    const topLeftBaidu = googleToBaidu([bbox[0], bbox[3]]);
    const bottomRightBaidu = googleToBaidu([bbox[2], bbox[1]]);

    const topLeftTile = baiduToTile(topLeftBaidu, zoom);
    const bottomRightTile = baiduToTile(bottomRightBaidu, zoom);

    const topLeftOffset = [
        (topLeftTile[0] - Math.floor(topLeftTile[0])) * TILE_SIZE,
        (1 - (topLeftTile[1] - Math.floor(topLeftTile[1]))) * TILE_SIZE
    ];

    const horzTileOffset = Math.floor(bottomRightTile[0]) - Math.floor(topLeftTile[0]);
    const vertTileOffset = Math.floor(topLeftTile[1]) - Math.floor(bottomRightTile[1]);

    const bottomRightOffset = [
        (horzTileOffset + bottomRightTile[0] - Math.floor(bottomRightTile[0])) * TILE_SIZE,
        (vertTileOffset + 1 - (bottomRightTile[1] - Math.floor(bottomRightTile[1]))) * TILE_SIZE
    ];

    const helper = new OffscreenCanvas(
        TILE_SIZE * (horzTileOffset + 1),
        TILE_SIZE * (vertTileOffset + 1)
    );
    const helpCtx = helper.getContext("2d")!;


    for (let x = Math.floor(topLeftTile[0]); x <= Math.floor(bottomRightTile[0]); x++) {
        for (let y = Math.floor(topLeftTile[1]); y >= Math.floor(bottomRightTile[1]); y--) {
            if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

            const img = new Image();
            img.width = TILE_SIZE;
            img.height = TILE_SIZE;

            const s = x % 2;

            img.src = `https://mapsv${s}.bdimg.com/tile/?udt=20200825&qt=tile&styles=pl&x=${x}&y=${y}&z=${zoom}`;

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Tile image load error"));
            });

            helpCtx.drawImage(
                img,
                (x - Math.floor(topLeftTile[0])) * TILE_SIZE,
                (y - Math.floor(topLeftTile[1])) * -TILE_SIZE
            );
        }
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = TILE_SIZE;
    finalCanvas.height = TILE_SIZE;

    finalCanvas.getContext("2d")!.drawImage(
        helper,
        topLeftOffset[0],
        topLeftOffset[1],
        bottomRightOffset[0] - topLeftOffset[0],
        Math.abs(bottomRightOffset[1] - topLeftOffset[1]),
        0,
        0,
        TILE_SIZE,
        TILE_SIZE
    );

    return finalCanvas;
}

export class BaiduLayer extends L.GridLayer {
    filter: string;
    constructor(options: L.GridLayerOptions & { filter?: string } = {}) {
        super(options);
        this.filter = options.filter || "";
    }

    #tiles = new Map<HTMLCanvasElement, AbortController>();

    createTile(coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement("canvas");
        if (coords.z < 5) {
            done(undefined, tile);
            return tile
        }
        tile.width = TILE_SIZE;
        tile.height = TILE_SIZE;
        const topLeftPixel = { x: coords.x * TILE_SIZE, y: coords.y * TILE_SIZE };
        const bottomRightPixel = { x: (coords.x + 1) * TILE_SIZE, y: (coords.y + 1) * TILE_SIZE };

        const topLeft = X$1([topLeftPixel.x, topLeftPixel.y], coords.z, TILE_SIZE);
        const bottomRight = X$1([bottomRightPixel.x, bottomRightPixel.y], coords.z, TILE_SIZE);

        if (
            !isInChinaBbox(topLeft[0], topLeft[1]) &&
            !isInChinaBbox(bottomRight[0], bottomRight[1])
        ) {
            done(undefined, tile);
            return tile;
        }

        const controller = new AbortController();

        renderTile(
            [topLeft[0], bottomRight[1], bottomRight[0], topLeft[1]],
            coords.z + 1,
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

        this.#tiles.set(tile, controller);

        return tile;
    }

    unloadTile(tile: HTMLElement) {
        const controller = this.#tiles.get(tile as HTMLCanvasElement);
        if (controller) {
            controller.abort();
            this.#tiles.delete(tile as HTMLCanvasElement);
        }
    }
}