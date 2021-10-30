<template>
	<div id="map"></div>
	<div class="overlay top flex-col gap">
		<Logo class="mb-3" />
		<div v-if="!state.started">
			<div class="switch-layer flex flex-center space-between mb-1">
				Covered territories
				<label class="switch">
					<input type="checkbox" @change="switchLayer" />
					<span class="slider"></span>
				</label>
				All territories
			</div>
			<h4 class="select">{{ select }}</h4>
		</div>

		<div class="selected" v-if="selected.length">
			<h4 class="center mb-2">Countries/Territories ({{ selected.length }})</h4>
			<div v-for="country of selected" class="line flex space-between">
				<div class="flex flex-center">
					<span :class="`flag-icon flag-` + country.feature.properties.code.toLowerCase()"></span>{{ country.feature.properties.name }}
					<Spinner v-if="state.started && country.isProcessing" class="ml-2" />
				</div>
				<div>
					{{ country.found ? country.found.length : "0" }} / <input type="number" :min="country.found ? country.found.length : 0" v-model="country.nbNeeded" />
				</div>
			</div>
		</div>

		<div v-if="!state.started" class="flex gap">
			<Button @click="selectAll" class="bg-success" text="Select all" />
			<Button @click="removeAll" class="bg-danger" v-if="selected.length" text="Remove all" />
		</div>
	</div>

	<div class="overlay right bottom flex-col gap">
		<Button @click="clearMarkers" class="bg-warning" text="Clear markers" optText="(for performance, this won't erase your generated locations)" />
		<div class="settings" v-if="!state.started">
			<h4 class="center">Settings</h4>
			<div class="mtb-1">
				<Checkbox v-model:checked="settings.rejectUnofficial" label="Reject unofficial" />
			</div>
			<div class="mtb-1">
				<Checkbox v-model:checked="settings.adjustHeading" label="Adjust heading" />
				<div v-if="settings.adjustHeading" class="indent">
					<label class="flex wrap">
						Deviation <input type="range" v-model.number="settings.headingDeviation" min="0" max="50" /> (+/- {{ settings.headingDeviation }}°)
					</label>
					<small>0° will point directly towards the road.</small>
				</div>
			</div>
			<div class="mtb-1">
				<Checkbox v-model:checked="settings.adjustPitch" label="Adjust pitch" optText="0 by default. -90° for tarmac/+90° for sky" />
				<label v-if="settings.adjustPitch" class="flex wrap indent">
					Pitch deviation <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" /> ({{ settings.pitchDeviation }}°)
				</label>
			</div>
			<hr />
			<div class="flex space-between mtb-1">
				<label>From</label>
				<input type="month" v-model="settings.fromDate" min="2007-01" />
			</div>
			<div class="flex space-between mtb-1">
				<label>To</label>
				<input type="month" v-model="settings.toDate" />
			</div>
		</div>

		<Button v-if="selected.length" @click="handleClickStart" :class="state.started ? 'bg-danger' : 'bg-success'" :text="state.started ? 'Pause' : 'Start'" />

		<div class="flex gap" v-if="!state.started && hasResults">
			<Button @click="copyToClipboard" class="bg-success" text="Copy to clipboard" />
			<Button @click="exportToJsonFile" class="bg-success" text="Export as JSON" />
		</div>
	</div>
</template>

<script setup>
import { onMounted, ref, reactive, computed } from "vue";
import Button from "@/components/Elements/Button.vue";
import Checkbox from "@/components/Elements/Checkbox.vue";
import Spinner from "@/components/Elements/Spinner.vue";
import Logo from "@/components/Elements/Logo.vue";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import marker from "@/assets/images/marker-icon.png";
import markerShadow from "@/assets/images/marker-shadow.png";

import { getCountryCode } from "get-country-code";
import { SVreq } from "@/utils/SVreq";
import borders from "get-country-code/data";
import borders_coverage from "@/utils/borders_coverage.json";

let map;
let geojson;
let layerGroup;

const select = ref("Select a country");
const selected = ref([]);
const hasResults = computed(() => selected.value.some((country) => country.found?.length > 0));

const state = reactive({
	started: false,
	finished: false,
});

const settings = reactive({
	nbNeeded: 100,
	rejectUnofficial: true,
	adjustHeading: true,
	headingDeviation: 0,
	adjustPitch: false,
	pitchDeviation: 15,
	rejectByYear: false,
	fromDate: "2008-01",
	toDate: new Date().getFullYear() + "-" + (new Date().getMonth() + 1),
});

const myIcon = L.icon({
	iconUrl: marker,
	iconAnchor: [12, 41],
	shadowUrl: markerShadow,
	shadowAnchor: [12, 41],
});

onMounted(() => {
	map = L.map("map", {
		attributionControl: false,
		center: [0, 0],
		zoom: 2,
		zoomControl: false,
		worldCopyJump: true,
		layers: [L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { subdomains: ["mt0", "mt1", "mt2", "mt3"], type: "roadmap" })],
	});
	geojson = L.geoJson(borders_coverage, {
		style: style,
		onEachFeature: onEachFeature,
	}).addTo(map);
	layerGroup = L.layerGroup().addTo(map);

	// Fix hard reload issue
	const mapDiv = document.getElementById("map");
	const resizeObserver = new ResizeObserver(() => {
		map.invalidateSize();
	});
	resizeObserver.observe(mapDiv);
});

const switchLayer = (e) => {
	map.removeLayer(geojson);
	geojson = L.geoJson(e.target.checked ? borders : borders_coverage, {
		style: style,
		onEachFeature: onEachFeature,
	}).addTo(map);
};

const onEachFeature = (feature, layer) => {
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: selectCountry,
	});
};

const selectCountry = (e) => {
	if (state.started) return;
	const country = e.target;
	const index = selected.value.findIndex((x) => x.feature.properties.name === country.feature.properties.name);
	if (index == -1) {
		if (!country.nbNeeded) country.nbNeeded = 100;
		country.setStyle(highlighted());
		selected.value.push(country);
	} else {
		selected.value.splice(index, 1);
		geojson.resetStyle(e.target);
	}
};

const highlightFeature = (e) => {
	if (state.started) return;
	const layer = e.target;
	const index = selected.value.findIndex((x) => x.feature.properties.name === layer.feature.properties.name);
	if (index == -1) {
		layer.setStyle(highlighted());
	}
	select.value = layer.feature.properties.name;
};

const resetHighlight = (e) => {
	const layer = e.target;
	const index = selected.value.findIndex((x) => x.feature.properties.name === layer.feature.properties.name);
	if (index == -1) {
		layer.setStyle(removeHighlight());
	}
	select.value = "Select a country";
};

const selectAll = () => {
	selected.value = geojson.getLayers().map((e) => {
		e.nbNeeded = 100;
		return e;
	});
	geojson.setStyle(highlighted);
};

const removeAll = () => {
	selected.value.length = 0;
	geojson.setStyle(style);
};

const style = () => {
	return {
		opacity: 0,
		fillOpacity: 0,
	};
};

const highlighted = () => {
	return {
		fillColor: getRandomColor(),
		fillOpacity: 0.5,
	};
};

const removeHighlight = () => {
	return { fillOpacity: 0 };
};

const clearMarkers = () => {
	layerGroup.clearLayers();
};

const getRandomColor = () => {
	const red = Math.floor(((1 + Math.random()) * 256) / 2);
	const green = Math.floor(((1 + Math.random()) * 256) / 2);
	const blue = Math.floor(((1 + Math.random()) * 256) / 2);
	return "rgb(" + red + ", " + green + ", " + blue + ")";
};

// Process
const handleClickStart = () => {
	state.started = !state.started;
	start();
};
document.onkeydown = () => {
	if (window.event.keyCode == "13" || window.event.keyCode == "32") {
		handleClickStart();
	}
};

const start = async () => {
	for (let country of selected.value) {
		if (!country.found) country.found = [];
		await generate(country);
	}
	state.started = false;
	state.finished = true;
};

Array.prototype.chunk = function (n) {
	if (!this.length) {
		return [];
	}
	return [this.slice(0, n)].concat(this.slice(n).chunk(n));
};

const generate = async (country) => {
	return new Promise(async (resolve) => {
		while (country.found.length < country.nbNeeded) {
			if (!state.started) return;
			country.isProcessing = true;
			const randomCoords = [];
			while (randomCoords.length < country.nbNeeded) {
				const point = randomPointInPoly(country);
				if (country.feature.properties.name == getCountryCode({ lat: point.lat, lng: point.lng }).name) {
					randomCoords.push(point);
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
									`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${res.value.lat},${res.value.lng}&heading=${res.value.heading}&pitch=${res.value.pitch}`,
									"_blank"
								);
							})
							.addTo(layerGroup);
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

// Export
const copyToClipboard = () => {
	const data = [];
	selected.value.map((country) => data.push(...country.found));
	navigator.clipboard.writeText(JSON.stringify({ customCoordinates: data })).catch((err) => {
		console.log("Something went wrong", err);
	});
};
const exportToJsonFile = () => {
	const data = [];
	selected.value.map((country) => data.push(...country.found));
	const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ customCoordinates: data }));
	const fileName = `Generated Map (${data.length} locations).json`;
	const linkElement = document.createElement("a");
	linkElement.setAttribute("href", dataUri);
	linkElement.setAttribute("download", fileName);
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
.switch-layer,
.select,
.selected,
.settings {
	padding: 0.5rem;
	color: #ffffff;
	background: rgba(0, 0, 0, 0.7);
	box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
	border-radius: 5px;
}
.selected {
	max-height: 280px;
	overflow: auto;
}
.settings {
	min-width: 340px;
}
</style>
