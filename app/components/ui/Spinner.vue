<script setup lang="ts">
// Vue hace fallthrough de "class" automáticamente al root, así que
// <Spinner class="h-4 w-4 text-primary" /> funciona sin declarar props.
</script>

<template>
  <svg
    class="animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
</template>