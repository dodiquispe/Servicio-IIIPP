<template>
  <v-app>
    <v-card class="pagina-reservas">
      <v-toolbar class="nav-menu">
        <v-avatar rounded="0" class="logo-container ml-4" size="63">
          <v-img
            src="~/assets/img/logo iiipp.png"
            alt="Servicios IIIPP"
            class="logo-iiipp"
            cover
          />
        </v-avatar>

        <v-spacer />

        <v-btn
          icon="mdi-login"
          aria-label="Iniciar sesión"
          class="login-btn mr-4"
          @click="navigateTo('/auth/login')"
        />
      </v-toolbar>

      <main class="contenido">
        <slot />
      </main>
    </v-card>
  </v-app>
</template>

<script setup lang="ts"></script>

<style scoped>
.pagina-reservas {
  min-height: 100vh;
}

.nav-menu {
  background-image: url("~/assets/img/IIIPP.jpg") !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  background-position: center center !important;
  min-height: 100px !important;
  height: 220px !important;
  padding: 0 !important;
}

.logo-container {
  overflow: hidden;
}

.logo-iiipp :deep(.v-img__img) {
  transform: scaleX(1.4);
}

.login-btn {
  color: #fff !important;
  background-color: rgb(0 86 120 / 78%);
}

.login-btn :deep(.v-icon) {
  color: #fff !important;
}

.contenido {
  padding: 24px;
}

@media (max-width: 600px) {
  .nav-menu {
    background-position: center center !important;
  }

  .contenido {
    padding: 16px;
  }
}
</style>
