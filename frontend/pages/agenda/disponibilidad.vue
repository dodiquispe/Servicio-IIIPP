<template>
  <v-container fluid>
    <div class="mb-4">
      <h1 class="text-h4">Mi disponibilidad</h1>
      <p class="text-medium-emphasis">
        Registra los bloques en que atenderás. Solo se ofrecerán horas que coincidan
        con el horario base del servicio.
      </p>
    </div>

    <v-row class="mb-4">
      <v-col cols="12" md="5">
        <v-date-picker
          v-model="selectedDate"
          color="primary"
          title="Selecciona un día"
          :min="today"
        />
      </v-col>
      <v-col cols="12" md="7">
        <CommonCrudTable
          tabla="disponibilidad"
          titulo="Mi disponibilidad"
          :headers="headers"
          getrows=""
          :filters="[]"
          :inputs="inputs"
          :create-data="{ fecha: selectedDate, hora_inicio: '08:00', hora_fin: '12:00' }"
          :source-items="blocks"
          :source-loading="loading"
          :source-reload="loadBlocks"
          :on-save="saveBlock"
          :acciones="false"
        >
          <template #actions="{ item }">
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              color="error"
              variant="flat"
              class="table-action-btn"
              :aria-label="`Desactivar bloque ${item.fecha} ${item.hora_inicio}`"
              @click="deactivateBlock(item.id)"
            />
          </template>
        </CommonCrudTable>
      </v-col>
    </v-row>
    <v-alert v-if="error" type="error" variant="tonal">{{ error }}</v-alert>
  </v-container>
</template>

<script setup lang="ts">
import type { CrudRecord, Header, Inputs } from '~/interfaces/app/common';

interface AvailabilityBlock extends CrudRecord {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

const { $service } = useNuxtApp();
const today = new Date().toISOString().slice(0, 10);
const selectedDate = ref(today);
const blocks = ref<AvailabilityBlock[]>([]);
const loading = ref(false);
const error = ref('');
const headers: Header[] = [
  { title: 'Fecha', key: 'fecha' },
  { title: 'Desde', key: 'hora_inicio' },
  { title: 'Hasta', key: 'hora_fin' },
  { title: 'Acciones', key: 'actions', sortable: false },
];
const inputs: Inputs[] = [
  { field: 'fecha', descripcion: 'Fecha', type: 'date', required: true },
  { field: 'hora_inicio', descripcion: 'Hora de inicio', type: 'time', required: true },
  { field: 'hora_fin', descripcion: 'Hora final', type: 'time', required: true },
];

watch(selectedDate, () => void loadBlocks());
onMounted(() => void loadBlocks());

async function loadBlocks(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const result = await $service.graphql<{ miDisponibilidad: AvailabilityBlock[] }>({
      query: `query($desde: String, $hasta: String) {
        miDisponibilidad(desde: $desde, hasta: $hasta) { id fecha hora_inicio hora_fin }
      }`,
      variables: { desde: selectedDate.value, hasta: selectedDate.value },
    });
    blocks.value = result.miDisponibilidad;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'No se pudo cargar la disponibilidad.';
  } finally {
    loading.value = false;
  }
}

async function saveBlock(data: CrudRecord): Promise<void> {
  await $service.graphql({
    query: `mutation($input: CreateDisponibilidadInput!) {
      guardarDisponibilidad(input: $input) { id }
    }`,
    variables: { input: data },
  });
}

async function deactivateBlock(id: string): Promise<void> {
  try {
    await $service.graphql({
      query: 'mutation($id: String!) { desactivarDisponibilidad(id: $id) { id } }',
      variables: { id },
    });
    await loadBlocks();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'No se pudo desactivar el bloque.';
  }
}
</script>
