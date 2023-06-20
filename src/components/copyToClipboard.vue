<template>
	<Button @click="copyToClipboard()" class="bordered-success" :text="text" title="Copy to clipboard" />
</template>

<script setup>
import { ref } from "vue";
import Button from "./Elements/Button.vue";

const props = defineProps({
	selection: Array,
});

const text = ref("Clipboard");

const copyToClipboard = () => {
	const data = [];
	props.selection.map((country) => data.push(...country.found));
	navigator.clipboard
		.writeText(JSON.stringify(data))
		.then(() => {
			text.value = "Copied";
			setTimeout(() => {
				text.value = "Clipboard";
			}, 1000);
		})
		.catch((err) => {
			console.log("Something went wrong", err);
		});
};
</script>
