<template>
  <v-container class="account-page" max-width="900">
    <h1 class="text-h4 mb-5">Mi cuenta</h1>
    <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-4">{{ message }}</v-alert>
    <v-card variant="outlined" class="mb-5">
      <v-card-title>Datos personales</v-card-title><v-divider />
      <v-card-text>
        <v-list lines="two">
          <v-list-item title="Nombres completos" :subtitle="fullName || 'No registrado'" />
          <v-list-item title="Carnet de identidad" :subtitle="user?.persona?.nro_documento || 'No registrado'" />
          <v-list-item title="Usuario" :subtitle="user?.nombre_usuario || 'No registrado'" />
          <v-list-item title="Cargo" :subtitle="roles.join(', ') || 'No registrado'" />
        </v-list>
        <v-text-field v-model="correo" label="Correo electrónico" type="email" />
        <v-text-field v-model="movil" label="Celular" />
        <v-btn color="primary" :loading="saving" @click="saveProfile">Guardar datos</v-btn>
      </v-card-text>
    </v-card>
    <v-card variant="outlined">
      <v-card-title>Cambiar contraseña</v-card-title><v-divider />
      <v-card-text>
        <v-text-field v-model="currentPassword" label="Contraseña actual" type="password" autocomplete="current-password" />
        <v-text-field v-model="newPassword" label="Nueva contraseña (mínimo 8 caracteres)" type="password" autocomplete="new-password" />
        <v-text-field v-model="confirmPassword" label="Confirmar nueva contraseña" type="password" autocomplete="new-password" />
        <v-btn color="primary" :loading="changingPassword" :disabled="!newPassword || newPassword !== confirmPassword" @click="changePassword">Cambiar contraseña</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { useUserSession } from "~/utils/session";

const session = useUserSession();
const { $service } = useNuxtApp();
const user = computed(() => session.usuario.value);
const fullName = computed(() => [user.value?.persona?.nombres, user.value?.persona?.primer_apellido, user.value?.persona?.segundo_apellido].filter(Boolean).join(" "));
const roles = computed(() => (session.roles.value ?? []).filter((role) => role.id_estado === 1).map((role) => role.descripcion));
const correo = ref(user.value?.correo || user.value?.persona?.correo_personal || "");
const movil = ref(user.value?.persona?.movil || "");
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const saving = ref(false);
const changingPassword = ref(false);
const message = ref("");
const messageType = ref<"success" | "error">("success");

async function saveProfile(): Promise<void> {
  saving.value = true; message.value = "";
  try {
    await $service.graphql({ query: `mutation($correo: String, $movil: String) { actualizarMiPerfil(correo: $correo, movil: $movil) { id correo persona { correo_personal movil } } }`, variables: { correo: correo.value.trim() || null, movil: movil.value.trim() || null } });
    if (user.value) {
      user.value.correo = correo.value.trim() || null;
      if (user.value.persona) { user.value.persona.correo_personal = correo.value.trim() || null; user.value.persona.movil = movil.value.trim() || null; }
    }
    messageType.value = "success"; message.value = "Tus datos se guardaron correctamente.";
  } catch (error) { messageType.value = "error"; message.value = error instanceof Error ? error.message : "No se pudieron guardar los datos."; }
  finally { saving.value = false; }
}

async function changePassword(): Promise<void> {
  if (newPassword.value !== confirmPassword.value) return;
  changingPassword.value = true; message.value = "";
  try {
    await $service.graphql({ query: `mutation($actual: String!, $nueva: String!) { cambiarMiContrasena(actual: $actual, nueva: $nueva) }`, variables: { actual: currentPassword.value, nueva: newPassword.value } });
    currentPassword.value = ""; newPassword.value = ""; confirmPassword.value = "";
    messageType.value = "success"; message.value = "La contraseña se cambió correctamente.";
  } catch (error) { messageType.value = "error"; message.value = error instanceof Error ? error.message : "No se pudo cambiar la contraseña."; }
  finally { changingPassword.value = false; }
}
</script>
