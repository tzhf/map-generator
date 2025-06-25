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
      gmaps: {
        '139,165,193': { active: false, threshold: 0.05, label: 'Highways' },
        '170,185,201': { active: false, threshold: 0.05, label: 'Roads, streets' },
        '219,224,232': { active: false, threshold: 0.05, label: 'Smaller roads, pathways' },
        '232,233,237': { active: false, threshold: 0.05, label: 'Buildings' },
        '248,247,247': { active: false, threshold: 0.2, label: 'Urban areas' },
        '231,237,252': { active: false, threshold: 0.2, label: 'Airports, etc' },
        '245,240,229': { active: false, threshold: 0.2, label: 'Scrub, grass' },
        '242,231,212': { active: false, threshold: 0.2, label: 'Sparse vegetation, rocky ground' },
        '211,248,226': { active: false, threshold: 0.2, label: 'Vegetation, trees, brush' },
        '195,241,213': { active: false, threshold: 0.2, label: 'Dense vegetation, thick forest' },
        '144,218,238': { active: false, threshold: 0.2, label: 'Water' },
      },
      osm: {
        '242,239,233': { active: false, threshold: 0.2, label: 'No data' },
        '232,146,162': { active: false, threshold: 0.05, label: 'Motorway' },
        '249,178,156': { active: false, threshold: 0.05, label: 'Main road 1' },
        '252,214,164': { active: false, threshold: 0.05, label: 'Main road 2' },
        '247,250,191': { active: false, threshold: 0.05, label: 'Main road 3' },
        '255,255,255': { active: false, threshold: 0.05, label: 'White road' },
        '173,209,158': { active: false, threshold: 0.2, label: 'Forest, woods' },
        '205,235,176': { active: false, threshold: 0.2, label: 'Grass, meadow' },
        '174,223,163': { active: false, threshold: 0.2, label: 'Vineyard, orchard' },
        '245,220,186': { active: false, threshold: 0.2, label: 'Farm' },
        '238,240,213': { active: false, threshold: 0.2, label: 'Farmland' },
        '214,217,159': { active: false, threshold: 0.2, label: 'Heathland' },
        '200,215,171': { active: false, threshold: 0.2, label: 'Scrubland' },
        '238,229,220': { active: false, threshold: 0.2, label: 'Bare rock' },
        '245,233,198': { active: false, threshold: 0.2, label: 'Sand' },
        '200,250,204': { active: false, threshold: 0.2, label: 'Park' },
        '217,208,201': { active: false, threshold: 0.05, label: 'Buildings' },
        '224,223,223': { active: false, threshold: 0.2, label: 'Residential area' },
        '255,214,209': { active: false, threshold: 0.2, label: 'Retail area' },
        '242,218,217': { active: false, threshold: 0.2, label: 'Commercial area' },
        '235,219,232': { active: false, threshold: 0.2, label: 'Industrial area' },
        '199,199,180': { active: false, threshold: 0.2, label: 'Brownfield site' },
        '196,182,171': { active: false, threshold: 0.2, label: 'Place of worship' },
        '136,224,190': { active: false, threshold: 0.05, label: 'Sports pitch' },
        '223,252,226': { active: false, threshold: 0.05, label: 'Sports center' },
        '222,246,192': { active: false, threshold: 0.05, label: 'Golf course, camping' },
        '255,255,229': { active: false, threshold: 0.05, label: 'School, Hospital' },
        '170,211,223': { active: false, threshold: 0.2, label: 'Water' },
      },
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

const storedSettings = useStorage('map_generator__settings_v2', defaultSettings)
const settings = reactive(storedSettings.value)
settings.toDate = currentDate
settings.toYear = currentYear

export { settings }
