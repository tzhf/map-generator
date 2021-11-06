<template>
	<Button @click="copyToClipboard()" class="bordered-success" text="Clipboard" title="Copy to clipboard" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const props = defineProps({
	selection: Array,
});

const copyToClipboard = () => {
	const data = [];
	props.selection.map((country) => data.push(...country.found));
	navigator.clipboard.writeText(JSON.stringify({ customCoordinates: data })).catch((err) => {});
};
</script>
