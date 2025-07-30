import { extractDateFromPanoId, formatTimeStr } from '@/composables/utils'
import { getClosestPanoAtCoords } from "@/apple/tile";
import { AppleLookAroundPano } from "@/apple/types";
import { createPayload } from '@/composables/utils';
import gcoord from 'gcoord'

let svService: google.maps.StreetViewService | null = null
const applePanoCache = new Map<string, google.maps.StreetViewPanoramaData>()

function getStreetViewService() {
    if (!svService) {
        svService = new google.maps.StreetViewService()
    }
    return svService
}

function parseGoogle(data: any): google.maps.StreetViewPanoramaData {
    try {
        let roadName = null;
        let country = null;
        let desc_raw = null;
        let shortDesc_raw = null;

        const panoId = data[1][0][1][1];
        const lat = data[1][0][5][0][1][0][2];
        const lng = data[1][0][5][0][1][0][3];
        const heading = data[1][0][5][0][1][2][0];
        const worldsize = data[1][0][2][2];

        const imageYear = data[1][0][6][7][0];
        const imageMonth = data[1][0][6][7][1];
        const imageDate = `${imageYear}-${String(imageMonth).padStart(2, '0')}`;

        const historyRaw = data[1][0][5][0][8];
        const linksRaw = data[1][0][5][0][6];
        const nodes = data[1][0][5][0][3][0];

        const altitude = data[1][0][5][0][1][1][0]

        try {
            country = data[1][0][5][0][1][4];
            if (['TW', 'HK', 'MO'].includes(country)) {
                country = 'CN';
            }
        } catch (e) { }
        try {
            roadName = data[1][0][5][0][12][0][0][0][2][0];
        } catch (e) { }
        try {
            desc_raw = data[1][0][3][2][1][0]
        } catch (e) {
            try { desc_raw = data[1][0][3][0][0] } catch (error) { }
        }
        try {
            shortDesc_raw = data[1][0][3][2][0][0]
        } catch (e) { try { shortDesc_raw = data[1][0][3][0][0] } catch (error) { } }

        const history = historyRaw ? (historyRaw.map((node: any) => ({
            pano: nodes[node[0]][0][1],
            date: new Date(`${node[1][0]}-${String(node[1][1]).padStart(2, '0')}`),
        })))
            : [];
        const panorama: google.maps.StreetViewPanoramaData = {
            location: {
                pano: panoId,
                latLng: new google.maps.LatLng(lat, lng),
                description: !desc_raw && !shortDesc_raw ? null : `${shortDesc_raw}, ${desc_raw}`,
                shortDescription: shortDesc_raw,
                altitude,
                country
            },
            links: linksRaw.map((link: any) => ({
                pano: nodes[link[0]][0][1],
                heading: link[1][3] ?? 0,
            })) ?? [],
            tiles: {
                centerHeading: heading,
                tileSize: new google.maps.Size(512, 512),
                worldSize: new google.maps.Size(worldsize[1], worldsize[0]),
                getTileUrl: () => '',
            },
            imageDate,
            copyright: '© Google',
            time: [...history, { pano: panoId, date: new Date(imageDate) }]
                .sort((a, b) => a.date.getTime() - b.date.getTime()),
        };

        return panorama;
    } catch (error: any) {
        console.error('Failed to parse panorama data:', error.message);
        throw new Error('Invalid panorama data format');
    }
}

async function getMetadata(
    pano: string,
): Promise<any> {
    try {
        const endpoint = `https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/GetMetadata`;
        const payload = createPayload(pano);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json+protobuf",
                "x-user-agent": "grpc-web-javascript/0.1"
            },
            body: payload,
            mode: "cors",
            credentials: "omit"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(`Error fetching Google panorama: ${error.message}`);
    }
}


// Google
async function getFromGoogle(
    request: google.maps.StreetViewLocationRequest | google.maps.StreetViewPanoRequest,
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus,
    ) => void,
) {
    const sv = getStreetViewService()
    if ('pano' in request && typeof request.pano === 'string' && request.pano.length == 22) {
        try {
            const result = await getMetadata(request.pano)
            if (result.length > 1) onCompleted(parseGoogle(result), google.maps.StreetViewStatus.OK)
            else onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
        }
        catch (error) {
            console.error('Error fetching Google panorama:', error)
            onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
        }
    }
    else {
        await sv.getPanorama(request, onCompleted)
    }

}



// Apple Look Around
async function getFromApple(
    request: google.maps.StreetViewLocationRequest & { pano?: string },
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus
    ) => void
) {
    try {
        let apple: AppleLookAroundPano | null = null

        if (request.pano && applePanoCache.has(request.pano)) {
            onCompleted(applePanoCache.get(request.pano)!, google.maps.StreetViewStatus.OK)
            return
        }

        if (request.location) {
            const lat = typeof request.location.lat === 'function' ? request.location.lat() : request.location.lat
            const lng = typeof request.location.lng === 'function' ? request.location.lng() : request.location.lng
            apple = await getClosestPanoAtCoords(lat, lng)
        }

        if (!apple?.panoId) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const date = new Date(apple.date)
        const panorama: google.maps.StreetViewPanoramaData = {
            location: {
                pano: apple.panoId,
                latLng: new google.maps.LatLng(apple.lat, apple.lng),
                description: apple.coverage_type == 3 ? "backpack" : (apple.camera_type),
                altitude: apple.altitude
            },
            links: [],
            tiles: {
                centerHeading: apple.heading,
                tileSize: new google.maps.Size(256, 256),
                worldSize: new google.maps.Size(16384, 8192),
                getTileUrl: () => "",
            },
            imageDate: date.toISOString(),
            copyright: "© Apple Look Around",
            time: [{ pano: apple.panoId, date: date } as any],
        }

        applePanoCache.set(apple.panoId, panorama)

        onCompleted(panorama, google.maps.StreetViewStatus.OK)
    } catch (error) {
        console.error("[Apple Look Around] panorama fetch error:", error)
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    }
}

// Yandex
async function getFromYandex(
    request: google.maps.StreetViewLocationRequest & { pano?: string },
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus,
    ) => void,
) {
    try {
        let panoId: string | undefined

        if (request.pano) {
            panoId = request.pano
        } else if (request.location) {
            const { lat, lng } = request.location
            const uri = `https://api-maps.yandex.com/services/panoramas/1.x/?l=stv&lang=en_US&origin=userAction&provider=streetview&ll=${lng},${lat}`
            const resp = await fetch(uri)
            const json = await resp.json()
            panoId = json?.data?.Data?.panoramaId
        }

        if (!panoId) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const uri = `https://api-maps.yandex.com/services/panoramas/1.x/?l=stv&lang=en_US&origin=userAction&provider=streetview&oid=${panoId}`
        const resp = await fetch(uri)
        const json = await resp.json()
        const result = json.data

        if (!result?.Data?.panoramaId) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const date = new Date(Number(result.Data.panoramaId.split('_').pop()) * 1000)
        const heading = (result.Data.EquirectangularProjection.Origin[0] + 180) % 360

        const panorama: google.maps.StreetViewPanoramaData = {
            location: {
                pano: panoId,
                latLng: new google.maps.LatLng(result.Data.Point.coordinates[1], result.Data.Point.coordinates[0]),
                description: result.Data.Point.name
            },
            links: result.Annotation?.Thoroughfares?.map((r: any) => ({
                pano: new URL(r.Connection.href).searchParams.get('oid'),
                heading: 0,
            })) ?? [],
            tiles: {
                centerHeading: heading,
                tileSize: new google.maps.Size(256, 256),
                worldSize: new google.maps.Size(result.Data.Images.Zooms[0].width, result.Data.Images.Zooms[0].height),
                getTileUrl: () => '',
            },
            imageDate: date.toISOString(),
            copyright: result.Author ? result.Author.name : '© Yandex Maps',
            time: [
                ...(result.Annotation?.HistoricalPanoramas?.map((r: any) => ({
                    pano: r.Connection.oid,
                    date: new Date(Number(r.Connection.oid.split('_').pop()) * 1000),
                })) ?? []),
                {
                    pano: panoId,
                    date: date,
                },
            ].sort((a, b) => a.date.getTime() - b.date.getTime()),
        }

        onCompleted(panorama, google.maps.StreetViewStatus.OK)
    } catch (err) {
        console.error('[Yandex] panorama fetch error:', err)
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    }
}

// Bing
async function getFromTencent(
    request: google.maps.StreetViewLocationRequest & { pano?: string },
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus,
    ) => void,
) {
    try {
        let panoId: string | undefined

        if (request.pano) {
            panoId = request.pano
        } else if (request.location) {
            const { lat, lng } = request.location
            const r = request.radius || 50
            const uri = `https://sv.map.qq.com/xf?output=json&charset=utf-8&lng=${lng}&lat=${lat}&r=${r}`
            const resp = await fetch(uri)
            const json = await resp.json()
            panoId = json?.detail?.svid
        }

        if (!panoId) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const uri = `https://sv.map.qq.com/sv?output=json&svid=${panoId}`
        const resp = await fetch(uri)
        const json = await resp.json()
        const result = json?.detail

        if (!result?.basic?.svid) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const date = extractDateFromPanoId(result.basic.svid.slice(8, 20))
        const [lng, lat] = gcoord.transform([result.addr.x_lng, result.addr.y_lat], gcoord.GCJ02, gcoord.WGS84)
        const trans_svid = result.basic.trans_svid

        const panorama: google.maps.StreetViewPanoramaData = {
            location: {
                pano: panoId,
                latLng: new google.maps.LatLng(lat, lng),
                description: result.basic.append_addr,
                shortDescription: result.basic.mode === "night" ? panoId : (trans_svid || null),
                country: 'CN'
            },
            links: result.all_scenes?.map((r: any) => ({
                pano: r.svid,
                heading: 0,
            })) ?? [],
            tiles: {
                centerHeading: Number(result.basic.dir),
                tileSize: new google.maps.Size(512, 512),
                worldSize: new google.maps.Size(8192, 4096),
                getTileUrl: () => '',
            },
            imageDate: date,
            copyright: '© Tencent Maps',
            time: [
                ...(result.history?.nodes?.map((r: any) => ({
                    pano: r.svid,
                    date: new Date(extractDateFromPanoId(r.svid.slice(8, 20))),
                })) ?? []),
                {
                    pano: panoId,
                    date: new Date(date),
                },
            ].sort((a, b) => a.date.getTime() - b.date.getTime()),
        }

        onCompleted(panorama, google.maps.StreetViewStatus.OK)
    } catch (err) {
        console.error('[Tencent] panorama fetch error:', err)
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    }
}

// Bing
async function getFromBing(
    request: google.maps.StreetViewLocationRequest & { pano?: string },
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus,
    ) => void,
) {
    try {
        let panoId: string | undefined
        const BING_SEARCH_URL = "https://t.ssl.ak.tiles.virtualearth.net/tiles/cmd/StreetSideBubbleMetaData"

        if (request.pano) {
            panoId = request.pano
        } else if (request.location) {
            const lat = typeof request.location.lat === 'function' ? request.location.lat() : request.location.lat
            const lng = typeof request.location.lng === 'function' ? request.location.lng() : request.location.lng
            const radius = request.radius || 50
            const rangeDeg = radius / 1000 / 111;
            const uri = new URL(BING_SEARCH_URL)
            uri.searchParams.set("count", "50");
            uri.searchParams.set("north", (lat + rangeDeg).toString());
            uri.searchParams.set("south", (lat - rangeDeg).toString());
            uri.searchParams.set("east", (lng + rangeDeg).toString());
            uri.searchParams.set("west", (lng - rangeDeg).toString());

            const resp = await fetch(uri)
            const json = await resp.json()
            const results = Array.isArray(json) ? json.slice(1) : []
            const result = results.length > 0
                ? results[Math.floor(Math.random() * results.length)]
                : null
            panoId = result ? result.id : null
        }

        if (!panoId) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const uri = new URL(BING_SEARCH_URL)
        uri.searchParams.set("id", panoId)
        const resp = await fetch(uri)
        const json = await resp.json()
        const result = json?.[1]

        if (!result?.id) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }
        const date = new Date(result.cd)

        const links: google.maps.StreetViewLink[] = []
        if (result.pr) links.push({
            pano: String(result.pr),
            heading: (result.he + 180) % 360,
            description: ''
        })
        if (result.ne) links.push({
            pano: result.ne.toString(),
            heading: result.he,
            description: ''
        })
        if (result.nbn) {
            for (const link of result.nbn) {
                if (result.id != link.id) {
                    links.push({
                        pano: link.id.toString(),
                        heading: link.az,
                        description: ''
                    })
                }
            }
        }

        const panorama: google.maps.StreetViewPanoramaData = {
            location: {
                pano: panoId,
                latLng: new google.maps.LatLng(result.la, result.lo),
                description: String(result.ml),
                altitude: result.al
            },
            links,
            tiles: {
                centerHeading: result.he,
                tileSize: new google.maps.Size(512, 512),
                worldSize: new google.maps.Size(8192, 4096),
                getTileUrl: () => '',
            },
            imageDate: formatTimeStr(result.cd),
            copyright: '© Bing Streetside',
            time: [{ pano: result.panoId, date: date }],
        }

        onCompleted(panorama, google.maps.StreetViewStatus.OK)
    } catch (err) {
        console.error('[Tencent] panorama fetch error:', err)
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    }
}

// Kakao
async function getFromKakao(
    request: google.maps.StreetViewLocationRequest & { pano?: string },
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus,
    ) => void,
) {
    try {
        let uri: string

        if (request.pano) {
            uri = `https://rv.map.kakao.com/roadview-search/v2/node/${request.pano}?SERVICE=glpano`
        } else if (request.location) {
            const { lat, lng } = request.location

            const rad = request.radius || 50
            uri = `https://rv.map.kakao.com/roadview-search/v2/nodes?PX=${lng}&PY=${lat}&RAD=${rad}&PAGE_SIZE=1&INPUT=wgs&TYPE=w&SERVICE=glpano`
        } else {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const resp = await fetch(uri)
        const json = await resp.json()
        const result = json.street_view?.street ?? json.street_view?.streetList?.[0]

        if (!result) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const date = result.shot_date
        const panoId = result.id.toString()
        const heading = (parseFloat(result.angle) + 180) % 360

        const res: google.maps.StreetViewPanoramaData = {
            location: {
                pano: panoId,
                latLng: new google.maps.LatLng(result.wgsy, result.wgsx),
                description: result.addr,
                country: 'KR'
            },
            links: result.spot?.map((r: any) => ({
                pano: r.id.toString(),
                heading: (parseFloat(r.pan) % 180) + (heading > 180 ? 180 : 0),
            })) ?? [],
            imageDate: date,
            tiles: {
                centerHeading: heading,
                getTileUrl: () => '',
                tileSize: new google.maps.Size(512, 512),
                worldSize: new google.maps.Size(8192, 4096),
            },
            copyright: '© Kakao Maps',
            time: [
                ...(result.past?.map((r: any) => ({
                    date: new Date(r.shot_date),
                    pano: r.id.toString(),
                })) ?? []),
                {
                    date: new Date(date),
                    pano: panoId,
                },
            ].sort((a, b) => a.date.getTime() - b.date.getTime()),
        }

        onCompleted(res, google.maps.StreetViewStatus.OK)
    } catch (err) {
        console.error('[Kakao] panorama fetch error:', err)
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    }
}

// Baidu
async function getFromBaidu(
    request: google.maps.StreetViewLocationRequest & { pano?: string },
    onCompleted: (
        res: google.maps.StreetViewPanoramaData | null,
        status: google.maps.StreetViewStatus,
    ) => void,
) {
    try {
        let panoId: string | undefined

        if (request.pano) {
            panoId = request.pano
        } else if (request.location) {

            const lat = typeof request.location.lat === 'function' ? request.location.lat() : request.location.lat
            const lng = typeof request.location.lng === 'function' ? request.location.lng() : request.location.lng

            const [bd09mcLng, bd09mcLat] = gcoord.transform([lng, lat], gcoord.WGS84, gcoord.BD09MC)
            const r = request.radius || 50
            const uri = `https://mapsv0.bdimg.com/?qt=qsdata&x=${bd09mcLng}&y=${bd09mcLat}&r=${r}`
            const resp = await fetch(uri)
            const json = await resp.json()
            panoId = json?.content?.id
        }

        if (!panoId) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const uri = `https://mapsv0.bdimg.com/?qt=sdata&sid=${panoId}`
        const resp = await fetch(uri)
        const json = await resp.json()
        const result = json.content[0]

        if (!result?.ID) {
            onCompleted(null, google.maps.StreetViewStatus.ZERO_RESULTS)
            return
        }

        const date = extractDateFromPanoId(panoId.slice(10, 22))
        const [lng, lat] = gcoord.transform([result.X / 100, result.Y / 100], gcoord.BD09MC, gcoord.WGS84);
        const panorama: google.maps.StreetViewPanoramaData = {
            location: {
                pano: panoId,
                latLng: new google.maps.LatLng(lat, lng),
                description: result.Rname,
                altitude: result.Z,
                country: 'CN'
            },
            links: result.Links?.map((r: any) => ({
                pano: r.PID,
                heading: 0,
            })) ?? [],
            tiles: {
                centerHeading: result.Heading,
                tileSize: new google.maps.Size(512, 512),
                worldSize: new google.maps.Size(8192, 4096),
                getTileUrl: () => '',
            },
            imageDate: date,
            copyright: '© Baidu Maps',
            time: [
                ...(result.TimeLine?.map((r: any) => ({
                    pano: r.ID,
                    date: new Date(extractDateFromPanoId(r.ID.slice(10, 22))),
                })) ?? []),
                {
                    pano: panoId,
                    date: new Date(date),
                },
            ].sort((a, b) => a.date.getTime() - b.date.getTime()),
        }

        onCompleted(panorama, google.maps.StreetViewStatus.OK)
    } catch (err) {
        console.error('[Baidu] panorama fetch error:', err)
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    }
}

const StreetViewProviders = {
    getPanorama: async (
        provider: string,
        request: google.maps.StreetViewLocationRequest & { pano?: string },
        onCompleted: (
            res: google.maps.StreetViewPanoramaData | null,
            status: google.maps.StreetViewStatus,
        ) => void,
    ) => {
        if (provider === 'google') {
            await getFromGoogle(request, onCompleted)
            return
        }
        else if (provider === "apple") {
            await getFromApple(request, onCompleted);
            return;
        }
        else if (provider === 'tencent') {
            await getFromTencent(request, onCompleted)
            return
        }
        else if (provider === "bing") {
            await getFromBing(request, onCompleted);
            return;
        }
        else if (provider === 'baidu') {
            await getFromBaidu(request, onCompleted)
            return
        }
        else if (provider === 'yandex') {
            await getFromYandex(request, onCompleted)
            return
        }
        else if (provider === 'kakao') {
            await getFromKakao(request, onCompleted)
            return
        }
        onCompleted(null, google.maps.StreetViewStatus.UNKNOWN_ERROR)
    },
}


export default StreetViewProviders
