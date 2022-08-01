<template>
  <a class="btn">
    {{ text }}
    <div v-if="optText">
      <small>{{ optText }}</small>
    </div>
  </a>
</template>

<script setup>
defineProps({
  text: String,
  optText: String,
});
</script>

<style>
.btn {
  width: 100%;
  color: #000;
  display: block;
  padding: 0.8rem;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
}
.btn:hover {
  filter: brightness(105%);
}
.btn:active {
  filter: brightness(110%);
}
.disabled {
  pointer-events: none;
  cursor: default;
  opacity: 0.6;
}
</style>
