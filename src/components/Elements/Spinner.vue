<template>
	<img alt="geoicon" :style="cssVars" src="@/assets/geoicon.png" />
</template>
<script>
export default {
	props: {
		width: {
			type: String,
			default: "1.5rem",
		},
	},

	computed: {
		cssVars() {
			return {
				"--width": this.width,
			};
		},
	},
};
</script>
<style scoped>
img {
	width: var(--width);
	animation: spin 10s infinite ease-in-out;
}
@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	50% {
		transform: rotate(-360deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
