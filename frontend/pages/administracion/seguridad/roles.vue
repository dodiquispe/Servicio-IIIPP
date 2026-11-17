<template>
  <main class="roles-page">
    <CommonCrudTable
      tabla="rol"
      titulo="Roles"
      :headers="roleHeaders"
      getrows="id descripcion icono id_sec id_estado"
      :filters="roleFilters"
      :inputs="roleInputs"
      :order="{ key: 'descripcion', order: 'asc' }"
    >
      <template #icono="{ item }">
        <div class="d-flex align-center ga-2">
          <v-icon>{{ item.icono }}</v-icon>
          <span>{{ item.icono }}</span>
        </div>
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
import type { Filters, Header, Inputs } from "~/interfaces/app/common";
import { mdiIconNames } from "~/utils/mdi-icons";

const roleHeaders: Header[] = [
  {
    title: "Nombre",
    key: "descripcion",
  },
  {
    title: "Icono",
    key: "icono",
    crearColumna: true,
  },
  {
    title: "Código",
    key: "id_sec",
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

const roleFilters: Filters[] = [
  {
    field: "descripcion",
    label: "Nombre del rol",
    type: "text",
  },
];

const iconOptions = mdiIconNames.map((icon) => ({
  title: icon,
  value: icon,
}));

const roleInputs: Inputs[] = [
  {
    field: "descripcion",
    descripcion: "Nombre del rol",
    type: "text",
    required: true,
    maxlength: 100,
  },
  {
    field: "icono",
    descripcion: "Icono",
    type: "text",
    required: true,
    items: iconOptions,
    itemTitle: "title",
    itemValue: "value",
  },
  {
    field: "id_sec",
    descripcion: "Código numérico",
    type: "number",
    required: true,
    integer: true,
    min: 1,
  },
];
</script>

<style scoped>
.roles-page {
  min-width: 0;
}
</style>
