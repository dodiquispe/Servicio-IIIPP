<template>
  <v-layout class="app-layout">
    <AppSideNav />
    <v-main class="app-main">
      <AppNavbar />
      <main class="app-content">
        <slot />
      </main>
      <AppFooter />
    </v-main>
  </v-layout>
  <AppMessage />
  <AppAlert />
  <AppConfirm />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import AppFooter from "./appFooter.vue";
import AppNavbar from "./appNavbar.vue";
import AppSideNav from "./appSideNav.vue";
import { useUserSession } from "~/utils/session";

const session = useUserSession();
let activityCheck: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  activityCheck = setInterval(() => {
    if (!session.isAuthenticatedNow()) {
      session.clear();
      void navigateTo("/auth/login");
    }
  }, 15_000);
});

onUnmounted(() => {
  if (activityCheck) clearInterval(activityCheck);
});
</script>

<style lang="scss">
.app-layout {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.app-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.app-content {
  flex: 1;
  min-width: 0;
  padding: 24px;
  background-color: rgb(var(--v-theme-background));
}
</style>
