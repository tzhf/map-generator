<template>
	<div id="map"></div>
	<div class="overlay top flex-col gap">
		<Logo class="mb-3" />
		<div v-if="!state.started" class="flex-col gap">
			<div class="switchLayer mb-1">
				<input id="covered" type="radio" @change="switchLayer($event)" value="1" v-model="state.chosenLayer" />
				<label title="Covered territories" for="covered">Covered territories</label>

				<input id="all" type="radio" @change="switchLayer($event)" value="2" v-model="state.chosenLayer" />
				<label title="All territories" for="all">All territories</label>

				<input id="draw" type="radio" @change="switchLayer($event)" value="3" v-model="state.chosenLayer" />
				<label title="Draw custom polygons" for="draw">Draw polygons</label>
			</div>

			<div v-if="!state.isDrawMode" class="flex-col gap">
				<h4 class="select">{{ select }}</h4>
				<div class="flex gap">
					<Button @click="selectAll" class="bg-success" text="Select all" title="Select all" />
					<Button @click="deselectAll" class="bg-danger" v-if="selected.length" text="Deselect all" title="Deselect all" />
				</div>
			</div>
		</div>

		<div class="selected" v-if="!state.isDrawMode && selected.length > 0">
			<h4 class="center mb-2">Countries/Territories ({{ selected.length }})</h4>
			<div v-for="country of selected" class="line flex space-between">
				<div class="flex-center">
					<span :class="`flag-icon flag-` + country.feature.properties.code.toLowerCase()"></span>{{ country.feature.properties.name }}
					<Spinner v-if="state.started && country.isProcessing" class="ml-2" />
				</div>
				<div>
					{{ country.found ? country.found.length : "0" }} / <input type="number" :min="country.found ? country.found.length : 0" v-model="country.nbNeeded" />
				</div>
			</div>
		</div>

		<div class="selected" v-if="state.isDrawMode && selected.length">
			<h4 class="center mb-2">Custom polygons ({{ selected.length }})</h4>
			<div v-for="(polygon, index) of selected" class="line flex space-between">
				<div class="flex-center">
					Polygon {{ index + 1 }}
					<Spinner v-if="state.started && polygon.isProcessing" class="ml-2" />
				</div>
				<div>
					{{ polygon.found ? polygon.found.length : "0" }} / <input type="number" :min="polygon.found ? polygon.found.length : 0" v-model="polygon.nbNeeded" />
				</div>
			</div>
		</div>

		<Button
			@click="clearMarkers"
			class="bg-warning"
			text="Clear markers"
			optText="(for performance, this won't erase your generated locations)"
			title="Clear markers"
		/>
	</div>

	<div class="overlay top right flex-col gap">
		<div class="settings" v-if="!state.started">
			<h4 class="center">Settings</h4>
			<Checkbox v-model:checked="settings.rejectUnofficial" label="Reject unofficial" />
			<hr />
			<div v-if="settings.rejectUnofficial">
				<Checkbox v-model:checked="settings.rejectNoDescription" label="Reject locations without description" />
				<small>This might prevent trekkers in most cases</small>
				<hr />
				<Checkbox v-model:checked="settings.getIntersection" label="Prefer intersections" />
				<hr />
			</div>
			<Checkbox v-model:checked="settings.adjustHeading" label="Adjust heading" />
			<div v-if="settings.adjustHeading" class="indent">
				<label class="flex wrap">
					Deviation <input type="range" v-model.number="settings.headingDeviation" min="0" max="50" /> (+/- {{ settings.headingDeviation }}°)
				</label>
				<small>0° will point directly towards the road.</small>
			</div>
			<hr />
			<Checkbox v-model:checked="settings.adjustPitch" label="Adjust pitch" />
			<div v-if="settings.adjustPitch" class="indent">
				<label class="flex wrap">
					Pitch deviation <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" /> ({{ settings.pitchDeviation }}°)
				</label>
				<small>0 by default. -90° for tarmac/+90° for sky</small>
			</div>
			<hr />

			<div>
				Radius
				<input type="number" v-model.number="settings.radius" @input="handleRadiusInput" />
				m
			</div>
			<small>
				Radius in which to search for a panorama.<br />
				Keep it between 100-1000m for best results. Increase it for poorly covered territories/intersections/specific search cases.
			</small>

			<hr />
			<div class="flex space-between mtb-1">
				<label>From</label>
				<input type="month" v-model="settings.fromDate" min="2007-01" :max="dateToday" />
			</div>
			<div class="flex space-between mtb-1">
				<label>To</label>
				<input type="month" v-model="settings.toDate" :max="dateToday" />
			</div>
		</div>

		<Button
			v-if="canBeStarted"
			@click="handleClickStart"
			:class="state.started ? 'bg-danger' : 'bg-success'"
			:text="state.started ? 'Pause' : 'Start'"
			title="Space bar/Enter"
		/>
	</div>
	<div class="overlay bottom right" v-if="!state.started && hasResults">
		<div class="export">
			<h4 class="center mb-2">Export selection to</h4>
			<div class="flex gap">
				<Button @click="copyToClipboard" class="bordered-success" text="Clipboard" title="Copy to clipboard" />
				<Button @click="exportAsJson" class="bordered-success" text="JSON" title="Export as JSON" />
				<Button @click="exportAsCSV" class="bordered-success" text="CSV" title="Export as CSV" />
			</div>
		</div>
	</div>
</template>

<script setup>
import { onMounted, ref, reactive, computed } from "vue";
import Button from "@/components/Elements/Button.vue";
import Checkbox from "@/components/Elements/Checkbox.vue";
import Spinner from "@/components/Elements/Spinner.vue";
import Logo from "@/components/Elements/Logo.vue";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/assets/leaflet-draw/leaflet.draw.js";
import "@/assets/leaflet-draw/leaflet.draw.css";
import marker from "@/assets/images/marker-icon.png";

import SVreq from "@/utils/SVreq";
import borders from "@/utils/borders.json";
import borders_coverage from "@/utils/borders_coverage.json";

const state = reactive({
	started: false,
	chosenLayer: 1,
	isDrawMode: false,
});

const dateToday = new Date().getFullYear() + "-" + (new Date().getMonth() + 1);
const settings = reactive({
	radius: 500,
	rejectUnofficial: true,
	rejectNoDescription: true,
	adjustHeading: true,
	headingDeviation: 0,
	adjustPitch: true,
	pitchDeviation: 10,
	rejectByYear: false,
	fromDate: "2009-01",
	toDate: dateToday,
	getIntersection: false,
});

const select = ref("Select a country");
const selected = ref([]);
const canBeStarted = computed(() => selected.value.some((country) => country.found.length < country.nbNeeded));
const hasResults = computed(() => selected.value.some((country) => country.found.length > 0));

let map;
let geojson;

const coverageGeoJSON = L.geoJson(borders_coverage, {
	style: style,
	onEachFeature: onEachFeature,
});
const allCountriesGeoJSON = L.geoJson(borders, {
	style: style,
	onEachFeature: onEachFeature,
});

const markerLayer = L.layerGroup();
const customPolygonsLayer = new L.FeatureGroup();
const drawPluginOptions = {
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
};
const drawControl = new L.Control.Draw(drawPluginOptions);

onMounted(() => {
	map = L.map("map", {
		attributionControl: false,
		center: [0, 0],
		zoom: 2,
		zoomControl: false,
		worldCopyJump: true,
		layers: [L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { subdomains: ["mt0", "mt1", "mt2", "mt3"], type: "roadmap" })],
	});

	geojson = coverageGeoJSON.addTo(map);

	markerLayer.addTo(map);

	map.on("draw:created", (e) => {
		customPolygonsLayer.addLayer(e.layer);
		const polygon = e.layer;
		polygon.feature = e.layer.toGeoJSON();
		polygon.found = [];
		polygon.nbNeeded = 100;
		polygon.layerID = Math.random().toString(36).substr(2, 9);
		selected.value.push(polygon);
	});
	map.on("draw:edited", (e) => {
		const layers = e.layers;
		layers.eachLayer((layer) => {
			const polygon = layer;
			polygon.feature = layer.toGeoJSON();
			const index = selected.value.findIndex((x) => x.layerID === layer.layerID);
			if (index == -1) {
				polygon.found = [];
				polygon.nbNeeded = 100;
				selected.value.push(polygon);
			} else {
				selected.value[index] = polygon;
			}
		});
	});

	map.on("draw:deleted", (e) => {
		const layers = e.layers;
		layers.eachLayer((layer) => {
			const index = selected.value.findIndex((x) => x.layerID === layer.layerID);
			selected.value.splice(index, 1);
		});
	});

	// Fix hard reload issue
	const mapDiv = document.getElementById("map");
	const resizeObserver = new ResizeObserver(() => {
		map.invalidateSize();
	});
	resizeObserver.observe(mapDiv);
});

const switchLayer = (e) => {
	deselectAll();
	clearMarkers();
	map.removeControl(drawControl);
	map.removeLayer(geojson);
	customPolygonsLayer.clearLayers();
	state.isDrawMode = false;

	switch (e.target.value) {
		case "1":
			geojson = coverageGeoJSON.addTo(map);
			break;
		case "2":
			geojson = allCountriesGeoJSON.addTo(map);
			break;
		case "3":
			state.isDrawMode = true;
			customPolygonsLayer.addTo(map);
			map.addControl(drawControl);
			break;
	}
};

// TODO better input validation
const handleRadiusInput = (e) => {
	const value = parseInt(e.target.value);
	if (value < 50) {
		settings.radius = 50;
	} else if (value > 10000) {
		settings.radius = 10000;
	}
};

const myIcon = L.icon({
	iconUrl: marker,
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
	for (let polygon of selected.value) {
		await generate(polygon);
	}
	state.started = false;
};

Array.prototype.chunk = function (n) {
	if (!this.length) {
		return [];
	}
	return [this.slice(0, n)].concat(this.slice(n).chunk(n));
};

const getCountryCode = (lat, lng) => {
	for (let feature of borders.features) {
		if (booleanPointInPolygon([lng, lat], feature)) return feature.properties.name;
	}
};

const generate = async (country) => {
	return new Promise(async (resolve) => {
		while (country.found.length < country.nbNeeded) {
			if (!state.started) return;
			country.isProcessing = true;
			const randomCoords = [];
			while (randomCoords.length < country.nbNeeded) {
				const point = randomPointInPoly(country);
				if (!state.isDrawMode) {
					if (country.feature.properties.name == getCountryCode(point.lat, point.lng)) {
						randomCoords.push(point);
					}
				} else {
					if (booleanPointInPolygon([point.lng, point.lat], country.feature)) {
						randomCoords.push(point);
					}
				}
			}
			for (let locationGroup of randomCoords.chunk(100)) {
				const responses = await Promise.allSettled(locationGroup.map((l) => SVreq(l, settings)));
				for (let res of responses) {
					if (res.status === "fulfilled" && country.found.length < country.nbNeeded) {
						country.found.push(res.value);
						L.marker([res.value.lat, res.value.lng], { icon: myIcon })
							.on("click", () => {
								window.open(
									`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${res.value.lat},${res.value.lng}
									${res.value.heading ? "&heading=" + res.value.heading : ""}
									${res.value.pitch ? "&pitch=" + res.value.pitch : ""}`,
									"_blank"
								);
							})
							.addTo(markerLayer);
					}
				}
			}
		}
		resolve();
		country.isProcessing = false;
	});
};

const randomPointInPoly = (polygon) => {
	const bounds = polygon.getBounds();
	const x_min = bounds.getEast();
	const x_max = bounds.getWest();
	const y_min = bounds.getSouth();
	const y_max = bounds.getNorth();

	const lat = y_min + Math.random() * (y_max - y_min);
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

function selectCountry(e) {
	if (state.started) return;
	const country = e.target;
	const index = selected.value.findIndex((x) => x.feature.properties.name === country.feature.properties.name);
	if (index == -1) {
		if (!country.found) country.found = [];
		if (!country.nbNeeded) country.nbNeeded = 100;
		country.setStyle(highlighted());
		selected.value.push(country);
	} else {
		selected.value.splice(index, 1);
		geojson.resetStyle(e.target);
	}
}

function selectAll() {
	selected.value = geojson.getLayers().map((country) => {
		if (!country.found) country.found = [];
		if (!country.nbNeeded) country.nbNeeded = 100;
		return country;
	});
	geojson.setStyle(highlighted);
}

function deselectAll() {
	selected.value.length = 0;
	geojson.setStyle(style);
}

function highlightFeature(e) {
	if (state.started) return;
	const layer = e.target;
	const index = selected.value.findIndex((x) => x.feature.properties.name === layer.feature.properties.name);
	if (index == -1) {
		layer.setStyle(highlighted());
	}
	select.value = `${layer.feature.properties.name} ${layer.found ? "(" + layer.found.length + ")" : "(0)"}`;
}
function resetHighlight(e) {
	const layer = e.target;
	const index = selected.value.findIndex((x) => x.feature.properties.name === layer.feature.properties.name);
	if (index == -1) {
		layer.setStyle(removeHighlight());
	}
	select.value = "Select a country";
}
function style() {
	return {
		opacity: 0,
		fillOpacity: 0,
	};
}
function highlighted() {
	return {
		fillColor: getRandomColor(),
		fillOpacity: 0.6,
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
	markerLayer.clearLayers();
}

// Export
const copyToClipboard = () => {
	const data = [];
	selected.value.map((country) => data.push(...country.found));
	navigator.clipboard.writeText(JSON.stringify({ customCoordinates: data })).catch((err) => {});
};
const exportAsJson = () => {
	const data = [];
	selected.value.map((country) => data.push(...country.found));
	const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ customCoordinates: data }));
	const fileName = `Generated map (${data.length} locations).json`;
	const linkElement = document.createElement("a");
	linkElement.href = dataUri;
	linkElement.download = fileName;
	linkElement.click();
};
const exportAsCSV = () => {
	let csv = "";
	selected.value.forEach((country) => country.found.forEach((coords) => (csv += coords.lat + "," + coords.lng + ",\n")));
	const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
	const fileName = `Generated map.csv`;
	const linkElement = document.createElement("a");
	linkElement.href = dataUri;
	linkElement.download = fileName;
	linkElement.click();
};
</script>

<style>
@import "@/assets/main.css";
#map {
	z-index: 0;
	height: 100vh;
}
.leaflet-container {
	background-color: #444444;
}
.line {
	line-height: 1.5rem;
}
.overlay {
	position: absolute;
	padding: 1rem;
}
.top {
	top: 0;
}
.right {
	right: 0;
}
.bottom {
	bottom: 0;
}
.select,
.selected,
.settings,
.export {
	padding: 0.5rem;
	color: #ffffff;
	background: rgba(0, 0, 0, 0.7);
	border-radius: 5px;
	box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
}
.selected {
	max-height: calc(100vh - 300px);
	overflow: auto;
}
.settings {
	max-width: 360px;
}
.switchLayer {
	/* min-width: 250px; */
}
.switchLayer input[type="radio"] {
	display: none;
}
.switchLayer input[type="radio"]:checked + label {
	background-color: var(--success);
	color: rgb(0, 0, 0);
}
.switchLayer label {
	display: inline-block;
	padding: 10px;
	background-color: rgba(0, 0, 0, 0.6);
	border-radius: 50px;
	cursor: pointer;
	user-select: none;
}
.switchLayer label:not(:last-child) {
	margin-right: 0.5em;
}
.switchLayer label:hover {
	background-color: var(--success);
	color: rgb(0, 0, 0);
}
</style>
