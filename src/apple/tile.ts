import { Proto } from "@/apple/proto";
import { AppleLookAroundPano } from "./types";
import {
  distanceBetween,
  radians_to_degrees
} from "@/composables/utils";

function protobuf_tile_offset_to_wsg84(x_offset: number, y_offset: number, tile_x: number, tile_y: number) {
  let pano_x = tile_x + (x_offset / 64.0) / (256 - 1);
  let pano_y = tile_y + (255 - (y_offset / 64.0)) / (256 - 1);
  let coords = tile_coord_to_wgs84(pano_x, pano_y, 17);
  return coords;
}

function wgs84_to_tile_coord(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180.0;
  const scale = 1 << zoom;
  const x = ((lng + 180.0) / 360.0) * scale;
  const y = (1.0 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2.0 * scale;
  return [Math.floor(x), Math.floor(y)];
}

function tile_coord_to_wgs84(x: number, y: number, zoom: number) {
  const scale = 1 << zoom;
  const lonDeg = (x / scale) * 360.0 - 180.0;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale)));
  const latDeg = (latRad * 180.0) / Math.PI;
  return [latDeg, lonDeg];
}

function getCameraType(face: any): string {
  if(!face) return 'unknown'

  const fov_h = face.fovH
  const cy = face.cy

  if (
    Math.abs(fov_h - 1.6144296) < 0.01 &&
    Math.abs(cy - 0.27488935) < 0.01
  ) {
    return 'bigcam'
  }

  // smallcam/backpack
  if (
    Math.abs(fov_h - 1.8325957) < 0.01 &&
    Math.abs(cy - 0.30543262) < 0.01
  ) {
    return 'smallcam'
  }

  return 'unknown'
}

function headingFromUnknowns(unknown10: number, unknown11: number) {
  let westmin = 1;
  let westmax = 2159;
  let eastmin = 16383; // looking (north/south) and very slightly east
  let eastmax = 14318; // looking slightly (north/south) directly east
  let northmin = 8204; // this is likely lower
  let northmax = 6054;
  let southmin = 8204; // this is likely lower
  let southmax = 10173;
  var ew = 0;
  if (unknown10 < westmax) {
    ew = -((unknown10 - westmin) / (westmax - westmin));
  }
  else if (unknown10 > eastmax) {
    ew = ((unknown10 - eastmin) / (eastmax - eastmin));
  }
  var ns = 0;
  if (unknown11 <= northmin) {
    ns = ((unknown11 - northmin) / (northmax - northmin));
  }
  else {
    ns = -((unknown11 - southmin) / (southmax - southmin));
  }
  var r = radians_to_degrees(Math.atan2(ew, ns));
  if (r < 0) {
    r += 360;
  }
  return r;
}

async function getCoverageTileRaw(tileX: number, tileY: number) {
  const headers = new Headers({
    "Cache-Control": "no-cache",
    "maps-tile-style": "style=57&size=2&scale=0&v=0&preflight=2",
    "maps-tile-x": tileX.toString(),
    "maps-tile-y": tileY.toString(),
    "maps-tile-z": "17",
    "maps-auth-token": "w31CPGRO/n7BsFPh8X7kZnFG0LDj9pAuR8nTtH3xhH8=",
  });
  const CORS_PROXY = "https://cors-proxy.ac4.stocc.dev/"
  const url = CORS_PROXY + "https://gspe76-ssl.ls.apple.com/api/tile?";
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    console.error("Fetch failed:", res.status, text);
    throw new Error("Non-200 response");
  }
  const buf = await res.arrayBuffer();
  return await Proto.parseMapTile(buf);
}

const tileCache: Record<string, AppleLookAroundPano[]> = {};

async function getCoverageInMapTile(x: number, y: number): Promise<AppleLookAroundPano[]> {
  const key = `${x}/${y}`;

  if (tileCache[key]) {
    return tileCache[key];
  }

  try {
    const response = await getCoverageTileRaw(x, y);

    const coverage: AppleLookAroundPano[] = [];
    for (const pano of response.pano ?? []) {
      const coords = protobuf_tile_offset_to_wsg84(
        pano.tilePosition.x,
        pano.tilePosition.y,
        x,
        y
      );

      const p = new AppleLookAroundPano(
        pano.panoid?.toString() ?? "unknown",
        response.buildTable?.[pano.buildTableIdx].coverageType,
        getCameraType(response.cameraMetadata?.[pano.cameraMetadataIdx?.[0]]?.lensProjection),
        pano.timestamp?.toString() ?? "unknown",
        headingFromUnknowns(pano.tilePosition.pitch, pano.tilePosition.roll),
        coords[0],
        coords[1],
        pano.tilePosition.altitude
      );

      coverage.push(p);
    }

    tileCache[key] = coverage;
    return coverage;
  } catch (error) {
    console.error("Error fetching coverage for tile", x, y, error);
    return [];
  }
}

export async function getClosestPanoAtCoords(lat: number, lng: number): Promise<AppleLookAroundPano | null> {
  try {
    const [x, y] = wgs84_to_tile_coord(lat, lng, 17);
    const coverage = await getCoverageInMapTile(x, y);
    if (coverage && coverage.length === 0) return null;
    let closest: AppleLookAroundPano | null = null;
    let smallestDistance = Infinity;

    for (const pano of coverage) {
      const dist = distanceBetween({ lat, lng }, { lat: pano.lat, lng: pano.lng });
      if (dist < smallestDistance) {
        smallestDistance = dist;
        closest = pano;
      }
    }
    return closest;
  } catch (error) {
    console.error('getClosestPanoAtCoords error:', error);
    return null;
  }
}