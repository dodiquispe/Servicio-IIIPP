<template>
  <main class="recursos-page">
    <CommonCrudTable
      tabla="recurso"
      titulo="Recursos"
      :headers="resourceHeaders"
      getrows="id title icon nivel path id_estado id_recurso_padre is_menu"
      :filters="resourceFilters"
      :inputs="resourceInputs"
      :order="{ key: 'title', order: 'asc' }"
    >
      <template #icon="{ item }">
        <div class="d-flex align-center ga-2">
          <v-icon>{{ item.icon }}</v-icon>
          <span>{{ item.icon }}</span>
        </div>
      </template>

      <template #is_menu="{ item }">
        <v-chip :color="item.is_menu ? 'primary' : 'grey'" size="small">
          {{ item.is_menu ? "Sí" : "No" }}
        </v-chip>
      </template>

      <template #id_estado="{ item }">
        <v-chip :color="item.id_estado === 1 ? 'success' : 'grey'" size="small">
          {{ item.id_estado === 1 ? "Activo" : "Inactivo" }}
        </v-chip>
      </template>
    </CommonCrudTable>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Filters, Header, Inputs } from "~/interfaces/app/common";
import { mdiIconNames } from "~/utils/mdi-icons";

const { $service } = useNuxtApp();

const resources = ref([]);

const resourceHeaders: Header[] = [
  {
    title: "Nombre",
    key: "title",
  },
  {
    title: "Ruta",
    key: "path",
  },
  {
    title: "Icono",
    key: "icon",
    crearColumna: true,
  },
  {
    title: "Menú",
    key: "is_menu",
    crearColumna: true,
  },
  {
    title: "Estado",
    key: "id_estado",
    crearColumna: true,
  },
  {
    title: "Acciones",
    key: "actions",
    sortable: false,
  },
];

const resourceFilters: Filters[] = [
  {
    field: "title",
    label: "Nombre",
    type: "text",
  },
  {
    field: "path",
    label: "Ruta",
    type: "text",
  },
];

const iconOptions = mdiIconNames.map((icon) => ({
  title: icon,
  value: icon,
}));

const resourceInputs = computed<Inputs[]>(() => [
  {
    field: "title",
    descripcion: "Nombre del recurso",
    type: "text",
    required: true,
    maxlength: 150,
  },
  {
    field: "icon",
    descripcion: "Icono",
    type: "text",
    required: true,
    items: iconOptions,
    itemTitle: "title",
    itemValue: "value",
  },
  {
    field: "path",
    descripcion: "Ruta",
    type: "text",
  },
  {
    field: "id_recurso_padre",
    descripcion: "Recurso padre",
    type: "recurso",
  },
  {
    field: "nivel",
    descripcion: "Nivel",
    type: "number",
    required: true,
    min: 1,
    integer: true,
  },
  {
    field: "is_menu",
    descripcion: "Mostrar en menú",
    type: "boolean",
  },
]);
</script>

<style scoped>
.recursos-page {
  min-width: 0;
}
</style>
