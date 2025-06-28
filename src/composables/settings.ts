import { reactive } from 'vue'
import { useStorage } from '@vueuse/core'
import { getCurrentDate } from '@/composables/utils.ts'

const { currentYear, currentDate } = getCurrentDate()

const defaultSettings = {
  numOfGenerators: 1,
  radius: 500,
  oneCountryAtATime: false,
  onlyCheckBlueLines: false,
  findRegions: false,
  regionRadius: 100,

  rejectUnofficial: true,
  rejectOfficial: false,
  findByGeneration: {
    enabled: true,
    generation: {
      1: false,
      23: true,
      4: true,
    },
  },
  rejectDateless: true,
  rejectNoDescription: true,
  rejectDescription: false,
  onlyOneInTimeframe: false,
  findPhotospheres: false,
  findDrones: false,
  checkLinks: false,
  linksDepth: 2,

  rejectByYear: false,
  fromDate: '2009-01',
  toDate: currentDate,
  fromMonth: '01',
  toMonth: '12',
  fromYear: '2007',
  toYear: currentYear,
  selectMonths: false,
  checkAllDates: false,
  randomInTimeline: false,

  findByTileColor: {
    enabled: false,
    zoom: 19,
    operator: 'OR',
    tileProvider: 'gmaps',
    tileColors: {
      gmaps: [
        {
          label: 'Highways',
          active: false,
          threshold: 0.05,
          colors: [
            '139,165,193', // rgb(139,165,193)
            '112,144,178', // rgb(112,144,178)
          ],
        },
        {
          label: 'Roads, streets',
          active: false,
          threshold: 0.05,
          colors: [
            '170,185,201', // rgb(170,185,201)
            '193,204,216', // rgb(193,204,216)
            '186,201,215', // rgb(186,201,215)
            '203,217,230', // rgb(203,217,230)
            '204,215,224', // rgb(204,215,224)
            '204,215,222', // rgb(204,215,222)
            '216,224,231', // rgb(216,224,231)
          ], // zoom levels: 1:19, 2:18 (found two colors at same zoom), 3:18, 4:17, 5:16, 6:15
        },
        {
          label: 'Smaller roads, pathways',
          active: false,
          threshold: 0.05,
          colors: [
            '219,224,232', // rgb(219,224,232) min zoom 17
          ],
        },
        {
          label: 'Train tracks',
          active: false,
          threshold: 0,
          colors: [
            '189,193,198', // rgb(189,193,198)
            '193,197,202', // rgb(193,197,202)
            '195,199,203', // rgb(195,199,203)
            '201,205,209', // rgb(201,205,209)
            '203,206,211', // rgb(203,206,211)
            '205,208,212', // rgb(205,208,212)
            '206,209,212', // rgb(206,209,212)
          ], // kind of arbitrary values as train tracks are really thin, but looks good enough and no false positives for now
        },
        {
          label: 'Buildings',
          active: false,
          threshold: 0.05,
          colors: [
            '232,233,237', // rgb(232,233,237) min zoom 17
          ],
        },
        {
          label: 'Commercial buildings',
          active: false,
          threshold: 0.05,
          colors: [
            '253,249,239', // rgb(253,249,239) min zoom 17
          ],
        },
        {
          label: 'Urban areas',
          active: false,
          threshold: 0.2,
          colors: [
            '248,247,247', // rgb(248,247,247) : 17 and above
            '246,245,245', // rgb(246,245,245) : 16
            '245,243,243', // rgb(245,243,243) : 15
          ],
        },
        {
          label: 'Airports, etc',
          active: false,
          threshold: 0.2,
          colors: [
            '231,237,252', // rgb(231,237,252) : 16 and above
            '230,237,249', // rgb(230,237,249) : 15
          ],
        },
        {
          label: 'Vegetation, trees, brush',
          active: false,
          threshold: 0.2,
          colors: [
            '211,248,226', // rgb(211,248,226) : all zooms
          ],
        },
        {
          label: 'Dense vegetation, thick forest',
          active: false,
          threshold: 0.2,
          colors: [
            '195,241,213', // rgb(195,241,213) : all zooms
          ],
        },
        {
          label: 'Scrub, grass',
          active: false,
          threshold: 0.2,
          colors: [
            '245,240,229', // rgb(245,240,229) : 15 and above
            '245,240,230', // rgb(245,240,230) : 15 and above
          ],
        },
        {
          label: 'Sparse vegetation, rocky ground',
          active: false,
          threshold: 0.2,
          colors: [
            '242,231,212', // rgb(242,231,212) : all zooms
          ],
        },
        {
          label: 'Sand dunes, glaciers...',
          active: false,
          threshold: 0.2,
          colors: [
            '235,233,229', // rgb(235,233,229) : 15 and above
            '255,255,255', // rgb(255,255,255) : glaciers all zooms
          ],
        },
        {
          label: 'Water',
          active: false,
          threshold: 0.2,
          colors: [
            '144,218,238', // rgb(144,218,238) : all zooms
          ],
        },
      ],
      osm: [
        { label: 'No data', active: false, threshold: 0.2, colors: ['242,239,233'] }, // rgb(242,239,233)
        { label: 'Motorway', active: false, threshold: 0.05, colors: ['232,146,162'] }, // rgb(232,146,162)
        { label: 'Main road 1', active: false, threshold: 0.05, colors: ['249,178,156'] }, // rgb(249,178,156)
        { label: 'Main road 2', active: false, threshold: 0.05, colors: ['252,214,164'] }, // rgb(252,214,164)
        { label: 'Main road 3', active: false, threshold: 0.05, colors: ['247,250,191'] }, // rgb(247,250,191)
        { label: 'White road', active: false, threshold: 0.05, colors: ['255,255,255'] }, // rgb(255,255,255)
        { label: 'Bridges', active: false, threshold: 0, colors: ['184,184,184'] }, // rgb(184,184,184) - min zoom 17
        {
          label: 'Train tracks',
          active: false,
          threshold: 0,
          colors: ['112,112,112'],
        }, // rgb(112,112,112)  secondary tracks are rgb(170,170,170) but some ports have the same color
        {
          label: 'Tracks',
          active: false,
          threshold: 0,
          colors: ['172,131,49'], // rgb(172,131,49)
        },

        {
          label: 'Footway',
          active: false,
          threshold: 0,
          colors: ['250,128,114'], // rgb(250,128,114)
        },
        { label: 'Forest, woods', active: false, threshold: 0.2, colors: ['173,209,158'] }, // rgb(173,209,158)
        { label: 'Grass, meadow', active: false, threshold: 0.2, colors: ['205,235,176'] }, // rgb(205,235,176)
        { label: 'Vineyard, orchard', active: false, threshold: 0.2, colors: ['174,223,163'] }, // rgb(174,223,163)
        { label: 'Farm', active: false, threshold: 0.2, colors: ['245,220,186'] }, // rgb(245,220,186)
        { label: 'Farmland', active: false, threshold: 0.2, colors: ['238,240,213'] }, // rgb(238,240,213)
        { label: 'Heathland', active: false, threshold: 0.2, colors: ['214,217,159'] }, // rgb(214,217,159)
        { label: 'Scrubland', active: false, threshold: 0.2, colors: ['200,215,171'] }, // rgb(200,215,171)
        {
          label: 'Bare rock',
          active: false,
          threshold: 0.2,
          colors: ['238,229,220', '237,228,220'],
        }, // rgb(238,229,220) - rgb(237,228,220)
        { label: 'Sand', active: false, threshold: 0.2, colors: ['245,233,198'] }, // rgb(245,233,198)
        { label: 'Beach, shoal', active: false, threshold: 0.2, colors: ['255,241,186'] }, // rgb(255,241,186)
        { label: 'Water', active: false, threshold: 0.2, colors: ['170,211,223'] }, // rgb(170,211,223)
        { label: 'Buildings', active: false, threshold: 0.05, colors: ['217,208,201'] }, // rgb(217,208,201)
        { label: 'Residential area', active: false, threshold: 0.2, colors: ['224,223,223'] }, // rgb(224,223,223)
        { label: 'Retail area', active: false, threshold: 0.2, colors: ['255,214,209'] }, // rgb(255,214,209)
        { label: 'Commercial area', active: false, threshold: 0.2, colors: ['242,218,217'] }, // rgb(242,218,217)
        { label: 'Industrial area', active: false, threshold: 0.2, colors: ['235,219,232'] }, // rgb(235,219,232)
        {
          label: 'Mines, construction site',
          active: false,
          threshold: 0.2,
          colors: ['197,195,195'],
        }, // rgb(197,195,195)
        { label: 'Brownfield site', active: false, threshold: 0.2, colors: ['199,199,180'] }, // rgb(199,199,180)
        { label: 'School, Hospital', active: false, threshold: 0.05, colors: ['255,255,229'] }, // rgb(255,255,229)
        { label: 'Park', active: false, threshold: 0.05, colors: ['200,250,204'] }, // rgb(200,250,204)
        { label: 'Place of worship', active: false, threshold: 0.05, colors: ['196,182,171'] }, // rgb(196,182,171)
        { label: 'Cemetery', active: false, threshold: 0.05, colors: ['170,203,175'] }, // rgb(170,203,175)
        { label: 'Sports pitch', active: false, threshold: 0.05, colors: ['136,224,190'] }, // rgb(136,224,190)
        { label: 'Sports center', active: false, threshold: 0.05, colors: ['223,252,226'] }, // rgb(223,252,226)
        { label: 'Camping, golf course', active: false, threshold: 0.05, colors: ['222,246,192'] }, // rgb(222,246,192)
      ],
    },
  } as TileColorConfig,

  getDeadEnds: false,
  deadEndsLookBackwards: false,
  getIntersection: false,
  getCurve: false,
  minCurveAngle: 10,

  heading: {
    adjust: true,
    reference: 'link',
    range: [0, 0],
    randomInRange: false,
  },
  pitch: {
    adjust: false,
    range: [0, 0],
    randomInRange: false,
  },
  zoom: {
    adjust: false,
    range: [0, 0],
    randomInRange: false,
  },
  markers: {
    gen1: true,
    gen2Or3: true,
    gen4: true,
    newRoad: true,
    noBlueLine: true,
    cluster: false,
  },
  markersOnImport: true,
  checkImports: false,
}

const storedSettings = useStorage('map_generator__settings_v5', defaultSettings)
const settings = reactive(storedSettings.value)
settings.toDate = currentDate
settings.toYear = currentYear

export { settings }
