<template>
  <v-container class="contact-page" max-width="1000">
    <h1 class="text-h4 mb-2">Contacto</h1>
    <p class="text-body-1 mb-6">Instituto de Investigación, Interacción y Postgrado de Psicología - UMSA</p>
    <v-row>
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4 h-100">
          <img class="contact-image" src="https://psicologia.umsa.bo/documents/20142/0/01.png/a334a2e6-424d-8917-3279-95e14d8f8a81?t=1548800490879" alt="Teléfonos de IIIPP">
          <h2 class="text-h6 mt-4">Teléfonos de IIIPP</h2>
          <div>+591 2612515</div><div>+591 2619205</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4 h-100">
          <img class="contact-image" src="https://psicologia.umsa.bo/documents/20142/0/02.png/79234ebd-62ba-5922-d958-a68e878baf1d?t=1548800514228" alt="Dirección de IIIPP">
          <h2 class="text-h6 mt-4">Dirección de IIIPP</h2>
          <div>Zona Sopocachi, Calle Belisario Salinas N° 516</div>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card variant="outlined" class="pa-4">
          <img class="contact-image" src="https://psicologia.umsa.bo/documents/20142/0/03.png/f5cc3a62-8263-e1f6-8721-1d04213a5989?t=1548800542730" alt="Facebook de IIIPP">
          <h2 class="text-h6 mt-4">Facebook</h2>
          <a href="https://www.facebook.com/iiippsicologiaumsa" target="_blank" rel="noopener noreferrer">Instituto de Investigación, Interacción y Postgrado de Psicología-UMSA IIIPP</a>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });
</script>

<style scoped>
.contact-image {
  display: block;
  width: 100%;
  max-height: 180px;
  object-fit: contain;
}
</style>
