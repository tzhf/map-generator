<script setup lang="ts">
const checked = defineModel<boolean>()
</script>

<template>
  <label class="flex items-center gap-2 cursor-pointer hover:brightness-120">
    <input type="checkbox" v-model="checked" class="hidden peer" />
    <span
      class="w-4 h-4 bg-black/50 border border-primary rounded-sm peer-checked:[&>svg]:scale-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="scale-0 transition-transform text-primary"
      >
        <path stroke="currentColor" stroke-width="3" d="M1.73 12.91l6.37 6.37L22.79 4.59" />
      </svg>
    </span>
    <slot />
  </label>
</template>
