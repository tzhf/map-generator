<template>
	<Button @click="exportToJson()" class="bordered-success" text="JSON" title="Export as JSON" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const props = defineProps({
	selection: Array,
});

const exportToJson = () => {
	const data = [];
	props.selection.map((country) => data.push(...country.found));
	const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ customCoordinates: data }));
	const fileName = `Generated map (${data.length} location${data.length > 1 ? "s" : ""}).json`;
	const linkElement = document.createElement("a");
	linkElement.href = dataUri;
	linkElement.download = fileName;
	linkElement.click();
};
</script>
