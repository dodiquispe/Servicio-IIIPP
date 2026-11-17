<template>
  <v-toolbar height="70" class="nav-menu">
    <v-app-bar-nav-icon icon="mdi-menu" @click="openCloseMenu"></v-app-bar-nav-icon>
    <v-spacer></v-spacer>
    <!-- Botones -->
    <v-btn icon @click="cambiarPantalla">
      <v-tooltip activator="parent" location="bottom"> Pantalla completa </v-tooltip>
      <v-icon :icon="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" />
    </v-btn>
    <v-btn icon @click="reloadPage">
      <v-tooltip activator="parent" location="bottom"> Recargar esta pagina </v-tooltip>
      <v-icon icon="mdi-reload" />
    </v-btn>
    <v-menu v-if="esSecretaria" location="bottom end">
      <template #activator="{ props }">
        <v-btn v-bind="props" icon aria-label="Notificaciones de pagos">
          <v-badge
            v-if="pagosPendientes.length"
            :content="pagosPendientes.length"
            color="error"
            floating
          >
            <v-icon icon="mdi-bell" />
          </v-badge>
          <v-icon v-else icon="mdi-bell" />
        </v-btn>
      </template>
      <v-list min-width="300">
        <v-list-subheader>Verificaciones de pago</v-list-subheader>
        <v-list-item
          v-if="pagosPendientes.length"
          :title="`${pagosPendientes.length} pago(s) pendiente(s)`"
          subtitle="Hay comprobantes que requieren revisión"
          to="/secretaria/pagos"
        />
        <v-list-item v-else title="No hay pagos pendientes de verificar" />
      </v-list>
    </v-menu>
    <v-btn v-else icon aria-label="Notificaciones">
      <v-icon icon="mdi-bell" />
    </v-btn>
    <AppToggleTheme />
    <!-- Menu del avatar -->
    <v-menu open-on-click location="center" width="400" open-delay="100" close-delay="700">
      <template v-slot:activator="{ props }">
        <v-avatar   color="primary" v-bind="props" size="x-large">
          <img v-if="img_url" :src="img_url" style="border-radius: 50%; width: 100%; height: 100%;" >
          <span v-else class="text-h5">{{ inicial }}</span>
        </v-avatar>
      </template>
      <v-card>
        <v-container grid-list-md class="py-0">
          <v-row class="py-2" no-gutters align="center" justify="center">
            <v-col class="pr-2" cols="auto">
              <v-avatar  color="primary" size="50">
                <img v-if="img_url" :src="img_url" style="border-radius: 100%; width: 100%; height: 100%;" />
                <span v-else class="text-h5">{{ inicial }}</span>
              </v-avatar>
            </v-col>
            <v-col>
              <h3>{{ nombreCompleto }}</h3>
            </v-col>
          </v-row>
          <v-row no-gutters>
            <v-col>
              <v-icon icon="mdi-email" color="primary" size="small" />
              {{ user.email || "Sin correo" }}<br />
              <v-icon icon="mdi-home" color="primary" size="small" /> {{ unidad }}<br />
              <v-icon icon="mdi-email" color="primary" size="small" /> {{ cargo }}<br />
              <span class="" v-for="rol in user.roles" :key="rol.id">
                <v-icon icon="mdi-badge-account-horizontal-outline" color="primary" size="small" />
                {{ rol.descripcion }} <br
              /></span>
            </v-col>
          </v-row>

          <!-- <v-icon>location_city</v-icon>{{ user.entidad }} -->
        </v-container>
        <v-divider></v-divider>
        <v-list>
          <!-- $router.push('account') -->
          <v-list-item @click="navigateTo('/user/cuenta')">
            <v-list-item-title>
              <v-icon icon="mdi-account" color="primary" /> Mi cuenta
              <!-- {{ $t("app.account") }} -->
            </v-list-item-title>
          </v-list-item>
          <!-- <v-list-tile @click="logout"> -->
          <v-list-item @click="logout">
            <v-list-item-title>
              <v-icon icon="mdi-power" color="primary" />
              <!-- {{ $t("app.logOut") }} -->Cerrar sesión
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </v-toolbar>
</template>

<script setup lang="ts">
import {
  getCurrentUserServiceAssignments,
  sessionHasRole,
  useUserSession,
} from "~/utils/session";
import type { ServiceAssignment } from "~/utils/session";
import { $querys } from "~/utils/querys.graphql";

const session = useUserSession();
const { $service } = useNuxtApp();
const esSecretaria = computed(() =>
  sessionHasRole(session.roles.value, "secretaria"),
);
const pagosPendientes = ref<Array<{ id: string; fecha: string; hora_inicio: string }>>([]);
let intervaloNotificaciones: ReturnType<typeof setInterval> | undefined;
const assignments = ref<ServiceAssignment[]>([]);
const data_user = computed(() => session.usuario.value ?? {});
const user = computed(() => ({
  email:
    data_user.value.correo ??
    data_user.value.persona?.correo_personal ??
    "",
  roles: session.roles.value ?? [],
}));
const unidad = "IIIPP – Carrera de Psicología, UMSA";
const cargo = computed(() => {
  const role = session.roles.value?.find((item) => item.id_estado === 1)?.descripcion ?? "";
  if (!/responsable|practicante/i.test(role)) return role || "—";
  const assignment = getCurrentUserServiceAssignments(
    assignments.value,
    session.usuario.value?.id ?? "",
    role,
  )[0];
  return assignment ? `${role} de ${assignment.servicio.servicio}` : role;
});
onMounted(async () => {
  if (esSecretaria.value) {
    void cargarPagosPendientes();
    intervaloNotificaciones = setInterval(
      () => void cargarPagosPendientes(),
      30_000,
    );
  }
  if (!sessionHasRole(session.roles.value, "responsable") && !sessionHasRole(session.roles.value, "practicante")) return;
  try {
    const result = await $service.graphql<{ misServicios: ServiceAssignment[] }>({
      query: $querys.staff.misServicios,
    });
    assignments.value = result.misServicios;
  } catch {
    assignments.value = [];
  }
});
onBeforeUnmount(() => {
  if (intervaloNotificaciones) clearInterval(intervaloNotificaciones);
});

async function cargarPagosPendientes() {
  try {
    const result = await $service.graphql<{
      pagosPendientesVerificacion: Array<{ id: string; fecha: string; hora_inicio: string }>;
    }>({ query: $querys.staff.pagosPendientesVerificacion });
    pagosPendientes.value = result.pagosPendientesVerificacion;
  } catch {
    // A temporary notification failure should not disrupt the toolbar.
  }
}
const nombreCompleto = computed(() => {
  const persona = data_user.value.persona;
  if (!persona) return data_user.value.nombre_usuario ?? "Usuario";
  return [
    persona.nombres,
    persona.primer_apellido,
    persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(" ");
});
const inicial = computed(() => {
  const person = data_user.value.persona;
  return (
    person?.primer_apellido?.trim().charAt(0) ||
    person?.segundo_apellido?.trim().charAt(0) ||
    person?.nombres?.trim().charAt(0) ||
    "U"
  ).toLocaleUpperCase();
});
const img_url = computed(() => data_user.value.persona?.foto);

const logout = async () => {
  session.clear();
  await navigateTo("/auth/login");
};

var fullscreen = ref(false);

const cambiarPantalla = () => {
  fullscreen.value = !fullscreen.value;
  document.querySelector("body").classList.toggle("fullscreen");
  if (
    !document.fullscreenElement && // alternative standard method
    !document.mozFullScreenElement &&
    !document.webkitFullscreenElement &&
    !document.msFullscreenElement
  ) {
    // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(window.Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
};
// Definir métodos y funciones
// Metodo para reacargar la pagina
const reloadPage = () => {
  reloadNuxtApp();
};
// Metodo para abrir el sideNav (menu)
const sideNavMenu = useSideNavStore();
const openCloseMenu = () => {
  sideNavMenu.$state.active = true;
};
</script>
<style lang="scss">
.nav-menu {
  width: 100%;
  color: rgb(var(--v-theme-on-surface));
  background-color: rgb(var(--v-theme-surface)) !important;
}

.nav-menu .v-icon,
.nav-menu .v-btn {
  color: rgb(var(--v-theme-on-surface)) !important;
}
</style>
