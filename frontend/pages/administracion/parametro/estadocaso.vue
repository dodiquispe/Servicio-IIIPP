<template>
  <v-container fluid class="estado-caso-page">
    <CommonCrudTable
      tabla="estado"
      titulo="Estado del caso"
      :headers="headers"
      :getrows="getrows"
      :filters="filters"
      :inputs="inputs"
      :fixed-search="fixedSearch"
      :create-data="{ id_estado: 1 }"
      :order="{ key: 'valor', order: 'asc' }"
      order-type="EstadoOrderInput"
      id-type="Int"
      :on-save="guardar"
    >
      <template #id_estado="{ item }">
        <v-chip size="small" :color="item.id_estado === 1 ? 'success' : 'grey'">
          {{ item.id_estado === 1 ? "Activo" : "Inactivo" }}
        </v-chip>
      </template>
    </CommonCrudTable>
  </v-container>
</template>

<script setup lang="ts">
import type {
  CrudRecord,
  Filters,
  Header,
  Inputs,
} from "~/interfaces/app/common";

const { $service } = useNuxtApp();
const fixedSearch = { tipo: "ESTADO_CASO" };
const getrows = "id valor tipo id_estado";
const estados = [
  { title: "Activo", value: 1 },
  { title: "Inactivo", value: 2 },
];
const headers: Header[] = [
  { title: "Estado del caso", key: "valor" },
  { title: "Estado", key: "id_estado", crearColumna: true },
  { title: "Acciones", key: "actions", sortable: false },
];
const filters: Filters[] = [
  { field: "valor", label: "Buscar estado del caso", type: "text" },
  { field: "id_estado", label: "Estado", type: "select", items: estados },
];
const inputs: Inputs[] = [
  {
    field: "valor",
    descripcion: "Estado del caso",
    type: "text",
    required: true,
    maxlength: 150,
  },
  { field: "id_estado", descripcion: "Estado", type: "select", items: estados },
];

async function guardar(data: CrudRecord, isEditing: boolean): Promise<void> {
  await $service.graphql({
    query: isEditing
      ? $querys.mutationEditWithVariable("estado", "id")
      : $querys.mutationCreateWithVariable("estado", "id"),
    variables: {
      datos: isEditing
        ? { id: data.id, valor: data.valor, id_estado: data.id_estado }
        : { valor: data.valor, id_estado: data.id_estado ?? undefined },
    },
  });
}
</script>

<style scoped>
.estado-caso-page {
  min-width: 0;
}

.btn-agregar {
  height: 32px !important;
  min-height: 32px !important;
  font-weight: 400;
  text-transform: none;
}

.tabla-estado-caso :deep(thead th) {
  background-color: rgb(var(--v-theme-secondary)) !important;
  color: rgb(0, 0, 0) !important;
}

.table-action-btn {
  width: 32px;
  height: 32px;
}
</style>
