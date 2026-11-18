<template>
  <div class="fullscreen-container">
    <!-- Botón para cambiar el tema -->
    <div class="header-login">
      <AppToggleTheme />
    </div>

    <!-- Formulario centrado -->
    <div class="centered-content">
      <v-card class="contenedor-login" elevation="8">
        <v-form ref="form" @submit.prevent="login">
          <!-- Logo -->
          <div class="text-center logo-container">
            <v-img
              src="~/assets/img/logo iiipp.png"
              alt="Servicios IIIPP"
              width="70"
              height="70"
              class="mx-auto"
              contain
            />
          </div>

          <!-- Título -->
          <div class="text-center titulo">
            <h1 class="text-primary">Servicios IIIPP</h1>
            <p class="descripcion">
              Bienvenido al sistema de reservas y seguimiento de servicios.
            </p>
          </div>

          <v-divider :thickness="3" color="primary" class="my-5" />

          <!-- Usuario -->
          <v-text-field
            v-model="form_login.nombre_usuario"
            label="Nombre de usuario"
            placeholder="Ingresa tu usuario"
            prepend-inner-icon="mdi-account-circle"
            variant="outlined"
            clearable
            :rules="userRules"
            required
            hide-details="auto"
            class="campo-login"
          />

          <v-divider class="my-4" />

          <!-- Contraseña -->
          <v-text-field
            v-model="form_login.password"
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="show_pass ? 'mdi-eye-off' : 'mdi-eye'"
            :type="show_pass ? 'text' : 'password'"
            variant="outlined"
            :rules="passRules"
            required
            hide-details="auto"
            class="campo-login"
            @click:append-inner="show_pass = !show_pass"
          />

          <!-- Ingresar -->
          <v-btn
            type="submit"
            color="primary"
            block
            size="large"
            class="mt-6"
          >
            <v-icon start>mdi-login</v-icon>
            INGRESAR
          </v-btn>

          <v-alert
            v-if="loginError"
            type="error"
            variant="tonal"
            class="mt-4"
          >
            {{ loginError }}
          </v-alert>

          <!-- Contactos -->
          <v-btn
            color="primary"
            variant="text"
            block
            class="mt-2"
            to="/contacto"
          >
            Contactos
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            block
            class="mt-1"
            to="/"
          >
            Ir al inicio de reservas
          </v-btn>
        </v-form>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { roleHomePath, sessionHasRole, useUserSession } from "~/utils/session";
import type { SessionData } from "~/utils/session";
import { $querys } from "~/utils/querys.graphql";

interface FormType {
  nombre_usuario: string;
  password: string;
}

const form_login = reactive<FormType>({
  nombre_usuario: "",
  password: "",
});

const form = ref<{
  validate: () => Promise<{ valid: boolean }>;
} | null>(null);

const show_pass = ref(false);
const loginError = ref("");
const config = useRuntimeConfig();
const sessionStore = useUserSession();
const userRules = [(v: string) => !!v || "El nombre de usuario es requerido"];

const passRules = [(v: string) => !!v || "La contraseña es requerida"];

const login = async () => {
  const result = await form.value?.validate();

  if (!result?.valid) {
    return;
  }

  loginError.value = "";
  try {
    const response = await $fetch<{
      data?: {
        loginUsuario?: SessionData;
      };
      errors?: Array<{ message: string }>;
    }>(config.public.apiUrl, {
      method: "POST",
      body: {
        query: $querys.publicas.login,
        variables: {
          nombre_usuario: form_login.nombre_usuario.trim(),
          contrasena: form_login.password,
        },
      },
    });

    if (response.errors?.length) {
      throw new Error(response.errors[0].message);
    }
    const session = response.data?.loginUsuario;
    if (!session) {
      throw new Error("El servidor no devolvió los datos de la sesión");
    }
    sessionStore.save(session);
    const redirect = useRoute().query.redirect;
    const professionalRole = sessionHasRole(session.roles, "responsable") || sessionHasRole(session.roles, "practicante");
    await navigateTo(
      !professionalRole && typeof redirect === "string" &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//")
        ? redirect
        : roleHomePath(session.roles.value),
    );
  } catch (error) {
    loginError.value =
      error instanceof Error
        ? error.message
        : "No se pudo iniciar sesión. Verifique la conexión con el servidor.";
  }
};
</script>

<style lang="scss" scoped>
.fullscreen-container {
  position: fixed;
  inset: 0;
  min-height: 100vh;
  overflow-y: auto;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 24px 16px;

  background-image:
    linear-gradient(
      to bottom,
      rgba(var(--v-theme-surface), 0.78),
      rgba(var(--v-theme-surface), 0.78)
    ),
    url("~/assets/img/IIIPP.jpg");

  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

.header-login {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
}

.centered-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.contenedor-login {
  width: 100%;
  max-width: 440px;
  padding: 32px 28px;
  border-radius: 12px;

  background-image: linear-gradient(
    to bottom,
    rgba(var(--v-theme-primary), 0.12),
    rgba(var(--v-theme-surface), 0.92)
  );
}

.logo-container {
  margin-bottom: 12px;
}

.titulo h1 {
  font-size: 1.8rem;
  font-weight: 700;
}

.descripcion {
  margin-top: 10px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}

.campo-login {
  width: 100%;
}

@media (max-width: 480px) {
  .fullscreen-container {
    padding: 72px 16px 24px;
  }

  .contenedor-login {
    padding: 24px 18px;
  }

  .titulo h1 {
    font-size: 1.5rem;
  }

  .descripcion {
    font-size: 0.85rem;
  }
}
</style>
