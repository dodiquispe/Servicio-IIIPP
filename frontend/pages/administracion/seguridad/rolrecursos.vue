<template>
  <main class="rol-recurso-page">
    <CommonCrudTable
      tabla="rolRecurso"
      titulo="Asignación de rol a recurso"
      :headers="linkHeaders"
      getrows="id id_rol id_recurso id_estado rol { descripcion } recurso { title }"
      :filters="linkFilters"
      :inputs="linkInputs"
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
import { computed, onMounted, ref } from "vue";
import type { Header, Filters, Inputs } from "~/interfaces/app/common";

const { $service } = useNuxtApp();



const linkHeaders: Header[] = [
  {
    title: "Rol",
    key: "rol.descripcion",
  },
  {
    title: "Recurso",
    key: "recurso.title",
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

const linkFilters: Filters[] = [
  {
    field: "id_rol",
    label: "Rol",
    type: "rol",
  },
  {
    field: "id_recurso",
    label: "Recurso",
    type: "recurso",
  },
];

const linkInputs: Inputs[] = [
  {
    field: "id_rol",
    descripcion: "Rol",
    type: "rol",
    required: true,
  },
  {
    field: "id_recurso",
    descripcion: "Recurso",
    type: "recurso",
    required: true,
  },
];

</script>

<style scoped>
.rol-recurso-page {
  min-width: 0;
}
</style>
