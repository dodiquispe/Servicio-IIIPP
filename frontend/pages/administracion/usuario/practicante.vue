<template>
  <v-progress-linear indeterminate color="primary" />
</template>

<script setup lang="ts">
await navigateTo({
  path: "/administracion/responsable",
  query: { vista: "practicantes" },
});
</script>