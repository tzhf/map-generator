<template>
	<div id="map"></div>
	<div class="overlay top left flex-col gap">
		<Logo class="mb-2" />
		<div v-if="!state.started">
			<h4 class="select mb-2">{{ select }}</h4>
			<div class="flex gap">
				<Button @click="selectAll" class="bg-success" text="Select all" title="Select all" />
				<Button v-if="selected.length" @click="deselectAll" class="bg-danger" text="Deselect all" title="Deselect all" />
			</div>
		</div>

		<div v-if="selected.length" class="selected">
			<h4 class="center mb-2">Countries/Territories ({{ selected.length }})</h4>
			<Checkbox v-model:checked="settings.markersOnImport" label="Add markers to imported locations" title="This may affect performance." />
			<Checkbox v-model:checked="settings.checkImports" label="Check imported locations" title="Useful for comprehensive datasets." />
			<br/>
			<Button @click="changeLocationsCaps" class="smallbtn bg-success" title="Change locations cap for all selected" text="Change locations cap for all selected" />
			      <hr/>
	       <div v-for="country of selected" class="line flex space-between">
		<div class="flex-center">
		  <span v-if="country.feature.properties.code" :class="`flag-icon flag-` + country.feature.properties.code.toLowerCase()"></span>
		  {{ getName(country) }}
		  <Spinner v-if="state.started && country.isProcessing" class="ml-2" />
		</div>
		<label class="smallbtn bg-success">
		  <input type="file" @change="locationsFileProcess($event, country)" accept=".json" hidden />
		  Import Locations
		</label>
		<div> 
		  {{ country.found ? country.found.length : "0" }} / 
		  <input type="number" :min="country.found ? country.found.length : 0" v-model="country.nbNeeded" />
		</div>
	      </div>
	    </div>
	    <Button @click="clearMarkers" class="bg-warning" text="Clear markers" optText="(for performance, this won't erase your generated locations)" title="Clear markers" />
	    <Button @click="clearLocations" class="bg-warning" text="Erase generated locations" title="Erase generated locations" />
  	</div>
	
	<div class="overlay top right flex-col gap">
		<div v-if="!state.started" class="settings">
			<h4 class="center">Coverage settings</h4>
			
			<div v-if="!settings.rejectOfficial">
			<Checkbox v-model:checked="settings.rejectUnofficial" label="Reject unofficial" />
			</div>

			<div v-if="settings.rejectUnofficial && !settings.rejectOfficial">
			<Checkbox v-model:checked="settings.findGeneration" label="Find generation" />
				<div v-if="settings.findGeneration">
					<select v-model="settings.generation">
						<option value="1">Gen 1</option>
						<option value="23">Gen 2/3</option>
						<option value="4">Gen 4</option>
					</select>
				</div>
				<Checkbox v-model:checked="settings.rejectDescription" label="Find trekker coverage" />
			</div>

			<Checkbox v-model:checked="settings.rejectOfficial" label="Find unofficial coverage" />
			<hr />

			<h4 class="center">Location settings</h4>
			
			<div v-if="settings.rejectUnofficial && !settings.rejectOfficial">
			<Checkbox v-model:checked="settings.rejectDateless" label="Reject locations without date" />
			</div>
			
			<div v-if="settings.rejectUnofficial && !settings.rejectOfficial">
				<div v-if="!settings.rejectDescription">
					<Checkbox v-model:checked="settings.rejectNoDescription" label="Reject locations without description" />
				</div>
				
				<Checkbox v-model:checked="settings.onlyOneInTimeframe" label="Only one location in timeframe" title="Only allow locations that don't have other nearby coverage in timeframe." />
				
				<Checkbox v-model:checked="settings.checkLinks" label="Check linked panos" />
				<div v-if="settings.checkLinks">
					<input type="range" v-model.number="settings.linksDepth" min="1" max="10" />
					Depth: {{ settings.linksDepth }}
				</div>
			</div>
				
			<hr />
			
			<h4 class="center">Map making settings</h4>
			
			<div v-if="settings.rejectUnofficial && !settings.rejectOfficial">
				<Checkbox v-model:checked="settings.getIntersection" label="Find intersection locations" />

				<Checkbox v-model:checked="settings.pinpointSearch" label="Find curve locations" />
				<div v-if="settings.pinpointSearch" class="indent">
				<label class="flex wrap">
					Pinpointable angle <input type="range" v-model.number="settings.pinpointAngle" min="45" max="180" /> ({{ settings.pinpointAngle }}°)
				</label>
				</div>

				<Checkbox v-model:checked="settings.adjustHeading" label="Adjust heading" />
				<div v-if="settings.adjustHeading" class="indent">
					<label class="flex wrap">
						Deviation <input type="range" v-model.number="settings.headingDeviation" min="0" max="50" /> (+/- {{ settings.headingDeviation }}°)
					</label>
					<small>0° will point directly towards the road.</small>
				</div>

				<Checkbox v-model:checked="settings.adjustPitch" label="Adjust pitch" />
				<div v-if="settings.adjustPitch" class="indent">
					<label class="flex wrap">
						Pitch deviation <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" /> ({{ settings.pitchDeviation }}°)
					</label>
					<small>0 by default. -90° for tarmac/+90° for sky</small>
				</div>
			</div>
			<hr />
			
			<h4 class="center mb-2">Marker settings</h4>
			<div v-if="settings.rejectUnofficial && !settings.rejectOfficial">
				<Checkbox v-model:checked="settings.cluster" v-on:change="updateClusters" label="Cluster markers" title="For lag reduction." />
			       <Checkbox
				v-model:checked="settings.gen4Marker"
				v-on:change="updateMarkerDisplay('gen4')"
				label="Gen 4 Update"
				/>
				<Checkbox
				 v-model:checked="settings.gen2Or3Marker"
				 v-on:change="updateMarkerDisplay('gen2Or3')"
				 label="Gen 2 or 3 Update"
				/>
				<Checkbox
				 v-model:checked="settings.gen1Marker"
				 v-on:change="updateMarkerDisplay('gen1')"
				 label="Gen 1 Update"
				/>
				<Checkbox
				 v-model:checked="settings.newRoadMarker"
				 v-on:change="updateMarkerDisplay('newRoad')"
				 label="New Road"
				/>
			</div>
			<hr />
			
			<h4 class="center">General settings</h4>
			
			<div>
				Radius
				<input type="number" v-model.number="settings.radius" @change="handleRadiusInput" />
				m
			</div>
			
			<div>
				Generators
				<input type="number" v-model.number="settings.num_of_generators" />
			</div>
			
			<Checkbox v-model:checked="settings.oneCountryAtATime" label="Only check one country/polygon at a time." />
			
			<div v-if="!settings.selectMonths">
				<div class="flex space-between mb-2">
					<label>From</label>
					<input type="month" v-model="settings.fromDate" min="2007-01" :max="dateToday" />
				</div>
				<div class="flex space-between">
					<label>To</label>
					<input type="month" v-model="settings.toDate" :max="dateToday" />
				</div>
			</div>
			
			<div v-if="!settings.rejectOfficial">
			<Checkbox v-model:checked="settings.selectMonths" label="Filter by month" />
				<div v-if="settings.selectMonths">
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
					<label> to </label>
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
					<br>
					<label> Between years </label> 
					<input type="number" v-model.number="settings.fromYear" />
					<label> and </label>
					<input type="number" v-model.number="settings.toYear" />
				</div>
		</div>
		
		<Checkbox v-model:checked="settings.findRegions" label="Filter by distance from locations" />
		<div v-if="settings.findRegions">
			<input type="number" v-model.number="settings.regionRadius" /> <label> km </label>
		</div>
		
		<Checkbox v-model:checked="settings.checkAllDates" label="Check all dates" />
			 
		<hr />
		<div class="customLayers">
			<h4 class="center mb-2">
			Custom Layers ({{ Object.keys(customLayers).length }})
		      </h4>
		      <input type="file" @change="customLayerFileProcess" accept=".txt,.json,.geojson" />
		      <select @change="importLayer">
			<option value=""></option>
			<option value="/geojson/us_county_min.json">US Counties</option>
			<option value="/geojson/urban_areas.geojson">Urban Areas</option>
		      </select>
		      <div v-for="(value, name) of customLayers" class="line flex space-between">
			<div class="flex-center">{{ name }}</div>
			<a @click="selectAllLayer(value)" class="smallbtn bg-success" style="width: 25%">Select All</a>
			<button @click="removeCustomLayer(name)" type="button" class="close" aria-label="Close">×</button>
			</div>
		   </div>
		</div>
		
		<Button
			v-if="canBeStarted"
			@click="handleClickStart"
			:class="state.started ? 'bg-danger' : 'bg-success'"
			:text="state.started ? 'Pause' : 'Start'"
			title="Space bar/Enter"
		/>
		
		<Button @click="exportDrawnLayer" text="Export Drawn Layer" style="background-color: #005cc8" />
	</div>

	<div v-if="!state.started && hasResults" class="overlay export bottom right">
		<h4 class="center mb-2">Export selection to</h4>
		<div class="flex gap">
			<CopyToClipboard :selection="selected" />
			<ExportToJSON :selection="selected" />
			<ExportToCSV :selection="selected" />
		</div>
	</div>
</template>

<script setup>
import { onMounted, ref, reactive, computed } from "vue";
import Button from "@/components/Elements/Button.vue";
import Checkbox from "@/components/Elements/Checkbox.vue";
import Spinner from "@/components/Elements/Spinner.vue";
import Logo from "@/components/Elements/Logo.vue";

import CopyToClipboard from "@/components/copyToClipboard.vue";
import ExportToJSON from "@/components/exportToJSON.vue";
import ExportToCSV from "@/components/exportToCSV.vue";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/assets/leaflet-draw/leaflet.draw.js";
import "@/assets/leaflet-draw/leaflet.draw.css";
import marker from "@/assets/images/marker-icon.png";
import markerRed from "@/assets/images/marker-icon-red.png";
import markerViolet from "@/assets/images/marker-icon-violet.png";
import markerGreen from "@/assets/images/marker-icon-green.png";

import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster.freezable/dist/leaflet.markercluster.freezable.js';
import "leaflet-contextmenu/dist/leaflet.contextmenu.js";
import "leaflet-contextmenu/dist/leaflet.contextmenu.css";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import borders from "@/utils/borders.json";
window.type = !0;
window.onbeforeunload = function(){
    return "Are you sure you want to close the generator?";
}

(function(global){
  var MarkerMixin = {
    _updateZIndex: function (offset) {
      this._icon.style.zIndex = this.options.forceZIndex ? (this.options.forceZIndex + (this.options.zIndexOffset || 0)) : (this._zIndex + offset);
    },
    setForceZIndex: function(forceZIndex) {
      this.options.forceZIndex = forceZIndex ? forceZIndex : null;
    }
  };
  if (global) global.include(MarkerMixin);
})(L.Marker);

const state = reactive({
	started: false,
	polygonID: 0,
});

const dateToday = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0");

const settings = reactive({
	radius: 500,
	rejectUnofficial: true,
	rejectOfficial: false,
	rejectNoDescription: true,
	rejectDescription: false,
	rejectDateless: true,
	adjustHeading: true,
	headingDeviation: 0,
	adjustPitch: true,
	pitchDeviation: 10,
	rejectByYear: false,
	fromDate: "2009-01",
	toDate: dateToday,
	fromMonth: "01",
	toMonth: "12",
	fromYear: "2007",
	toYear: "2022",
	checkAllDates: true,
	checkLinks: false,
	linksDepth: 2,
  	markersOnImport: true,
  	checkImports: false,
	cluster: false,
	gen4Marker: true,
  	gen2Or3Marker: true,
  	gen1Marker: true,
  	newRoadMarker: true,
  	onlyOneInTimeframe: false,
  	oneCountryAtATime: false,
	num_of_generators: 1,
	findGeneration: false,
	generation: 1,
	getIntersection: false,
	pinpointSearch: false,
	pinpointAngle: 145,
	selectMonths: false,
	findRegions: false,
	regionRadius: 100,
});

const select = ref("Select a country or draw a polygon");
const selected = ref([]);
const canBeStarted = computed(() => selected.value.some((country) => country.found.length < country.nbNeeded));
const hasResults = computed(() => selected.value.some((country) => country.found.length > 0));

let map;
const allFound = [];
const allFoundPanoIds = new Set();
let customLayers = {};

const customPolygonsLayer = new L.FeatureGroup();
const markerLayers = {
  'gen4': L.markerClusterGroup({
    maxClusterRadius: 100,
    disableClusteringAtZoom: 15,
  }),
  'gen2Or3': L.markerClusterGroup({
    maxClusterRadius: 100,
    disableClusteringAtZoom: 15,
  }),
  'gen1': L.markerClusterGroup({
    maxClusterRadius: 100,
    disableClusteringAtZoom: 15,
  }),
  'newRoad': L.markerClusterGroup({
    maxClusterRadius: 100,
    disableClusteringAtZoom: 15,
  }),
}
const preHiddenLayers = {
  'gen4': [],
  'gen2Or3': [],
  'gen1': [],
  'newRoad': []
}
const geojson = L.geoJson(borders, {
  style: style,
  onEachFeature: onEachFeature,
  contextmenu: true
});

const roadmapLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}", { subdomains: ["mt0", "mt1", "mt2", "mt3"] });
const googleSatelliteLayer = L.tileLayer("http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}", { subdomains: ["mt0", "mt1", "mt2", "mt3"] });
const googleTerrainLayer = L.tileLayer("http://mt0.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}", { subdomains: ["mt0", "mt1", "mt2", "mt3"] });
const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
const cartoLightLayer = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", { subdomains: ["a", "b", "c"] });
const cartoDarkLayer = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png", { subdomains: ["a", "b", "c"] });
const gsvLayer = L.tileLayer("https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e2!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e2*212b1*213e2!3m3!3sUS!12m1!1e68!4e0");
const gsvLayer2 = L.tileLayer("https://{s}.googleapis.com/vt?hl=en-US&lyrs=svv|cb_client:app&style=5,8&x={x}&y={y}&z={z}", { subdomains: ["mt0", "mt1", "mt2", "mt3"] });
const gsvLayer3 = L.tileLayer("https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e2!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e2*212b1*213e2!3m3!3sUS!12m1!1e68!4e0", { minZoom: 12, minNativeZoom: 14 });
const baseMaps = {
  Roadmap: roadmapLayer,
  Satellite: googleSatelliteLayer,
  Terrain: googleTerrainLayer,
  OSM: osmLayer,
  "Carto Light": cartoLightLayer,
  "Carto Dark": cartoDarkLayer,
};

const overlayMaps = {
  "Google Street View": gsvLayer,
  "Google Street View Official Only": gsvLayer2,
  "Google Street View Roads (Only Works at Zoom Level 12+)": gsvLayer3,
};

const drawControl = new L.Control.Draw({
  position: "bottomleft",
  draw: {
    polyline: false,
    marker: false,
    circlemarker: false,
    circle: false,
    polygon: {
      allowIntersection: false,
      drawError: {
        color: "#e1e100",
        message: "<strong>Polygon draw does not allow intersections!<strong> (allowIntersection: false)",
      },
      shapeOptions: { color: "#5d8ce3" },
    },
    rectangle: { shapeOptions: { color: "#5d8ce3" } },
  },
  edit: { featureGroup: customPolygonsLayer },
});

const copyCoords = (e) => {
  navigator.clipboard.writeText(e.latlng.lat.toFixed(7) + ", " + e.latlng.lng.toFixed(7));
};

const openNearestPano = (e) => {
  open("https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + e.latlng.lat + "," + e.latlng.lng);
};

onMounted(() => {
  map = L.map("map", {
    attributionControl: false,
    contextmenu: true,
    contextmenuItems: [
      {text: "Copy Coordinates", callback: copyCoords},
      {text: "See Nearest Pano", callback: openNearestPano}
    ],
    center: [0, 0],
    preferCanvas: true,
    zoom: 2,
    zoomControl: false,
    worldCopyJump: true,
  });
  roadmapLayer.addTo(map);
  gsvLayer2.addTo(map);
  geojson.addTo(map);
  customPolygonsLayer.addTo(map);
  Object.values(markerLayers).forEach((markerLayer) => {
    markerLayer.addTo(map);
  });
  updateClusters();
  L.control.layers(baseMaps, overlayMaps, { position: "bottomleft" }).addTo(map);
  map.addControl(drawControl);
  map.on("draw:created", (e) => {
    state.polygonID++;
    const polygon = e.layer;
    polygon.feature = e.layer.toGeoJSON();
    polygon.found = [];
    polygon.nbNeeded = 10000000;
    polygon.checkedPanos = new Set();
    polygon.feature.properties.name = `Custom polygon ${state.polygonID}`;
    polygon.setStyle(customPolygonStyle());
    polygon.setStyle(highlighted());
    polygon.on("mouseover", (e) => highlightFeature(e));
    polygon.on("mouseout", (e) => resetHighlight(e));
    polygon.on("click", (e) => selectCountry(e));
    customPolygonsLayer.addLayer(polygon);
    selected.value.push(polygon);
  });
  
  map.on("draw:edited", (e) => {
    e.layers.eachLayer((layer) => {
      const polygon = layer;
      polygon.feature = layer.toGeoJSON();
      const index = selected.value.findIndex((x) => L.Util.stamp(x) === L.Util.stamp(layer));
      if (index != -1) selected.value[index] = polygon;
    })
  });
  
  map.on("draw:deleted", (e) => {
    e.layers.eachLayer((layer) => {
      const index = selected.value.findIndex((x) => L.Util.stamp(x) === L.Util.stamp(layer));
      if (index != -1) selected.value.splice(index, 1);
    });
  });
  
  const mapDiv = document.getElementById("map");
  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize();
  });
  resizeObserver.observe(mapDiv);
});

async function readFileAsText(file) {
  const result = await new Promise((resolve) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsText(file);
  });
  return result;
}

async function customLayerFileProcess(e) {
  for (const file of e.target.files) {
    const result = await readFileAsText(file);
    try {
      const JSONResult = JSON.parse(result);
      addCustomLayer(JSONResult, file.name);
    } catch (e) {
      alert("Invalid GeoJSON.");
    }
  }
}

function addCustomLayer(geoJSON, name) {
  try {
    const newLayer = L.geoJson(geoJSON, {
      style: style,
      onEachFeature: onEachFeature,
      contextmenu: true
    });
    for (const layer in newLayer._layers) {
      const polygon = newLayer._layers[layer];
      polygon.setStyle(customPolygonStyle());
    }
    newLayer.addTo(map);
    customLayers[name] = newLayer;
  } catch (e) {
    alert("Invalid GeoJSON.");
  }
}

function collapsible_content()
{
	// Collapisbles
	var coll = document.getElementsByClassName("collapsible");
	var i;

	for (i = 0; i < coll.length; i++) {
		coll[i].classList.toggle("active");
		var content = coll[i].nextElementSibling;
		if (content.style.display === "block") {
		  content.style.display = "none";
		} else {
		  content.style.display = "block";
		}
	}
}


async function changeLocationsCaps() {
  const newCap = Math.abs(parseInt(prompt("What would you like to set the locations cap to?")));
  if (!isNaN(newCap)) {
    for (const polygon of selected.value) polygon.nbNeeded = newCap;
  }
}

async function locationsFileProcess(e, country) {
  for (const file of e.target.files) {
    const result = await readFileAsText(file);
    if (file.type == "application/json") {
      let JSONResult;
      try {
        JSONResult = JSON.parse(result);
        if (!JSONResult.customCoordinates) {
          throw Error;
        }
      } catch (e) {
        alert("Invalid JSON.");
      }
      for (const location of JSONResult.customCoordinates) {
        if (!location.panoId || !location.lat || !location.lng) continue;
        if (settings.checkImports) {
          for (let link of location.links) {
            if (!JSONResult.customCoordinates.some(loc => loc.panoId === link)) getPano(link, country);
          }
        }
        addLocation(location, country, settings.markersOnImport, gen4Icon);
      }
    } else {
      alert("Unknown file type: " + file.type + ". Only JSON may be imported.");
    }
  }
}

async function importLayer(e) {
  if (!e.target.value) return;
  const response = await fetch(e.target.value);
  const data = await response.json();
  addCustomLayer(data, e.target.value);
  e.target.options[e.target.selectedIndex].remove();
  e.target.value = "";
}

function removeCustomLayer(name) {
  customLayers[name].remove();
  delete customLayers[name];
}

function exportDrawnLayer() {
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customPolygonsLayer.toGeoJSON()));
  const fileName = "DrawnLayer.geojson";
  const linkElement = document.createElement("a");
  linkElement.href = dataUri;
  linkElement.download = fileName;
  linkElement.click();
}

const handleRadiusInput = (e) => {
  const value = parseInt(e.target.value);
  if (!value || value < 50)  settings.radius = 50;
  else if (value > 1000000) settings.radius = 1000000;

};

const gen4Icon = L.icon({
  iconUrl: marker,
  iconAnchor: [12, 41],
});

const gen1Icon = L.icon({
  iconUrl: markerGreen,
  iconAnchor: [12, 41],
});

const gen2Or3Icon = L.icon({
  iconUrl: markerViolet,
  iconAnchor: [12, 41],
});

const newLocIcon = L.icon({
  iconUrl: markerRed,
  iconAnchor: [12, 41],
});

// Process
document.onkeydown = () => {
	if (window.event.keyCode == "13" || window.event.keyCode == "32") {
		handleClickStart();
	}
};
const handleClickStart = () => {
	state.started = !state.started;
	start();
};

const start = async () => {
  	if (settings.oneCountryAtATime) for (const polygon of selected.value) await generate(polygon);
	const generator = [];
	for (let polygon of selected.value) {
	    for (let i = 0; i < settings.num_of_generators; i++) {
	    	generator.push(generate(polygon));
	    }
	}
	await Promise.all(generator);
	state.started = false;
};

Array.prototype.chunk = function (n) {
	if (!this.length) {
		return [];
	}
	return [this.slice(0, n)].concat(this.slice(n).chunk(n));
};

const SV = new google.maps.StreetViewService();

top.all = function () {
  return allFound;
};

top.allCSV = function () {
  let csv = "";
  let nbLocs = 0;
  allFound.forEach((loc) => {
    csv += loc.lat + "," + loc.lng + ",\n";
    nbLocs++;
  });
  const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const fileName = `Generated map (${nbLocs} location${nbLocs > 1 ? "s" : ""}).csv`;
  const linkElement = document.createElement("a");
  linkElement.href = dataUri;
  linkElement.download = fileName;
  linkElement.click();
};

top.allJSON = () => {
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ customCoordinates: allFound }));
  const fileName = `Generated map (${allFound.length} location${allFound.length > 1 ? "s" : ""}).json`;
  const linkElement = document.createElement("a");
  linkElement.href = dataUri;
  linkElement.download = fileName;
  linkElement.click();
};

function updateClusters() {
  Object.values(markerLayers).forEach((markerLayer) => {
    if (settings.cluster) markerLayer.enableClustering();
    else markerLayer.disableClustering();
  });
}

function updateMarkerDisplay(gen) {
  let hide = false;
  if ((gen === "gen4" && !settings.gen4Marker)
   || (gen === "gen2Or3" && !settings.gen2Or3Marker) 
   || (gen === "gen1" && !settings.gen1Marker)
   || (gen === "newRoad" && !settings.newRoadMarker)) {
    hide = true;
  }
  if (hide) {
    preHiddenLayers[gen] = markerLayers[gen];
    map.removeLayer(markerLayers[gen]);
  } else {
    map.addLayer(preHiddenLayers[gen]);
    preHiddenLayers[gen] = [];
  }
}

const generate = async (country) => {
  while (country.found.length < country.nbNeeded) {
    if (!state.started) return;
    country.isProcessing = true;
    const randomCoords = [];
    const n = Math.min(country.nbNeeded * 100, 1000);
    while (randomCoords.length < n) {
      const point = randomPointInPoly(country);
      if (booleanPointInPolygon([point.lng, point.lat], country.feature)) randomCoords.push(point);
    }
	if (!settings.findRegions){
		for (const locationGroup of randomCoords.chunk(75)) {
		  await Promise.allSettled(locationGroup.map((l) => getLoc(l, country)));
		}
	}
	else if (settings.findRegions){
		for (const locationGroup of randomCoords.chunk(1)) {
		  await Promise.allSettled(locationGroup.map((l) => getLoc(l, country)));
		}
	}
  }
  country.isProcessing = false;
};

function getCameraGeneration(res){
	const { worldSize } = res.tiles
	switch (worldSize.height) {
		case 1664: return 1;
		case 6656: return 23;
		case 8192: return 4;
		default: return 0;
	}
}

function distance(coords1, coords2)
{
  // var R = 6.371; // km
  var R = 6371000;
  var dLat = toRad(coords2.lat-coords1.lat);
  var dLon = toRad(coords2.lng-coords1.lng);
  var lat1 = toRad(coords1.lat);
  var lat2 = toRad(coords2.lat);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c;
  return d;
}

// Converts numeric degrees to radians
function toRad(Value)
{
    return Value * Math.PI / 180;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLoc(loc, country) {
  return SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, (res, status) => {
    if (status != google.maps.StreetViewStatus.OK) return false;
    if (settings.rejectUnofficial && !settings.rejectOfficial) {
	    if (res.location.pano.length != 22) return false;
	    if (settings.rejectNoDescription && !settings.rejectDescription && !res.location.description && !res.location.shortDescription) return false;
	    if (settings.getIntersection && res.links.length < 3) return false;
	    if (settings.rejectDescription && (res.location.description || res.location.shortDescription)) return false;
	    if (settings.pinpointSearch && res.links.length < 2) return false;
	    if (settings.getIntersection && !settings.pinpointSearch && res.links.length < 3) return false;
	    if (settings.pinpointSearch && (res.links.length == 2 && Math.abs(res.links[0].heading - res.links[1].heading) > settings.pinpointAngle)) return false;
    }
	
	if (settings.findRegions){
		settings.checkAllDates = false;
		var i = 0, len = country.found.length;
		while (i < len){
			if (distance(country.found[i], loc) < settings.regionRadius * 1000) {
				return false;
			}
			i++;
		}
	}
    
    if (settings.rejectOfficial) {
		if (/^\xA9 (?:\d+ )?Google$/.test(res.copyright)) return false;
    }
	
	if (settings.findGeneration && (!settings.checkAllDates || settings.selectMonths)){
		if (getCameraGeneration(res) != settings.generation) return false;	
	}
	
    if (settings.checkAllDates && res.time && !settings.selectMonths && !settings.rejectOfficial) {
      if (!res.time.length) return false;
      const fromDate = Date.parse(settings.fromDate);
      const toDate = Date.parse(settings.toDate);
      let dateWithin = false;
      for (const loc of res.time) {
        if (settings.rejectUnofficial && loc.pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
        const date = Object.values(loc).find((val) => val instanceof Date);
        const iDate = Date.parse(date.getFullYear() + "-" + (date.getMonth() > 8 ? "" : "0") + (date.getMonth() + 1)); // this will parse the Date object from res.time[i] (like Fri Oct 01 2021 00:00:00 GMT-0700 (Pacific Daylight Time)) to a local timestamp, like Date.parse("2021-09") == 1630454400000 for Pacific Daylight Time
        if (iDate >= fromDate && iDate <= toDate) {
          // if date ranges from fromDate to toDate, set dateWithin to true and stop the loop
          dateWithin = true;
          getPano(loc.pano, country);
        }
      }
      if (!dateWithin) return false;
    } else {
      if (settings.rejectDateless && !res.imageDate) return false;
      if (Date.parse(res.imageDate) < Date.parse(settings.fromDate) || Date.parse(res.imageDate) > Date.parse(settings.toDate)) return false;
      getPano(res.location.pano, country);
    }
    
    if (settings.selectMonths && !settings.rejectOfficial) {
	if (!res.time?.length) return false;
	let dateWithin = false;
	const fromMonth = settings.fromMonth;
	const toMonth = settings.toMonth;
	const fromYear = settings.fromYear;
	const toYear = settings.toYear;
	if (settings.checkAllDates){
		for (var i = 0; i < res.time.length; i++) {
			const timeframeDate = Object.values(res.time[i]).find((val) => isDate(val));

			if (settings.rejectUnofficial && res.time[i].pano.length != 22) continue; // Checks if res ID is 22 characters long. Otherwise, it's an Ari
			const iDateMonth = timeframeDate.getMonth() + 1;
			const iDateYear = timeframeDate.getFullYear(); 

			if (fromMonth <= toMonth){
				if (iDateMonth >= fromMonth && iDateMonth <= toMonth && iDateYear >= fromYear && iDateYear <= toYear) {
					dateWithin = true;
					break;
				}
			}
			else {
				if ((iDateMonth >= fromMonth || iDateMonth <= toMonth) && iDateYear >= fromYear && iDateYear <= toYear) {
					dateWithin = true;
					break;
				}
			}

		} 
		if (!dateWithin) return false;
	}
	else{
		if (res.imageDate.slice(0, 4) < fromYear || res.imageDate.slice(0, 4) > toYear) return false;
		if (fromMonth <= toMonth){
			if (res.imageDate.slice(5) < fromMonth || res.imageDate.slice(5) > toMonth) return false;
		}
		else{
			if (res.imageDate.slice(5) < fromMonth && res.imageDate.slice(5) > toMonth) return false;
		}
	}
    }

    return true;
  });
}

function isPanoGood(pano) {
  if (settings.rejectUnofficial && !settings.rejectOfficial) {
    if (pano.location.pano.length != 22) return false;
    // if (!/^\xA9 (?:\d+ )?Google$/.test(pano.copyright)) return false;
    if (settings.rejectNoDescription && !settings.rejectDescription && !pano.location.description && !pano.location.shortDescription) return false;
    if (settings.getIntersection && pano.links.length < 3) return false;
    if (settings.rejectDescription && (pano.location.description || pano.location.shortDescription)) return false;
    if (settings.pinpointSearch && pano.links.length < 2) return false;
    if (settings.getIntersection && !settings.pinpointSearch && pano.links.length < 3) return false;
    if (settings.pinpointSearch && (pano.links.length == 2 && Math.abs(pano.links[0].heading - pano.links[1].heading) > settings.pinpointAngle)) return false;
  }
  
  if (settings.rejectDateless && !pano.imageDate) return false;
  const fromDate = Date.parse(settings.fromDate);
  const toDate = Date.parse(settings.toDate);
  const locDate = Date.parse(pano.imageDate);
  const fromMonth = settings.fromMonth;
  const toMonth = settings.toMonth;
  const fromYear = settings.fromYear;
  const toYear = settings.toYear;
 
  if (!settings.selectMonths){
	if (!settings.checkAllDates || settings.rejectOfficial) {
		if (locDate < fromDate || locDate > toDate) return false;
	}
  }
  
  if (settings.onlyOneInTimeframe) {
    for (const loc of pano.time) {
      if (settings.rejectUnofficial && loc.pano.length != 22) continue;
      if (loc.pano == pano.location.pano) continue;
      const date = Object.values(loc).find((val) => val instanceof Date);
      const iDate = Date.parse(date.getFullYear() + "-" + (date.getMonth() > 8 ? "" : "0") + (date.getMonth() + 1));
      if (iDate >= fromDate && iDate <= toDate) return false;
    }
  }
  
  if (settings.checkAllDates && !settings.selectMonths && !settings.rejectOfficial) {
	if (!pano.time?.length) return false;
	if (settings.findGeneration){
		if (getCameraGeneration(pano) != settings.generation) return false;	
	}
	let dateWithin = false;
	for (var i = 0; i < pano.time.length; i++) {
		const timeframeDate = Object.values(pano.time[i]).find((val) => isDate(val));

		if (settings.rejectUnofficial && pano.time[i].pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
		const iDate = Date.parse(timeframeDate.getFullYear() + "-" + (timeframeDate.getMonth() > 8 ? "" : "0") + (timeframeDate.getMonth() + 1));

		if (iDate >= fromDate && iDate <= toDate) {
			dateWithin = true;
			break;
		}

	} 
	if (!dateWithin) return false;
   } 
   
   if (settings.selectMonths && !settings.rejectOfficial) {
	if (!pano.time?.length) return false;
	let dateWithin = false;

	if (settings.checkAllDates){
		for (var i = 0; i < pano.time.length; i++) {
			const timeframeDate = Object.values(pano.time[i]).find((val) => isDate(val));

			if (settings.rejectUnofficial && pano.time[i].pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
			const iDateMonth = timeframeDate.getMonth() + 1;
			const iDateYear = timeframeDate.getFullYear(); 
			
			if (fromMonth <= toMonth){
				if (iDateMonth >= fromMonth && iDateMonth <= toMonth && iDateYear >= fromYear && iDateYear <= toYear) {
					dateWithin = true;
					break;
				}
			}
			else {
				if ((iDateMonth >= fromMonth || iDateMonth <= toMonth) && iDateYear >= fromYear && iDateYear <= toYear) {
					dateWithin = true;
					break;
				}
			}

		} 
		if (!dateWithin) return false;
	}
	else{
		if (pano.imageDate.slice(0, 4) < fromYear || pano.imageDate.slice(0, 4) > toYear) return false;
		if (fromMonth <= toMonth){
			if (pano.imageDate.slice(5) < fromMonth || pano.imageDate.slice(5) > toMonth) return false;
		}
		else{
			if (pano.imageDate.slice(5) < fromMonth && pano.imageDate.slice(5) > toMonth) return false;
		}
	}

  	}

   return true;
}

top.goto = function (lat, lng) {
  map.setView(new L.LatLng(lat, lng), 13);
}

function getPano(id, country) {
  return getPanoDeep(id, country, 0);
}

function getPanoDeep(id, country, depth) {
  if (depth > settings.linksDepth) return;
  if (country.checkedPanos.has(id)) return;
  else country.checkedPanos.add(id);
  SV.getPanorama({ pano: id }, async (pano, status) => {
    if (status == google.maps.StreetViewStatus.UNKNOWN_ERROR) {
      country.checkedPanos.delete(id);
      return getPanoDeep(id, country, depth);
    } else if (status != google.maps.StreetViewStatus.OK) return;
    //successfulRequests++
    if (!pano) console.log(status, pano);
    const inCountry = booleanPointInPolygon([pano.location.latLng.lng(), pano.location.latLng.lat()], country.feature);
    const isPanoGoodAndInCountry = isPanoGood(pano) && inCountry;
    if (settings.checkAllDates && pano.time) {
      const fromDate = Date.parse(settings.fromDate);
      const toDate = Date.parse(settings.toDate);
      for (const loc of pano.time) {
        if (settings.rejectUnofficial && loc.pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
        const date = Object.values(loc).find((val) => val instanceof Date);
        const iDate = Date.parse(date.getFullYear() + "-" + (date.getMonth() > 8 ? "" : "0") + (date.getMonth() + 1)); // this will parse the Date object from res.time[i] (like Fri Oct 01 2021 00:00:00 GMT-0700 (Pacific Daylight Time)) to a local timestamp, like Date.parse("2021-09") == 1630454400000 for Pacific Daylight Time
        if (iDate >= fromDate && iDate <= toDate) {
          // if date ranges from fromDate to toDate, set dateWithin to true and stop the loop
          getPanoDeep(loc.pano, country, isPanoGoodAndInCountry ? 1 : depth + 1);
          // TODO: add settings.onlyOneLoc
          // if(settings.onlyOneLoc)break;
        }
      }
    }
    if (settings.checkLinks) {
      if (pano.links) {
        for (const loc of pano.links) {
          getPanoDeep(loc.pano, country, isPanoGoodAndInCountry ? 1 : depth + 1);
        }
      }
      if (pano.time) {
        for (const loc of pano.time) {
          getPanoDeep(loc.pano, country, isPanoGoodAndInCountry ? 1 : depth + 1);
        }
      }
    }
    if (isPanoGoodAndInCountry) addLoc(pano, country);
    return pano;
  });
}

const isDate = (date) => {
	return new Date(date) !== "Invalid Date" && !isNaN(new Date(date));
};

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function addLoc(pano, country) {
  const location = {
    panoId: pano.location.pano,
    lat: pano.location.latLng.lat(),
    lng: pano.location.latLng.lng(),
    heading: settings.adjustHeading && pano.links.length > 0 ? parseInt(pano.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation) : 0,
    pitch: settings.adjustPitch ? settings.pitchDeviation : 0,
    imageDate: pano.imageDate,
    links: [...new Set(pano.links.map(loc => loc.pano).concat(pano.time.map(loc => loc.pano)))].sort()
  };
  const index = location.links.indexOf(pano.location.pano);
  if (index != -1) location.links.splice(index, 1);
  // New road
  if (pano.time.length == 1) {
    return addLocation(location, country, true, newLocIcon);
  } else {
    // Check for ari
    let panoIndex = pano.time.length - 2;
    let previousPano;
    if (settings.rejectUnofficial) {
      while (panoIndex >= 0) {
        if (pano.time[panoIndex].pano.length == 22) {
          previousPano = pano.time[panoIndex].pano;
          break;
        } else {
          panoIndex--;
        }
      }
    }
    if (!previousPano) {
      return addLocation(location, country, true, newLocIcon);
    }
    SV.getPanorama(
      { pano: previousPano },
      async (previousPano) => {
        if (previousPano.tiles.worldSize.height === 1664) { // Gen 1
          return addLocation(location, country, true, gen1Icon);
        } else if (
          previousPano.tiles.worldSize.height === 6656 // Gen 2 or 3
        ) {
          return addLocation(location, country, true, gen2Or3Icon);
        } else { // Gen 4
          return addLocation(location, country, true, gen4Icon);
        }
      }
    );
  }
}

function addLocation(location, country, marker, iconType) {
  if (allFoundPanoIds.has(location.panoId)) return;
  allFound.push(location);
  allFoundPanoIds.add(location.panoId);
  let zIndex = 1;
  let markerLayer = markerLayers["gen4"];
  if (iconType == gen2Or3Icon) {
    zIndex = 2;
    markerLayer = markerLayers["gen2Or3"];
  } else if (iconType == gen1Icon) {
    zIndex = 3;
    markerLayer = markerLayers["gen1"];
  } else if (iconType == newLocIcon) {
    zIndex = 4;
    markerLayer = markerLayers["newRoad"];
  }
  if (!country || country.found.length < country.nbNeeded) {
    if (country) country.found.push(location);
    if (marker) {
      L.marker([location.lat, location.lng], { icon: iconType, forceZIndex: zIndex })
      .on('click', () => {
        window.open(`https://www.google.com/maps/@?api=1&map_action=pano&pano=${location.panoId}${location.heading ? '&heading=' + location.heading : ''}${location.pitch ? '&pitch=' + location.pitch : ''}`, '_blank');
        })
	.setZIndexOffset(zIndex)
	.addTo(markerLayer);
      }
    }
  }

const randomPointInPoly = (polygon) => {
	const bounds = polygon.getBounds();
	const x_min = bounds.getEast();
	const x_max = bounds.getWest();
	const y_min = bounds.getSouth();
	const y_max = bounds.getNorth();
	const lat = (Math.asin(Math.random() * (Math.sin(y_max*Math.PI/180) - Math.sin(y_min*Math.PI/180)) + Math.sin(y_min*Math.PI/180)))*180/Math.PI;
	const lng = x_min + Math.random() * (x_max - x_min);
	return { lat, lng };
};

// Map features
function onEachFeature(feature, layer) {
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: selectCountry,
	});
}

function getName(poly) {
 const properties = poly.feature.properties;
 return (
	properties.name ||
	properties.NAME ||
	properties.NAMELSAD ||
	properties.NAMELSAD10 ||
	properties.city ||
	properties.CITY ||
	properties.county ||
	properties.COUNTY ||
	properties.COUNTY_STATE_CODE ||
	properties.COUNTY_STATE_NAME ||
	properties.PRNAME ||
	properties.prov_name_en ||
	properties.state ||
	properties.STATE ||
	properties.country ||
	properties.COUNTRY ||
	properties.id ||
	properties.ID
 );
}

function initLayer(layer) {
	if (!layer.found) layer.found = [];
	if (!layer.nbNeeded) layer.nbNeeded = 10000000;
	if (!layer.checkedPanos) layer.checkedPanos = new Set();
	return layer;
}

  function selectCountry(e) {
    if (state.started) return;
    const country = e.target;
    initLayer(country);
    const index = selected.value.findIndex((x) => L.Util.stamp(x) === L.Util.stamp(country));
    if (index == -1) {
      country.setStyle(highlighted());
      selected.value.push(country);
    } else {
      selected.value.splice(index, 1);
      resetHighlight(e);
    }
  }
  
  function selectAll() {
      selected.value = geojson.getLayers().map((country) => {
      initLayer(country);
      return country;
    });
    geojson.setStyle(highlighted);
  }

  function selectAllLayer(layer) {
    layer.setStyle(highlighted);
    for (const feature in layer._layers) {
      initLayer(layer._layers[feature]);
      if (!selected.value.includes(layer._layers[feature])) selected.value.push(layer._layers[feature]);
    }
  }
  
  function deselectAll() {
    selected.value.length = 0;
    geojson.setStyle(style());
    customPolygonsLayer.setStyle(customPolygonStyle());
    Object.values(customLayers).forEach((customLayer) => Object.values(customLayer._layers).forEach((polygon) => polygon.setStyle(customPolygonStyle())));
  }
  
function highlightFeature(e) {
  if (state.started) return;
  const layer = e.target;
  if (!selected.value.some((x) => L.Util.stamp(x) === L.Util.stamp(layer))) layer.setStyle(highlighted());
  select.value = `${getName(layer)} ${layer.found ? "(" + layer.found.length + ")" : "(0)"}`;
}

function resetHighlight(e) {
  const layer = e.target;
  if (!selected.value.some((x) => L.Util.stamp(x) === L.Util.stamp(layer))) layer.setStyle(removeHighlight());
  select.value = "Select a country or draw a polygon";
}

function style() {
  return {
    opacity: 0,
    fillOpacity: 0,
  };
}

function customPolygonStyle() {
  return {
    weight: 2,
    opacity: 1,
    color: getRandomColor(),
    fillOpacity: 0,
  };
}

function highlighted() {
  return {
    fillColor: getRandomColor(),
    fillOpacity: 0.5,
  };
}

function removeHighlight() {
  return { fillOpacity: 0 };
}

function getRandomColor() {
  const red = Math.floor(((1 + Math.random()) * 256) / 2);
  const green = Math.floor(((1 + Math.random()) * 256) / 2);
  const blue = Math.floor(((1 + Math.random()) * 256) / 2);
  return "rgb(" + red + ", " + green + ", " + blue + ")";
}

function clearMarkers() {
  Object.values(markerLayers).forEach((markerLayer) => {
    markerLayer.clearLayers();
  });
}

function clearLocations() {
  for (const polygon of selected.value) polygon.found.length = 0;
}


</script>

<style>
@import "@/assets/main.css";
.smallbtn {
  color: #000;
  display: block;
  padding: 0.2rem;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 0 2px rgb(0 0 0 / 40%);
}
button.close {
  padding: 0;
  background-color: transparent;
  border: 0;
  font-size: 25px;
  color: red;
  cursor: pointer;
}
#map {
  z-index: 0;
  height: 100vh;
}
.leaflet-container {
  background-color: #2c2c2c;
}
.overlay {
  position: absolute;
}
.select,
.selected,
.settings,
.export {
  padding: var(--space-2);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.7);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
}
.selected {
  max-height: calc(100vh - 390px);
  overflow: auto;
}
.settings {
  max-width: 375px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}
.export {
  min-width: 375px;
}
.line {
  line-height: 1.5rem;
}
.collapsible {
  border: none;
  outline: none;
  display: block;
  color: #fff;
  font-weight: bold;
}
</style>
