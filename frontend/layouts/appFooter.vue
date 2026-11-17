<template>
  <footer class="app-footer">
    <span
      >&copy; Instituto de Investigación, Interacción y Posgrado de Psicología
      {{ currentYear }}</span
    >
  </footer>
</template>
<script setup>
const currentYear = new Date().getUTCFullYear();
</script>
<style scoped lang="scss">
.app-footer {
  width: 100%;
  font-size: 0.8rem;
  text-align: right;
  padding: 8px 16px;
  color: rgb(var(--v-theme-on-surface));
  background-color: rgb(var(--v-theme-surface));
}
</style>
