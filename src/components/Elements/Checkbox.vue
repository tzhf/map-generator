<template>
	<label class="checkbox">
		<span class="checkbox__input">
			<input type="checkbox" name="checkbox" :checked="checked" @change="$emit('update:checked', $event.target.checked)" />
			<span class="checkbox__control">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<path fill="none" stroke="currentColor" stroke-width="3" d="M1.73 12.91l6.37 6.37L22.79 4.59" />
				</svg>
			</span>
		</span>
		<span class="radio__label">
			{{ label }}
			<small v-if="optText"><br />{{ optText }}</small>
		</span>
	</label>
</template>

<script setup>
defineProps({
	label: String,
	optText: String,
	checked: Boolean,
});
</script>

<style>
.checkbox {
	display: grid;
	grid-template-columns: -webkit-min-content auto;
	grid-template-columns: min-content auto;
	grid-gap: 0.3em;
	color: var(--success);
	align-items: center;
}
.checkbox:hover {
	filter: brightness(120%);
}
.radio__label {
	color: #fff;
}
.checkbox__control {
	display: inline-grid;
	width: 1em;
	height: 1em;
	border-radius: 0.25em;
	border: 0.1em solid currentColor;
}
.checkbox__control svg {
	transition: transform 0.1s ease-in 25ms;
	transform: scale(0);
	transform-origin: bottom left;
}

.checkbox__input {
	display: grid;
	grid-template-areas: "checkbox";
	align-items: center;
}
.checkbox__input > * {
	grid-area: checkbox;
	cursor: pointer;
}
.checkbox__input input {
	opacity: 0;
	width: 1em;
	height: 1em;
}
.checkbox__input input:checked + .checkbox__control svg {
	transform: scale(1);
	color: #16f1be;
}
</style>
