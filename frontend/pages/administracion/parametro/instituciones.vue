<template>
  <main class="institucion-page">
    <CommonCrudTable
      tabla="institucionReferencia"
      titulo="Instituciones de referencia"
      :headers="headers"
      getrows="id nombre id_estado"
      :filters="filters"
      :inputs="inputs"
      :order="{ key: 'nombre', order: 'asc' }"
    >
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

const headers: Header[] = [
  {
    title: "Institución",
    key: "nombre",
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

const filters: Filters[] = [
  {
    field: "nombre",
    label: "Institución",
    type: "text",
  },
];

const inputs: Inputs[] = [
  {
    field: "nombre",
    descripcion: "Nombre de la institución",
    type: "text",
    required: true,
    maxlength: 200,
  },
];
</script>

<style scoped>
.institucion-page {
  min-width: 0;
}
</style>
