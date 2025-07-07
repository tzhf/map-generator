<template>
  <div class="group">
    <span class="cursor-help text-gray-300">🛈</span>
    <div
      class="absolute z-10 hidden group-hover:block w-72 bg-black/70 rounded-sm p-2 text-xs shadow-md"
      style="top: 100%; left: 0"
    >
      <slot />
    </div>
  </div>
</template>
