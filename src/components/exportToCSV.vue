<template>
	<Button @click="exportToCSV()" class="bordered-success" text="CSV" title="Export as CSV" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const props = defineProps({
	selection: Array,
});

const exportToCSV = () => {
	let csv = "";
	let nbLocs = 0;
	props.selection.forEach((country) =>
		country.found.forEach((coords) => {
			csv += coords.lat + "," + coords.lng + ",\n";
			nbLocs++;
		})
	);
	const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
	const fileName = `Generated map (${nbLocs} location${nbLocs > 1 ? "s" : ""}).csv`;
	const linkElement = document.createElement("a");
	linkElement.href = dataUri;
	linkElement.download = fileName;
	linkElement.click();
};
</script>
