<template>
  <v-navigation-drawer
    v-model="website.$state.active"
    class="contenedor-menu"
    expand-on-hover
    rail-width="60"
    width="300"
    color="surface"
    disable-route-watcher
    mobile-breakpoint="md"
    :rail="navigation.rail"
  >
    <v-list height="70">
      <v-list-item class="header-side-nav">
        <template #prepend>
          <v-avatar rounded="0" size="50">
            <img
              src="~/assets/img/logo iiipp.png"
              alt="servicio IIIPP"
              height="50"
              width="50"
            />
          </v-avatar>
        </template>
        <template #title>
          <div class="titulo-sistema">Servicios IIIPP</div>
        </template>
        <template #subtitle>
          <div class="descripcion-sistema">Seguimiento casos atendidos</div>
        </template>
        <template #append v-if="!navigation.rail">
          <v-btn class="btn-ocultar" icon @click="openCloseMenu">
            <v-tooltip activator="parent" location="bottom" z-index="10000">
              Ocultar
            </v-tooltip>
            <v-icon icon="mdi-arrow-left-drop-circle-outline" />
          </v-btn>
        </template>
      </v-list-item>
    </v-list>
    <v-divider></v-divider>
    <v-list density="compact" nav max-height="100vh">
      <v-list-item
        v-if="!menu.length"
        title="No hay recursos asignados a este usuario"
      />
      <AppItemMenu
        v-for="(item, index) in menu"
        :key="index"
        :item_menu="item"
      />
    </v-list>
    <template v-slot:append>
      <div class="footer-sidenav">
        <span>
          &copy; Instituto de Investigación, Interacción y Posgrado de
          Psicología
          {{ currentYear }}
        </span>
      </div>
    </template>
  </v-navigation-drawer>
</template>
<script setup lang="ts">
// Declaracion de importaciones como bibliotecas y componentes
import { useDisplay } from "vuetify";
import { useUserSession } from "~/utils/session";

interface MenuItem {
  id: string;
  id_recurso_padre?: string | null;
  title: string;
  icon: string;
  path?: string | null;
  sub_menu: MenuItem[];
}

function buildMenu(resources: Omit<MenuItem, "sub_menu">[] | null): MenuItem[] {
  if (!Array.isArray(resources)) return [];
  const items: MenuItem[] = resources.map((resource) => ({
    ...resource,
    sub_menu: [] as MenuItem[],
  }));
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const roots: MenuItem[] = [];

  for (const item of items) {
    const parent = item.id_recurso_padre
      ? itemsById.get(item.id_recurso_padre)
      : undefined;
    if (parent) parent.sub_menu.push(item);
    else roots.push(item);
  }
  return roots;
}

// Declarar variables y datos
const { name } = useDisplay();
const isdesktop = computed(() => {
  switch (name.value) {
    case "xs":
      return false;
    case "sm":
      return false;
    default:
      return true;
  }
});
const currentYear = new Date().getUTCFullYear();
var navigation = reactive({
  drawer: false,
  rail: isdesktop.value ? true : false,
});
const {
  public: { nombreSistema },
} = useRuntimeConfig();
const {
  public: { descripcionSistema },
} = useRuntimeConfig();
// Los recursos llegan desde la respuesta de inicio de sesión.
const session = useUserSession();
const menu = computed(() => buildMenu(session.recursos.value));
const website = useSideNavStore();
// Definir métodos y funciones
// Vigilamos el tamano de pantalla para ajustar el menu a rail o no
watch(isdesktop, (newValue) => {
  navigation.rail = newValue;
});
// Metodo para cerrar o abrir el menu
const sideNavMenu = useSideNavStore();
const openCloseMenu = () => {
  sideNavMenu.$state.active = false;
};
</script>
<style lang="scss" scoped>
.header-side-nav {
  padding: 0rem 0.7rem 0rem 0.3rem !important;
  .titulo-sistema {
    font-weight: 700;
  }
  .descripcion-sistema {
    font-size: 0.8rem;
    text-align: justify;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* Número máximo de líneas a mostrar */
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn-ocultar {
    font-size: 0.9rem;
    height: 10px;
    width: 10px;
  }
}
.footer-sidenav {
  font-size: 0.65rem;
  opacity: 0.6;
  text-align: center;
}
nav {
  border-top-right-radius: 20px;
  border-bottom-right-radius: 15px;
  /*box-shadow: 0 0 10px 1px rgb(25, 97, 119) !important;*/
}
.contenedor-menu {
  z-index: 10000 !important;
  background-color: rgb(var(--v-theme-surface)) !important;
}
.contenedor-menu :deep(.v-icon),
.contenedor-menu :deep(.v-list-item-title),
.contenedor-menu :deep(.v-list-item-subtitle),
.contenedor-menu :deep(.footer-sidenav) {
  color: rgb(var(--v-theme-on-surface)) !important;
}
</style>
