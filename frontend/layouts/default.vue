<template>
  <NuxtLayout v-if="requiresAppLayout" name="app">
    <slot />
  </NuxtLayout>
  <slot v-else />
</template>

<script setup lang="ts">
const route = useRoute();
const requiresAppLayout = computed(
  () => route.path !== "/" && route.path !== "/auth/login",
);
</script>
