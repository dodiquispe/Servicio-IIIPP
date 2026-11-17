<template>
  <div class="public-shell">
    <header class="public-header">
      <NuxtLink to="/" aria-label="Inicio de Servicios IIIPP">
        <img src="~/assets/img/logo iiipp.png" alt="Servicios IIIPP" />
      </NuxtLink>
      <NuxtLink class="login-link" to="/auth/login">
        <v-icon start>mdi-login</v-icon>
      </NuxtLink>
    </header>

    <main class="public-content">
      <slot />
    </main>

    <footer class="public-footer">
      <span>Instituto de Investigación, Interacción y Posgrado</span>
      <span>Servicios IIIPP</span>
    </footer>
  </div>
</template>

<style scoped>
.public-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f8fa;
}

.public-header {
  /*   background-image: url("~/assets/img/IIIPP.jpg") !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  background-position: center center !important;
  min-height: 100px !important;
  height: 160px !important;
  padding: 0 !important; */
  min-height: 170px;
  padding: 25px clamp(45px, 6vw, 70px);
  display: flex;
  align-items: normal;
  justify-content: space-between;
  gap: 20px;
  background:
    linear-gradient(90deg, rgb(5 67 95 / 72%), rgb(5 67 95 / 16%)),
    url("~/assets/img/IIIPP.jpg") center 28% / cover;
}

.public-header img {
  display: block;
  width: 76px;
  height: 76px;
  object-fit: contain;
  border-radius: 8px;
}

.login-link {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}

.public-content {
  flex: 1;
  width: 100%;
  padding: 32px 16px 48px;
}

.public-footer {
  min-height: 64px;
  padding: 16px clamp(20px, 6vw, 72px);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 20px;
  color: #fff;
  background: #075578;
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .public-header {
    min-height: 120px;
  }

  .public-header img {
    width: 60px;
    height: 60px;
  }

  .public-footer {
    flex-direction: column;
  }
}
</style>
