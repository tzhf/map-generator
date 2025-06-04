<template>
  <div id="map"></div>
  <div id="leaflet-ui"></div>
  <div class="absolute top-1 left-1 w-100 max-h-[calc(100vh-178px)] flex flex-col gap-1">
    <Logo />
    <div class="flex-1 min-h-0 flex flex-col gap-1">
      <div v-if="!state.started" class="container flex flex-col">
        <div class="relative cursor-pointer" @click="panels.layer = !panels.layer">
          <h2>Layers</h2>
          <ChevronDownIcon class="collapsible-indicator absolute top-0 right-0" />
        </div>

        <Collapsible
          :is-open="panels.layer"
          class="flex flex-col gap-1 max-h-[140px] overflow-y-auto mt-2 p-1"
        >
          <div v-for="layer in availableLayers" :key="layer.key" class="flex gap-1 justify-between">
            <Checkbox v-model="layer.visible" @change="toggleLayer(layer)" class="truncate">
              <span class="truncate">{{ layer.label }}</span>
            </Checkbox>
            <div class="flex gap-1">
              <Button size="sm" @click="selectLayer(layer.key)">Select All</Button>
              <Button size="sm" variant="danger" @click="deselectLayer(layer.key)">
                Deselect All
              </Button>
              <Button squared size="sm" @click="exportLayer(layer)">
                <FileExportIcon class="w-5 h-5" />
              </Button>
            </div>
          </div>
          <input
            type="file"
            class="mr-auto mt-1"
            @change="importLayer"
            accept=".txt,.json,.geojson"
          />
        </Collapsible>
      </div>

      <div v-if="!state.started" class="container font-bold text-center">{{ select }}</div>

      <div v-if="selected.length" class="container flex-1 min-h-0 flex flex-col gap-1">
        <h2>Countries/Territories ({{ selected.length }})</h2>
        <div class="px-1">
          <Checkbox v-model="settings.markersOnImport" title="This may affect performance.">
            Add markers to imported locations
          </Checkbox>
          <Checkbox v-model="settings.checkImports" title="Useful for comprehensive datasets.">
            Check imported locations
          </Checkbox>
          <hr />
        </div>

        <div class="flex flex-col gap-1 overflow-y-auto px-1 pb-1">
          <div
            v-for="polygon of selected"
            :key="polygon._leaflet_id"
            class="flex items-center gap-2"
          >
            <Button size="sm" squared title="Import locations">
              <label class="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  hidden
                  @change="importLocations($event, polygon)"
                />
                <FileImportIcon class="w-5 h-5" />
              </label>
            </Button>
            <span
              v-if="polygon.feature.properties.code"
              :class="`flag-icon flag-` + polygon.feature.properties.code.toLowerCase()"
            ></span>
            <label
              class="flex-grow truncate min-h-5 cursor-text"
              @click="changePolygonName(polygon.feature.properties)"
            >
              {{ getPolygonName(polygon.feature.properties) }}
            </label>
            <Spinner v-if="state.started && polygon.isProcessing" />

            <div class="ml-auto flex items-center gap-1">
              {{ polygon.found.length }}
              <span>/</span>
              <input
                type="number"
                :min="polygon.found ? polygon.found.length : 0"
                v-model="polygon.nbNeeded"
              />
            </div>

            <div class="flex gap-1">
              <Clipboard :selection="[polygon as Polygon]" :disabled="!polygon.found.length" />
              <ExportToJSON :selection="[polygon as Polygon]" :disabled="!polygon.found.length" />
              <ExportToCSV :selection="[polygon as Polygon]" :disabled="!polygon.found.length" />
              <Button
                size="sm"
                squared
                variant="danger"
                :disabled="!polygon.found.length"
                title="Delete locations for polygon"
                @click="clearPolygon(polygon as Polygon)"
              >
                <TrashBinIcon class="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="flex items-center gap-2 p-1">
        <h2>Export all ({{ totalLocs }})</h2>
        <Button
          class="ml-auto"
          size="sm"
          title="Change locations cap for all selected"
          @click="changeLocationsCaps"
          >Edit cap for all
        </Button>
        <div class="flex gap-1">
          <Clipboard :selection="selected as Polygon[]" :disabled="!totalLocs" />
          <ExportToJSON :selection="selected as Polygon[]" :disabled="!totalLocs" />
          <ExportToCSV :selection="selected as Polygon[]" :disabled="!totalLocs" />
          <Button
            size="sm"
            squared
            variant="danger"
            :disabled="!totalLocs"
            title="Delete all locations"
            @click="clearAllLocations"
          >
            <TrashBinIcon class="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <div
    class="absolute top-1 right-1 w-88 max-h-[calc(100vh-8px)] overfslow-hidden flex flex-col gap-1"
  >
    <div class="flex flex-col gap-1 flex-1 min-h-0">
      <div v-if="!state.started" class="container flex flex-col">
        <div
          class="relative cursor-pointer"
          @click="panels.generatorSettings = !panels.generatorSettings"
        >
          <h2>Generator settings</h2>
          <ChevronDownIcon class="collapsible-indicator absolute top-0 right-0" />
        </div>

        <Collapsible :is-open="panels.generatorSettings" class="mt-1 p-1 pr-2">
          <div class="flex justify-between">
            Generators :
            <div class="flex items-center gap-2">
              {{ settings.numOfGenerators }}
              <input type="range" v-model.number="settings.numOfGenerators" min="1" max="10" />
            </div>
          </div>

          <div class="flex items-center justify-between">
            Radius :
            <span>
              <input type="number" v-model.number="settings.radius" @change="handleRadiusInput" />
              m
            </span>
          </div>

          <Checkbox v-model="settings.oneCountryAtATime">
            Only check one country/polygon at a time.
          </Checkbox>

          <Checkbox
            v-model="settings.onlyCheckBlueLines"
            title="Significatly speeds up generation in areas with sparse coverage density. May negatively affect speeds if generating locations exclusively in areas with very dense coverage. (Official coverage only)"
          >
            Only check in areas with blue lines
          </Checkbox>

          <div v-if="!settings.rejectOfficial">
            <Checkbox v-model="settings.findRegions">Minimum distance between locations</Checkbox>
            <div v-if="settings.findRegions" class="ml-6">
              <input type="number" v-model.number="settings.regionRadius" /> <span> km </span>
            </div>
          </div>
        </Collapsible>
      </div>

      <div v-if="!state.started" class="container flex flex-col flex-1 min-h-0">
        <div
          class="cursor-pointer relative"
          @click="panels.coverageSettings = !panels.coverageSettings"
        >
          <h2>Coverage settings</h2>
          <ChevronDownIcon class="collapsible-indicator absolute top-0 right-0" />
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto">
          <Collapsible :is-open="panels.coverageSettings" class="p-1">
            <Checkbox v-if="!settings.rejectOfficial" v-model="settings.rejectUnofficial"
              >Reject unofficial</Checkbox
            >

            <Checkbox v-model="settings.rejectOfficial">Find unofficial coverage</Checkbox>
            <Checkbox v-if="settings.rejectOfficial" v-model="settings.findDrones"
              >Find drone photospheres</Checkbox
            >

            <div v-if="settings.rejectUnofficial && !settings.rejectOfficial">
              <Checkbox v-model="settings.rejectDateless">Reject locations without date</Checkbox>

              <Checkbox v-if="!settings.rejectDescription" v-model="settings.rejectNoDescription">
                Reject locations without description
              </Checkbox>

              <Checkbox v-model="settings.rejectDescription">Find trekker coverage</Checkbox>

              <Checkbox
                v-model="settings.onlyOneInTimeframe"
                title="Only allow locations that don't have other nearby coverage in timeframe."
              >
                Only one panorama on location
              </Checkbox>

              <Checkbox v-model="settings.checkLinks">Check linked panos</Checkbox>
              <div v-if="settings.checkLinks" class="flex items-center justify-between ml-6">
                Depth :
                <div class="flex items-center gap-2">
                  {{ settings.linksDepth }}
                  <input type="range" v-model.number="settings.linksDepth" min="1" max="10" />
                </div>
              </div>

              <Checkbox v-model="settings.findByGeneration">Find by generation</Checkbox>
              <div v-if="settings.findByGeneration" class="ml-6">
                <Checkbox v-model="settings.filterByGen[1]">Gen 1</Checkbox>
                <Checkbox v-model="settings.filterByGen[23]">Gen 2 & 3</Checkbox>
                <Checkbox v-model="settings.filterByGen[4]">Gen 4</Checkbox>
              </div>
            </div>

            <div v-if="!settings.selectMonths" class="flex flex-col gap-0.5">
              <div class="flex justify-between">
                From :
                <input type="month" v-model="settings.fromDate" min="2007-01" :max="currentDate" />
              </div>
              <div class="flex justify-between">
                To :
                <input type="month" v-model="settings.toDate" min="2007-01" :max="currentDate" />
              </div>
            </div>

            <div v-if="!settings.rejectOfficial">
              <Checkbox v-model="settings.selectMonths">Filter by months</Checkbox>
              <div v-if="settings.selectMonths" class="flex flex-col gap-0.5 ml-6">
                <div>
                  From
                  <select v-model="settings.fromMonth">
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  to
                  <select v-model="settings.toMonth">
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  Between
                  <input type="number" v-model.number="settings.fromYear" min="2007" />
                  and
                  <input type="number" v-model.number="settings.toYear" min="2007" />
                </div>
              </div>
            </div>

            <Checkbox v-model="settings.checkAllDates">Check all dates</Checkbox>

            <Checkbox
              v-if="settings.rejectUnofficial && !settings.rejectOfficial"
              v-model="settings.randomInTimeline"
            >
              Choose random date in time range
            </Checkbox>
          </Collapsible>
        </div>
      </div>

      <div
        v-if="!state.started && settings.rejectUnofficial && !settings.rejectOfficial"
        class="container settings flex flex-col flex-1 min-h-0"
      >
        <div
          class="cursor-pointer relative"
          @click="panels.mapMakingSettings = !panels.mapMakingSettings"
        >
          <h2>Map making settings</h2>
          <ChevronDownIcon class="collapsible-indicator absolute top-0 right-0" />
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <Collapsible :is-open="panels.mapMakingSettings" class="p-1">
            <Checkbox
              @change="
                settings.getDeadEnds
                  ? (settings.getIntersection = false) || (settings.pinpointSearch = false)
                  : true
              "
              v-model="settings.getDeadEnds"
              >Find dead ends (end of coverage)</Checkbox
            >
            <div v-if="settings.getDeadEnds" class="ml-6">
              <Checkbox v-model="settings.deadEndsLookBackwards">Look towards dead end</Checkbox>
            </div>

            <Checkbox
              @change="settings.getIntersection ? (settings.getDeadEnds = false) : true"
              v-model="settings.getIntersection"
              >Find intersection locations</Checkbox
            >

            <Checkbox
              @change="settings.pinpointSearch ? (settings.getDeadEnds = false) : true"
              v-model="settings.pinpointSearch"
            >
              Find curve locations
            </Checkbox>

            <label v-if="settings.pinpointSearch" class="ml-6 flex items-center justify-between">
              Pinpointable angle ({{ settings.pinpointAngle }}°)
              <input type="range" v-model.number="settings.pinpointAngle" min="45" max="180" />
            </label>

            <Checkbox v-model="settings.adjustHeading">Adjust heading</Checkbox>
            <div v-if="settings.adjustHeading" class="ml-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="settings.headingReference" value="link" />
                Along road
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="settings.headingReference" value="forward" />
                To front of car
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="settings.headingReference" value="backward" />
                To back of car
              </label>
              <label class="flex items-center justify-between">
                Deviation (+/- {{ settings.headingDeviation }}°)
                <input type="range" v-model.number="settings.headingDeviation" min="0" max="360" />
              </label>
              <small>0° will point directly towards the road.</small>
            </div>

            <Checkbox v-model="settings.adjustPitch">Adjust pitch</Checkbox>
            <div v-if="settings.adjustPitch" class="ml-6">
              <label class="flex items-center justify-between">
                Deviation ({{ settings.pitchDeviation }}°)
                <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" />
              </label>
              <small>0 by default. -90° for tarmac/+90° for sky</small>
            </div>
          </Collapsible>
        </div>
      </div>

      <div class="container flex flex-col">
        <div class="cursor-pointer relative" @click="panels.marker = !panels.marker">
          <h2>Markers</h2>
          <ChevronDownIcon class="collapsible-indicator absolute top-0 right-0" />
        </div>
        <!-- <div class="flex-1 min-h-0 overflow-y-auto"> -->
        <Collapsible :is-open="panels.marker" class="p-1">
          <Checkbox
            v-model="settings.noBlueLineMarker"
            v-on:change="updateMarkerLayers('noBlueLine')"
          >
            <span class="h-3 w-3 bg-[#E412D2] rounded-full"></span>No blue line
          </Checkbox>
          <Checkbox v-model="settings.newRoadMarker" v-on:change="updateMarkerLayers('newRoad')">
            <span class="h-3 w-3 bg-[#CA283F] rounded-full"></span>New Road
          </Checkbox>
          <Checkbox v-model="settings.gen4Marker" v-on:change="updateMarkerLayers('gen4')">
            <span class="h-3 w-3 bg-[#2880CA] rounded-full"></span>Gen 4 Update
          </Checkbox>
          <Checkbox v-model="settings.gen2Or3Marker" v-on:change="updateMarkerLayers('gen2Or3')">
            <span class="h-3 w-3 bg-[#9A28CA] rounded-full"></span>Gen 2 or 3 Update
          </Checkbox>
          <Checkbox v-model="settings.gen1Marker" v-on:change="updateMarkerLayers('gen1')">
            <span class="h-3 w-3 bg-[#24AC20] rounded-full"></span>Gen 1 Update
          </Checkbox>
          <Checkbox
            v-model="settings.cluster"
            v-on:change="updateClusters"
            title="For lag reduction."
          >
            Cluster markers
          </Checkbox>
          <Button
            :disabled="!totalLocs"
            size="sm"
            variant="warning"
            class="mt-2 w-full justify-center flex items-center gap-1"
            title="Clear markers (for performance, this won't erase your generated locations)"
            @click="clearMarkers"
          >
            <MarkerIcon class="w-5 h-5" />Clear
          </Button>
        </Collapsible>
        <!-- </div> -->
      </div>

      <Button
        v-if="canBeStarted"
        @click="handleClickStart"
        :variant="state.started ? 'danger' : 'primary'"
        title="Space bar/Enter"
        >{{ state.started ? 'Pause' : 'Start' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { onMounted, ref, reactive, computed } from 'vue'
import { useStorage } from '@vueuse/core'

import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { llToPX } from 'web-merc-projection'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@/assets/leaflet-draw/leaflet.draw.js' // npm one is broken for rectancles so we use a patched one
import '@/assets/leaflet-draw/leaflet.draw.css'
import 'leaflet-contextmenu'
import 'leaflet-contextmenu/dist/leaflet.contextmenu.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster.freezable/dist/leaflet.markercluster.freezable.js'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import markerBlue from '@/assets/markers/marker-blue.png'
import markerRed from '@/assets/markers/marker-red.png'
import markerViolet from '@/assets/markers/marker-violet.png'
import markerGreen from '@/assets/markers/marker-green.png'
import markerPink from '@/assets/markers/marker-pink.png'

import Collapsible from '@/components/Elements/Collapsible.vue'
import Button from '@/components/Elements/Button.vue'
import Checkbox from '@/components/Elements/Checkbox.vue'
import Spinner from '@/components/Elements/Spinner.vue'
import Logo from '@/components/Elements/Logo.vue'
import Clipboard from '@/components/Clipboard.vue'
import ExportToJSON from '@/components/ExportToJSON.vue'
import ExportToCSV from '@/components/ExportToCSV.vue'
import FileImportIcon from '@/assets/icons/file-import.svg'
import FileExportIcon from '@/assets/icons/file-export.svg'
import MarkerIcon from '@/assets/icons/marker.svg'
import TrashBinIcon from '@/assets/icons/trash-bin.svg'
import ChevronDownIcon from '@/assets/icons/chevron-down.svg'

import { blueLineDetector } from '@/composables/blueLineDetector.ts'

import {
  randomPointInPoly,
  getCurrentDate,
  isDate,
  randomInRange,
  getCameraGeneration,
  distanceBetween,
  isValidGeoJSON,
  getPolygonName,
  changePolygonName,
  polygonStyles,
} from '@/composables/utils.ts'
const { currentYear, currentDate } = getCurrentDate()

const SV = new google.maps.StreetViewService()

const storedSettings = useStorage('map_generator_settings', {
  numOfGenerators: 1,
  radius: 500,
  oneCountryAtATime: false,
  onlyCheckBlueLines: false,
  findRegions: false,
  regionRadius: 100,

  rejectUnofficial: true,
  rejectOfficial: false,
  findByGeneration: true,
  filterByGen: {
    1: false,
    23: true,
    4: true,
  },
  rejectDateless: true,
  rejectNoDescription: true,
  rejectDescription: false,
  onlyOneInTimeframe: false,
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

  getDeadEnds: false,
  deadEndsLookBackwards: false,
  getIntersection: false,
  pinpointSearch: false,
  pinpointAngle: 145,
  adjustHeading: true,
  headingReference: 'link',
  headingDeviation: 0,
  adjustPitch: false,
  pitchDeviation: 0,

  cluster: false,
  noBlueLineMarker: true,
  gen4Marker: true,
  gen2Or3Marker: true,
  gen1Marker: true,
  newRoadMarker: true,

  markersOnImport: true,
  checkImports: false,
})
const settings = reactive(storedSettings.value)

const panels = useStorage('map_generator_panels', {
  layer: true,
  generatorSettings: true,
  coverageSettings: true,
  mapMakingSettings: true,
  marker: true,
})

const state = reactive({
  started: false,
})

const select = ref('Select a country or draw a polygon')
const selected = ref<Polygon[]>([])
const allFoundPanoIds = new Set<string>()

const canBeStarted = computed(() =>
  selected.value.some((country) => country.found.length < country.nbNeeded),
)
const totalLocs = computed(() => {
  return selected.value.reduce((sum, country) => sum + country.found.length, 0)
})

let map: L.Map
const loadedLayers: Record<string, L.GeoJSON> = {}
const drawnPolygonsLayer = new L.GeoJSON()

const roadmapBaseLayer = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m2!1e0!2sm!3m5!2sen!3sus!5e1105!12m1!1e3!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
)
const roadmapLabelsLayer = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m2!1e0!2sm!3m5!2sen!3sus!5e1105!12m1!1e15!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
  { pane: 'labelPane' },
)
const roadmapLayer = L.layerGroup([roadmapBaseLayer, roadmapLabelsLayer])
const terrainBaseLayer = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m2!1e0!2sm!2m1!1e4!3m7!2sen!3sus!5e1105!12m1!1e67!12m1!1e3!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
)
const terrainLayer = L.layerGroup([terrainBaseLayer, roadmapLabelsLayer])
const satelliteBaseLayer = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m2!1e1!2sm!3m3!2sen!3sus!5e1105!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
)
const satelliteLabelsLayer = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m2!1e0!2sm!3m5!2sen!3sus!5e1105!12m1!1e4!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
  { pane: 'labelPane' },
)
const satelliteLayer = L.layerGroup([satelliteBaseLayer, satelliteLabelsLayer])
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
})
const cartoLightLayer = L.tileLayer(
  'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  { subdomains: ['a', 'b', 'c'] },
)
const cartoDarkLayer = L.tileLayer(
  'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
  { subdomains: ['a', 'b', 'c'] },
)
const gsvLayer = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e2*212b1*213e2*211m3*211e3*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*211b0*212b1!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
)
const gsvLayer2 = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e2*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*211b0*212b1!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
)
const gsvLayer3 = L.tileLayer(
  'https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e2!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e2*212b1*213e2!3m3!3sUS!12m1!1e68!4e0',
  { minZoom: 12, minNativeZoom: 14 },
)
const gsvLayer4 = L.tileLayer(
  'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e3*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*211b0*212b1!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
)

const baseMaps = {
  Roadmap: roadmapLayer,
  Satellite: satelliteLayer,
  Terrain: terrainLayer,
  OSM: osmLayer,
  'Carto Light': cartoLightLayer,
  'Carto Dark': cartoDarkLayer,
}

const overlayMaps = {
  'Google Street View': gsvLayer,
  'Google Street View Official Only': gsvLayer2,
  'Google Street View Roads (Only Works at Zoom Level 12+)': gsvLayer3,
  'Unofficial coverage only': gsvLayer4,
}

const gen1Icon = L.icon({ iconUrl: markerGreen, iconAnchor: [12, 41] })
const gen2Or3Icon = L.icon({ iconUrl: markerViolet, iconAnchor: [12, 41] })
const gen4Icon = L.icon({ iconUrl: markerBlue, iconAnchor: [12, 41] })
const newLocIcon = L.icon({ iconUrl: markerRed, iconAnchor: [12, 41] })
const noBlueLineIcon = L.icon({ iconUrl: markerPink, iconAnchor: [12, 41] })

type MarkerLayersTypes = 'gen4' | 'gen2Or3' | 'gen1' | 'newRoad' | 'noBlueLine'
const markerLayers: Record<MarkerLayersTypes, L.MarkerClusterGroup> = {
  gen4: L.markerClusterGroup({ maxClusterRadius: 100, disableClusteringAtZoom: 15 }),
  gen2Or3: L.markerClusterGroup({ maxClusterRadius: 100, disableClusteringAtZoom: 15 }),
  gen1: L.markerClusterGroup({ maxClusterRadius: 100, disableClusteringAtZoom: 15 }),
  newRoad: L.markerClusterGroup({ maxClusterRadius: 100, disableClusteringAtZoom: 15 }),
  noBlueLine: L.markerClusterGroup({ maxClusterRadius: 100, disableClusteringAtZoom: 15 }),
}

interface LayerMeta {
  label: string
  key: string
  source: string | GeoJSON.GeoJsonObject[]
  visible: boolean
}
const availableLayers = ref<LayerMeta[]>([
  {
    label: 'World Borders',
    key: 'world_borders',
    source: '/geojson/world_borders.json',
    visible: true,
  },
  {
    label: 'Drawn polygons',
    key: 'drawn_polygons',
    source: drawnPolygonsLayer,
    visible: true,
  },
])

async function loadLayer(layer: LayerMeta) {
  if (loadedLayers[layer.key]) return loadedLayers[layer.key]

  let geoJsonLayer: L.GeoJSON

  if (layer.key === 'drawn_polygons') {
    geoJsonLayer = drawnPolygonsLayer
  } else {
    let data: GeoJSON.GeoJsonObject
    if (typeof layer.source === 'string') {
      const response = await fetch(layer.source)
      data = await response.json()
    } else {
      data = layer.source
    }

    const style =
      layer.key === 'world_borders' ? polygonStyles.defaultHidden : polygonStyles.customPolygonStyle

    geoJsonLayer = L.geoJSON(data, { style, onEachFeature })
    geoJsonLayer.eachLayer((polygon) => {
      initPolygon(polygon as Polygon)
    })
  }
  loadedLayers[layer.key] = geoJsonLayer
  return geoJsonLayer
}

async function toggleLayer(layer: LayerMeta) {
  if (layer.visible) {
    const loaded = await loadLayer(layer)
    map.addLayer(loaded)
  } else {
    const loaded = loadedLayers[layer.key]
    if (loaded) map.removeLayer(loaded)
  }
}

async function importLayer(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return

  for (const file of input.files) {
    const result = await readFileAsText(file)
    try {
      const json = JSON.parse(result)
      if (!isValidGeoJSON(json)) {
        throw new Error('Invalid GeoJSON structure.')
      }

      const meta: LayerMeta = {
        label: file.name,
        key: file.name,
        source: json,
        visible: true,
      }
      availableLayers.value.push(meta)
      const layer = await loadLayer(meta)
      map.addLayer(layer)
    } catch (e) {
      alert(`Invalid GeoJSON in "${file.name}"`)
      console.error(e)
    }
  }
}

function exportLayer(l: LayerMeta) {
  const layer = loadedLayers[l.key]
  if (!layer) return

  const dataUri =
    'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(layer.toGeoJSON()))
  const fileName = l.label ?? 'Custom Layer'
  const linkElement = document.createElement('a')
  linkElement.href = dataUri
  linkElement.download = fileName
  linkElement.click()
}

function selectLayer(layerKey: string) {
  const layer = loadedLayers[layerKey]
  if (!layer) return

  const alreadySelected = new Set(selected.value.map((p) => p._leaflet_id))
  const toAdd: Polygon[] = []

  layer.eachLayer((polygon) => {
    const p = polygon as Polygon
    if (!alreadySelected.has(p._leaflet_id)) {
      toAdd.push(p)
    }
  })
  layer.setStyle(polygonStyles.highlighted)
  selected.value.push(...toAdd)
}

function deselectLayer(layerKey: string) {
  const layer = loadedLayers[layerKey]
  if (!layer) return

  const idsToRemove = new Set<number>()

  layer.eachLayer((polygon) => {
    const p = polygon as Polygon
    if (p._leaflet_id) {
      idsToRemove.add(p._leaflet_id)
    }
  })
  layer.setStyle(
    layerKey === 'world_borders' ? polygonStyles.defaultHidden : polygonStyles.customPolygonStyle,
  )
  selected.value = selected.value.filter((p) => !idsToRemove.has(p._leaflet_id))
}

function initPolygon(polygon: Polygon) {
  if (!polygon.found) polygon.found = []
  if (!polygon.nbNeeded) polygon.nbNeeded = 100
  if (!polygon.checkedPanos) polygon.checkedPanos = new Set()
}

function selectPolygon(e: L.LeafletMouseEvent) {
  if (state.started) return
  const polygon = e.target as Polygon
  const index = selected.value.findIndex((x) => x._leaflet_id === polygon._leaflet_id)
  if (index == -1) {
    polygon.setStyle(polygonStyles.highlighted())
    selected.value.push(polygon)
  } else {
    selected.value.splice(index, 1)
    resetHighlight(e)
  }
}

function clearPolygon(polygon: Polygon) {
  Object.values(markerLayers).forEach((markerLayer) => {
    const toRemove = markerLayer.getLayers().filter((layer) => {
      const marker = layer as L.Marker
      return marker.polygonID === polygon._leaflet_id
    })
    toRemove.forEach((marker) => {
      markerLayer.removeLayer(marker)
    })
  })
  polygon.found.length = 0
}

function clearAllLocations() {
  for (const polygon of selected.value) {
    polygon.found.length = 0
  }
  clearMarkers()
}

function clearMarkers() {
  Object.values(markerLayers).forEach((markerLayer) => {
    markerLayer.clearLayers()
  })
}

function onEachFeature(_, layer: L.Layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: selectPolygon,
  })
}

function highlightFeature(e: L.LeafletMouseEvent) {
  if (state.started) return
  const polygon = e.target as Polygon
  if (!selected.value.some((x) => x._leaflet_id === polygon._leaflet_id)) {
    polygon.setStyle(polygonStyles.highlighted())
  }
  select.value = `${getPolygonName(polygon.feature.properties)} ${polygon.found ? '(' + polygon.found.length + ')' : '(0)'}`
}

function resetHighlight(e: L.LeafletMouseEvent) {
  const polygon = e.target as Polygon
  if (!selected.value.some((x) => x._leaflet_id === polygon._leaflet_id)) {
    polygon.setStyle(polygonStyles.removeHighlight())
  }
  select.value = 'Select a country or draw a polygon'
}

function updateMarkerLayers(gen: MarkerLayersTypes) {
  if (
    (gen === 'gen4' && settings.gen4Marker) ||
    (gen === 'gen2Or3' && settings.gen2Or3Marker) ||
    (gen === 'gen1' && settings.gen1Marker) ||
    (gen === 'newRoad' && settings.newRoadMarker) ||
    (gen === 'noBlueLine' && settings.noBlueLineMarker)
  ) {
    map.addLayer(markerLayers[gen])
    if (!settings.cluster) markerLayers[gen].disableClustering()
    else markerLayers[gen].enableClustering()
  } else {
    map.removeLayer(markerLayers[gen])
  }
}

function updateClusters() {
  Object.values(markerLayers).forEach((markerLayer) => {
    if (settings.cluster) markerLayer.enableClustering()
    else markerLayer.disableClustering()
  })
}

const drawControl = new L.Control.Draw({
  position: 'bottomleft',
  draw: {
    polyline: false,
    marker: false,
    circlemarker: false,
    circle: false,
    polygon: {
      allowIntersection: false,
      drawError: {
        color: '#e1e100',
        message:
          '<strong>Polygon draw does not allow intersections!<strong> (allowIntersection: false)',
      },
      shapeOptions: { color: '#5d8ce3' },
    },
    rectangle: { shapeOptions: { color: '#5d8ce3' } },
  },
  edit: { featureGroup: drawnPolygonsLayer },
})

const copyCoords = (e: L.ContextMenuItemClickEvent) => {
  navigator.clipboard.writeText(e.latlng.lat.toFixed(7) + ', ' + e.latlng.lng.toFixed(7))
}
const openNearestPano = (e: L.ContextMenuItemClickEvent) => {
  open(
    `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.latlng.lat},${e.latlng.lng}`,
  )
}

onMounted(async () => {
  map = L.map('map', {
    attributionControl: false,
    contextmenu: true,
    contextmenuItems: [
      { text: 'Copy Coordinates', callback: copyCoords },
      { text: 'See Nearest Pano', callback: openNearestPano },
    ],
    center: [0, 0],
    preferCanvas: true,
    zoom: 1,
    zoomControl: false,
    worldCopyJump: true,
  })
  map.createPane('labelPane')
  map.getPane('labelPane')!.style.zIndex = '300'

  roadmapLayer.addTo(map)
  gsvLayer2.addTo(map)

  L.control.layers(baseMaps, overlayMaps, { position: 'bottomleft' }).addTo(map)

  for (const layer of availableLayers.value) {
    if (layer.visible) {
      const loaded = await loadLayer(layer)
      map.addLayer(loaded)
    }
  }

  Object.entries(markerLayers).forEach(([key]) => {
    updateMarkerLayers(key as MarkerLayersTypes)
  })

  map.addControl(drawControl)

  map.on('draw:created', (e) => {
    const event = e as L.DrawEvents.Created
    const polygon = event.layer as Polygon
    polygon.feature = event.layer.toGeoJSON()
    polygon.feature.properties.name = `Custom polygon ${drawnPolygonsLayer.getLayers().length + 1}`
    initPolygon(polygon)
    polygon.setStyle(polygonStyles.customPolygonStyle())
    polygon.setStyle(polygonStyles.highlighted())
    polygon.on('mouseover', (e: L.LeafletMouseEvent) => highlightFeature(e))
    polygon.on('mouseout', (e: L.LeafletMouseEvent) => resetHighlight(e))
    polygon.on('click', (e: L.LeafletMouseEvent) => selectPolygon(e))
    drawnPolygonsLayer.addLayer(polygon)
    selected.value.push(polygon)
  })

  map.on('draw:edited', (e) => {
    const event = e as L.DrawEvents.Edited
    event.layers.eachLayer((layer) => {
      const polygon = layer as Polygon
      const geojson = polygon.toGeoJSON()
      polygon.feature = geojson
      const index = selected.value.findIndex((x) => x._leaflet_id === polygon._leaflet_id)
      if (index != -1) selected.value[index] = polygon
    })
  })

  map.on('draw:deleted', (e) => {
    const event = e as L.DrawEvents.Deleted
    event.layers.eachLayer((layer) => {
      const polygon = layer as Polygon
      clearPolygon(polygon)
      const index = selected.value.findIndex((x) => x._leaflet_id === polygon._leaflet_id)
      if (index != -1) selected.value.splice(index, 1)
    })
  })

  const mapDiv = document.getElementById('map') as HTMLElement
  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize()
    // Hack for tiles not loading after hard refresh on firefox
    const zoom = map.getZoom()
    map.setZoom(zoom - 1)
    map.setZoom(zoom + 1)
  })
  resizeObserver.observe(mapDiv)

  // we move leaflet controls out of the #map container for z-index
  const drawControlContainer = map.getContainer().querySelector('.leaflet-control-container')
  const ui = document.getElementById('leaflet-ui')
  if (ui && drawControlContainer) {
    ui.appendChild(drawControlContainer)
  }
})

// Process
document.onkeydown = (event) => {
  if (event.key === ' ') {
    handleClickStart()
  }
}

const handleClickStart = () => {
  state.started = !state.started
  start()
}

async function start() {
  if (settings.oneCountryAtATime)
    for (const polygon of selected.value) await generate(polygon as Polygon)

  const generator = []
  for (const polygon of selected.value) {
    for (let i = 0; i < settings.numOfGenerators; i++) {
      generator.push(generate(polygon as Polygon))
    }
  }
  await Promise.all(generator)
  state.started = false
}

async function generate(polygon: Polygon) {
  let detector
  if (settings.onlyCheckBlueLines) {
    const bounds = polygon.getBounds()
    const boundsNW = { lat: bounds.getNorth(), lng: bounds.getWest() }
    const boundsSE = { lat: bounds.getSouth(), lng: bounds.getEast() }
    detector = await blueLineDetector(boundsNW, boundsSE)
  }

  while (polygon.found.length < polygon.nbNeeded) {
    if (!state.started) return
    polygon.isProcessing = true
    const randomCoords = []
    const n = Math.min(polygon.nbNeeded * 100, 1000)
    while (randomCoords.length < n) {
      const point = randomPointInPoly(polygon)
      if (booleanPointInPolygon([point.lng, point.lat], polygon.feature)) {
        if (!settings.onlyCheckBlueLines || detector(point.lat, point.lng, settings.radius)) {
          randomCoords.push(point)
        }
      }
    }
    if (!settings.findRegions) {
      for (const locationGroup of randomCoords.chunk(75)) {
        await Promise.allSettled(locationGroup.map((l) => getLoc(l, polygon)))
      }
    } else if (settings.findRegions) {
      for (const locationGroup of randomCoords.chunk(1)) {
        await Promise.allSettled(locationGroup.map((l) => getLoc(l, polygon)))
      }
    }
  }
  polygon.isProcessing = false
}

async function getLoc(loc: LatLng, polygon: Polygon) {
  return SV.getPanorama(
    {
      location: { lat: loc.lat, lng: loc.lng },
      sources: [
        settings.rejectUnofficial
          ? google.maps.StreetViewSource.GOOGLE
          : google.maps.StreetViewSource.DEFAULT,
      ],
      radius: settings.radius,
    },
    (res, status) => {
      if (!res || status != google.maps.StreetViewStatus.OK) return false

      if (settings.rejectUnofficial && !settings.rejectOfficial) {
        if (
          settings.rejectNoDescription &&
          !settings.rejectDescription &&
          !res.location?.description &&
          !res.location?.shortDescription
        )
          return false
        if (settings.getDeadEnds && res.links.length > 1) return false
        if (settings.getIntersection && res?.links.length < 3) return false
        if (
          settings.rejectDescription &&
          (res.location?.description || res.location?.shortDescription)
        )
          return false
        if (settings.pinpointSearch && res.links.length < 2) return false
        if (settings.getIntersection && !settings.pinpointSearch && res.links.length < 3)
          return false
        if (
          settings.pinpointSearch &&
          res.links.length == 2 &&
          Math.abs(res.links[0].heading - res.links[1].heading) > settings.pinpointAngle
        )
          return false
      }

      if (settings.findRegions) {
        settings.checkAllDates = false
        let i = 0
        while (i < polygon.found.length) {
          if (distanceBetween(polygon.found[i], loc) < settings.regionRadius * 1000) {
            return false
          }
          i++
        }
      }

      if (settings.rejectOfficial) {
        if (/^\xA9 (?:\d+ )?Google$/.test(res.copyright)) return false
        if (
          settings.findDrones &&
          (![2048, 7200].includes(res.tiles.worldSize.height) || res.links.length > 1)
        )
          return false
      }

      if (
        settings.findByGeneration &&
        ((!settings.rejectOfficial && !settings.checkAllDates) || settings.selectMonths)
      ) {
        if (!settings.filterByGen[getCameraGeneration(res)]) return false
      }

      if (settings.randomInTimeline) {
        const randomIndex = Math.floor(Math.random() * res.time.length)
        const pano_test = res.time[randomIndex]
        if (
          Date.parse(pano_test.gx) < Date.parse(settings.fromDate) ||
          Date.parse(pano_test.gx) > Date.parse(settings.toDate)
        )
          return false
        getPano(pano_test.pano, polygon)
      }

      if (
        settings.checkAllDates &&
        res.time &&
        !settings.selectMonths &&
        !settings.rejectOfficial &&
        !settings.randomInTimeline
      ) {
        if (!res.time.length) return false
        const fromDate = Date.parse(settings.fromDate)
        const toDate = Date.parse(settings.toDate)
        let dateWithin = false
        for (const loc of res.time) {
          if (settings.rejectUnofficial && loc.pano.length != 22) continue // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
          const date = Object.values(loc).find((val) => val instanceof Date)
          const iDate = Date.parse(
            date.getFullYear() + '-' + (date.getMonth() > 8 ? '' : '0') + (date.getMonth() + 1),
          ) // this will parse the Date object from res.time[i] (like Fri Oct 01 2021 00:00:00 GMT-0700 (Pacific Daylight Time)) to a local timestamp, like Date.parse("2021-09") == 1630454400000 for Pacific Daylight Time
          if (iDate >= fromDate && iDate <= toDate) {
            // if date ranges from fromDate to toDate, set dateWithin to true and stop the loop
            dateWithin = true
            getPano(loc.pano, polygon)
          }
        }
        if (!dateWithin) return false
      } else {
        if (settings.rejectDateless && !res.imageDate) return false
        if (
          Date.parse(res.imageDate) < Date.parse(settings.fromDate) ||
          Date.parse(res.imageDate) > Date.parse(settings.toDate)
        )
          return false
        getPano(res.location.pano, polygon)
      }

      if (settings.selectMonths && !settings.rejectOfficial) {
        if (!res.time?.length) return false
        let dateWithin = false
        const fromMonth = settings.fromMonth
        const toMonth = settings.toMonth
        const fromYear = settings.fromYear
        const toYear = settings.toYear
        if (settings.checkAllDates) {
          for (let i = 0; i < res.time.length; i++) {
            const timeframeDate = Object.values(res.time[i]).find((val) => isDate(val))

            if (settings.rejectUnofficial && res.time[i].pano.length != 22) continue // Checks if res ID is 22 characters long. Otherwise, it's an Ari
            const iDateMonth = timeframeDate.getMonth() + 1
            const iDateYear = timeframeDate.getFullYear()

            if (fromMonth <= toMonth) {
              if (
                iDateMonth >= fromMonth &&
                iDateMonth <= toMonth &&
                iDateYear >= fromYear &&
                iDateYear <= toYear
              ) {
                dateWithin = true
                break
              }
            } else {
              if (
                (iDateMonth >= fromMonth || iDateMonth <= toMonth) &&
                iDateYear >= fromYear &&
                iDateYear <= toYear
              ) {
                dateWithin = true
                break
              }
            }
          }
          if (!dateWithin) return false
        } else {
          if (res.imageDate.slice(0, 4) < fromYear || res.imageDate.slice(0, 4) > toYear)
            return false
          if (fromMonth <= toMonth) {
            if (res.imageDate.slice(5) < fromMonth || res.imageDate.slice(5) > toMonth) return false
          } else {
            if (res.imageDate.slice(5) < fromMonth && res.imageDate.slice(5) > toMonth) return false
          }
        }
      }

      return true
    },
  )
}

function isPanoGood(pano: google.maps.StreetViewPanoramaData) {
  if (settings.rejectUnofficial && !settings.rejectOfficial) {
    if (pano.location?.pano.length != 22) return false
    // if (!/^\xA9 (?:\d+ )?Google$/.test(pano.copyright)) return false;
    if (
      settings.rejectNoDescription &&
      !settings.rejectDescription &&
      !pano.location.description &&
      !pano.location.shortDescription
    )
      return false
    if (settings.getDeadEnds && pano.links.length > 1) return false
    if (settings.getIntersection && pano.links.length < 3) return false
    if (settings.rejectDescription && (pano.location.description || pano.location.shortDescription))
      return false
    if (settings.pinpointSearch && pano.links.length < 2) return false
    if (settings.getIntersection && !settings.pinpointSearch && pano.links.length < 3) return false
    if (
      settings.pinpointSearch &&
      pano.links.length == 2 &&
      Math.abs(pano.links[0].heading - pano.links[1].heading) > settings.pinpointAngle
    )
      return false
  }

  if (settings.rejectDateless && !pano.imageDate) return false
  const fromDate = Date.parse(settings.fromDate)
  const toDate = Date.parse(settings.toDate)
  const locDate = Date.parse(pano.imageDate)
  const fromMonth = settings.fromMonth
  const toMonth = settings.toMonth
  const fromYear = settings.fromYear
  const toYear = settings.toYear

  if (!settings.selectMonths) {
    if (!settings.checkAllDates || settings.rejectOfficial) {
      if (locDate < fromDate || locDate > toDate) return false
    }
  }

  if (settings.onlyOneInTimeframe) {
    for (const loc of pano.time) {
      if (settings.rejectUnofficial && loc.pano.length != 22) continue
      if (loc.pano == pano.location?.pano) continue
      const date = Object.values(loc).find((val) => val instanceof Date)
      const iDate = Date.parse(
        date.getFullYear() + '-' + (date.getMonth() > 8 ? '' : '0') + (date.getMonth() + 1),
      )
      if (iDate >= fromDate && iDate <= toDate) return false
    }
  }

  if (settings.checkAllDates && !settings.selectMonths && !settings.rejectOfficial) {
    if (!pano.time?.length) return false
    if (settings.findByGeneration) {
      if (!settings.filterByGen[getCameraGeneration(pano)]) return false
    }

    let dateWithin = false
    for (let i = 0; i < pano.time.length; i++) {
      const timeframeDate = Object.values(pano.time[i]).find((val) => isDate(val))

      if (settings.rejectUnofficial && pano.time[i].pano.length != 22) continue // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
      const iDate = Date.parse(
        timeframeDate.getFullYear() +
          '-' +
          (timeframeDate.getMonth() > 8 ? '' : '0') +
          (timeframeDate.getMonth() + 1),
      )

      if (iDate >= fromDate && iDate <= toDate) {
        dateWithin = true
        break
      }
    }
    if (!dateWithin) return false
  }

  if (settings.selectMonths && !settings.rejectOfficial) {
    if (!pano.time?.length) return false
    let dateWithin = false

    if (settings.checkAllDates) {
      for (let i = 0; i < pano.time.length; i++) {
        const timeframeDate = Object.values(pano.time[i]).find((val) => isDate(val))

        if (settings.rejectUnofficial && pano.time[i].pano.length != 22) continue // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
        const iDateMonth = timeframeDate.getMonth() + 1
        const iDateYear = timeframeDate.getFullYear()

        if (fromMonth <= toMonth) {
          if (
            iDateMonth >= fromMonth &&
            iDateMonth <= toMonth &&
            iDateYear >= fromYear &&
            iDateYear <= toYear
          ) {
            dateWithin = true
            break
          }
        } else {
          if (
            (iDateMonth >= fromMonth || iDateMonth <= toMonth) &&
            iDateYear >= fromYear &&
            iDateYear <= toYear
          ) {
            dateWithin = true
            break
          }
        }
      }
      if (!dateWithin) return false
    } else {
      if (pano.imageDate.slice(0, 4) < fromYear || pano.imageDate.slice(0, 4) > toYear) return false
      if (fromMonth <= toMonth) {
        if (pano.imageDate.slice(5) < fromMonth || pano.imageDate.slice(5) > toMonth) return false
      } else {
        if (pano.imageDate.slice(5) < fromMonth && pano.imageDate.slice(5) > toMonth) return false
      }
    }
  }

  return true
}

function getPano(id: string, polygon: Polygon) {
  return getPanoDeep(id, polygon, 0)
}

function getPanoDeep(id: string, polygon: Polygon, depth: number) {
  if (depth > settings.linksDepth) return
  if (polygon.checkedPanos.has(id)) return
  else polygon.checkedPanos.add(id)

  SV.getPanorama({ pano: id }, async (pano, status) => {
    if (status == google.maps.StreetViewStatus.UNKNOWN_ERROR) {
      polygon.checkedPanos.delete(id)
      return getPanoDeep(id, polygon, depth)
    } else if (status != google.maps.StreetViewStatus.OK) return
    //successfulRequests++
    // if (!pano) console.log(status, pano)
    const inCountry = booleanPointInPolygon(
      [pano.location.latLng.lng(), pano.location.latLng.lat()],
      polygon.feature,
    )
    const isPanoGoodAndInCountry = isPanoGood(pano) && inCountry
    if (settings.checkAllDates && !settings.selectMonths && pano.time) {
      const fromDate = Date.parse(settings.fromDate)
      const toDate = Date.parse(settings.toDate)

      for (const loc of pano.time) {
        if (settings.rejectUnofficial && loc.pano.length != 22) continue // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
        const date = Object.values(loc).find((val) => val instanceof Date)
        const iDate = Date.parse(
          date.getFullYear() + '-' + (date.getMonth() > 8 ? '' : '0') + (date.getMonth() + 1),
        ) // this will parse the Date object from res.time[i] (like Fri Oct 01 2021 00:00:00 GMT-0700 (Pacific Daylight Time)) to a local timestamp, like Date.parse("2021-09") == 1630454400000 for Pacific Daylight Time
        if (iDate >= fromDate && iDate <= toDate) {
          // if date ranges from fromDate to toDate, set dateWithin to true and stop the loop
          getPanoDeep(loc.pano, polygon, isPanoGoodAndInCountry ? 1 : depth + 1)
          // TODO: add settings.onlyOneLoc
          // if(settings.onlyOneLoc)break;
        }
      }
    }
    if (settings.checkLinks) {
      if (pano.links) {
        for (const loc of pano.links) {
          getPanoDeep(loc.pano, polygon, isPanoGoodAndInCountry ? 1 : depth + 1)
        }
      }
      if (pano.time) {
        for (const loc of pano.time) {
          getPanoDeep(loc.pano, polygon, isPanoGoodAndInCountry ? 1 : depth + 1)
        }
      }
    }
    if (isPanoGoodAndInCountry) {
      addLoc(pano, polygon)
    }
    return pano
  })
}

function addLoc(pano: google.maps.StreetViewPanoramaData, polygon: Polygon) {
  let heading = 0
  if (settings.adjustHeading) {
    if (settings.headingReference === 'forward') {
      heading = pano.tiles.centerHeading
    } else if (settings.headingReference === 'backward') {
      heading = (pano.tiles.centerHeading + 180) % 360
    } else if (settings.headingReference === 'link' && pano.links.length > 0) {
      heading = parseInt(
        settings.getDeadEnds && settings.deadEndsLookBackwards
          ? pano.links[0].heading - 180
          : pano.links[0].heading,
      )
    }
    heading += randomInRange(-settings.headingDeviation, settings.headingDeviation)
  }

  const location: Panorama = {
    panoId: pano.location.pano,
    lat: pano.location.latLng.lat(),
    lng: pano.location.latLng.lng(),
    heading,
    pitch: settings.adjustPitch ? settings.pitchDeviation : 0,
    imageDate: pano.imageDate,
    links: [
      ...new Set(pano.links.map((loc) => loc.pano).concat(pano.time.map((loc) => loc.pano))),
    ].sort(),
  }

  const index = location.links.indexOf(pano.location.pano)
  if (index != -1) location.links.splice(index, 1)
  // Remove ari
  const time = settings.rejectUnofficial
    ? pano.time.filter((entry) => entry.pano.length === 22)
    : pano.time
  const previousPano = time[time.length - 2]?.pano
  // New road
  if (!previousPano) {
    checkHasBlueLine(pano.location.latLng.toJSON()).then((hasBlueLine) => {
      addLocation(location, polygon, true, hasBlueLine ? newLocIcon : noBlueLineIcon)
    })

    return
  }

  SV.getPanorama({ pano: previousPano }, (previousPano) => {
    if (previousPano.tiles.worldSize.height === 1664) {
      // Gen 1
      return addLocation(location, polygon, true, gen1Icon)
    } else if (previousPano.tiles.worldSize.height === 6656) {
      // Gen 2 or 3
      return addLocation(location, polygon, true, gen2Or3Icon)
    } else {
      // Gen 4
      return addLocation(location, polygon, true, gen4Icon)
    }
  })
}

function addLocation(location: Panorama, polygon: Polygon, addMarker: boolean, iconType: L.Icon) {
  if (allFoundPanoIds.has(location.panoId)) return
  allFoundPanoIds.add(location.panoId)

  let markerLayer = markerLayers['gen4']
  let zIndex = 1
  switch (iconType) {
    case gen2Or3Icon:
      markerLayer = markerLayers['gen2Or3']
      zIndex = 2
      break
    case gen1Icon:
      markerLayer = markerLayers['gen1']
      zIndex = 3
      break
    case newLocIcon:
      markerLayer = markerLayers['newRoad']
      zIndex = 4
      break
    case noBlueLineIcon:
      markerLayer = markerLayers['noBlueLine']
      zIndex = 5
      break
  }

  if (!polygon || polygon.found.length < polygon.nbNeeded) {
    if (polygon) polygon.found.push(location)
    if (addMarker) {
      const marker = L.marker([location.lat, location.lng], { icon: iconType, forceZIndex: zIndex })
        .on('click', () => {
          window.open(
            `https://www.google.com/maps/@?api=1&map_action=pano&pano=${location.panoId}${
              location.heading ? '&heading=' + location.heading : ''
            }${location.pitch ? '&pitch=' + location.pitch : ''}`,
            '_blank',
          )
        })
        .setZIndexOffset(zIndex)
        .addTo(markerLayer)
      marker.polygonID = polygon._leaflet_id
    }
  }
}

const blueLineCanvas = document.createElement('canvas')
async function checkHasBlueLine(latLng: LatLng) {
  const tileSize = 256
  // We stay somewhat zoomed out so the blue lines extend a bit more, as panoramas
  // are often not *exactly* on the road
  const zoom = 12
  const [pixelX, pixelY] = llToPX([latLng.lng, latLng.lat], zoom, undefined, tileSize)
  const tileX = Math.floor(pixelX / tileSize)
  const tileY = Math.floor(pixelY / tileSize)
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = `https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i${zoom}!2i${tileX}!3i${tileY}!2i9!3x1!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e2*212b1*213e2*211m3*211e3*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*211b0*212b0!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0`
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })
  blueLineCanvas.width = 256
  blueLineCanvas.height = 256
  const ctx = blueLineCanvas.getContext('2d')
  ctx!.drawImage(image, 0, 0)
  // Check the pixel where the pano is
  const imageData = ctx!.getImageData(pixelX - tileX * tileSize, pixelY - tileY * tileSize, 1, 1)
  const alpha = imageData.data[3]
  // Only 1 pixel, RGBA order
  return alpha > 0
}

async function importLocations(e: Event, polygon: Polygon) {
  const input = e.target as HTMLInputElement
  if (!input.files) return

  for (const file of input.files) {
    const result = await readFileAsText(file)
    if (file.type == 'application/json') {
      let JSONResult
      try {
        JSONResult = JSON.parse(result)
        if (!JSONResult.customCoordinates) {
          throw Error
        }
      } catch (e) {
        alert('Invalid JSON.')
      }

      for (const location of JSONResult.customCoordinates) {
        if (!location.panoId || !location.lat || !location.lng) continue
        if (settings.checkImports) {
          for (const link of location.links) {
            if (!JSONResult.customCoordinates.some((loc: Panorama) => loc.panoId === link))
              getPano(link, polygon)
          }
        }
        addLocation(location, polygon, settings.markersOnImport, gen4Icon)
      }
    } else {
      alert('Unknown file type: ' + file.type + '. Only JSON may be imported.')
    }
  }
}

async function readFileAsText(file: File) {
  const result = await new Promise<string>((resolve) => {
    const fileReader = new FileReader()
    fileReader.onload = () => resolve(fileReader.result as string)
    fileReader.readAsText(file)
  })
  return result
}

async function changeLocationsCaps() {
  const input = prompt('What would you like to set the locations cap to ?')
  if (input === null) return
  const newCap = Math.abs(parseInt(input))
  if (isNaN(newCap)) return

  for (const polygon of selected.value) {
    polygon.nbNeeded = newCap
  }
}

const handleRadiusInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value)
  if (!value || value < 10) settings.radius = 10
  else if (value > 1000000) settings.radius = 1000000
}

window.onbeforeunload = function () {
  if (totalLocs.value > 0) {
    return 'Are you sure you want to stop the generator ?'
  }
}

// window.type = !0
// not sure if really needed
;(function (global: typeof L.Marker | undefined) {
  const MarkerMixin = {
    _updateZIndex: function (offset: number) {
      // @ts-ignore
      this._icon.style.zIndex = this.options.forceZIndex
        ? // @ts-ignore
          this.options.forceZIndex + (this.options.zIndexOffset || 0)
        : // @ts-ignore
          this._zIndex + offset
    },
    setForceZIndex: function (forceZIndex?: number | null) {
      // @ts-ignore
      this.options.forceZIndex = forceZIndex ? forceZIndex : null
    },
  }
  if (global) global.include(MarkerMixin)
})(L.Marker)

Array.prototype.chunk = function (n) {
  if (!this.length) {
    return []
  }
  return [this.slice(0, n)].concat(this.slice(n).chunk(n))
}
</script>

<style>
#map {
  z-index: 0;
  height: 100vh;
}

.container {
  padding: 0.25rem;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.7);
}

.leaflet-container {
  background-color: #2c2c2c;
}

/* Leaflet Controls */
#leaflet-ui {
  z-index: 99;
}
.leaflet-left .leaflet-control,
.leaflet-bottom .leaflet-control {
  margin-left: 4px;
  margin-bottom: 4px;
}
.leaflet-control-layers {
  background-color: rgb(0, 0, 0, 0.6);
  font-size: 10px;
  color: white;
}
</style>
