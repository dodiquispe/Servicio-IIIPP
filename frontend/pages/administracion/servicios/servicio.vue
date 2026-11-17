<template>
  <main class="servicios-page">
    <CommonCrudTable
      tabla="servicio"
      titulo="Servicios"
      :headers="serviceHeaders"
      :getrows="serviceRows"
      :filters="serviceFilters"
      :order="{ key: 'servicio', order: 'asc' }"
      :inputs="serviceInputs"
      :can-create="diasLaboralesDisponibles"
      :after-create="crearHorariosIniciales"
    >
      <template #horarios="{ item }">
        <v-btn
          color="primary"
          size="small"
          variant="tonal"
          prepend-icon="mdi-calendar-clock"
          :disabled="!diasLaboralesDisponibles"
          @click="gestionarHorarios(item)"
        >
          Configurar
        </v-btn>
      </template>
    </CommonCrudTable>

    <ServiciosHorarioConfiguracion
      v-if="servicioSeleccionado"
      v-model="horariosDialog"
      :servicio="servicioSeleccionado"
      :dias-semana="diasSemana"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type {
  CrudRecord,
  DayParameter,
  Filters,
  Header,
  Inputs,
  ServiceRecord,
} from "~/interfaces/app/common";
import { findDayParameter, WEEKDAY_NAMES } from "~/interfaces/app/common";

const serviceHeaders: Header[] = [
  { title: "Servicio", key: "servicio" },
  { title: "Descripción", key: "descripcion" },
  { title: "Capacidad simultánea", key: "capacidad_simultanea" },
  { title: "Duración (min)", key: "duracion_sesion_min" },
  {
    title: "Horarios de atención",
    key: "horarios",
    crearColumna: true,
    sortable: false,
  },
  { title: "Acciones", key: "actions", sortable: false },
];

const serviceRows =
  "id servicio descripcion capacidad_simultanea duracion_sesion_min id_estado";

const serviceFilters: Filters[] = [
  { field: "servicio", label: "Servicio", type: "text" },
  { field: "descripcion", label: "Descripción", type: "text" },
];

const serviceInputs: Inputs[] = [
  {
    field: "servicio",
    descripcion: "Nombre del servicio",
    type: "text",
    required: true,
    maxlength: 150,
  },
  {
    field: "descripcion",
    descripcion: "Descripción",
    type: "textarea",
    required: true,
    maxlength: 500,
  },
  {
    field: "capacidad_simultanea",
    descripcion: "Capacidad simultánea",
    type: "number",
    required: true,
    min: 1,
    integer: true,
    numericMessage:
      "La capacidad simultánea debe ser un número entero mayor o igual a 1",
  },
  {
    field: "duracion_sesion_min",
    descripcion: "Duración de sesión (minutos)",
    type: "number",
    required: true,
    min: 16,
    integer: true,
    numericMessage: "La duración de sesión debe ser mayor a 15 minutos",
  },
];

const diasSemana = ref<DayParameter[]>([]);
const { $service } = useNuxtApp();
const horariosDialog = ref(false);
const servicioSeleccionado = ref<ServiceRecord | null>(null);

const diasLaboralesDisponibles = computed(() => {
  return WEEKDAY_NAMES.every(
    (weekday) => findDayParameter(diasSemana.value, weekday) !== undefined,
  );
});

async function cargarDiasSemana(): Promise<void> {
  try {
    const result = await $service.graphql<{
      parametrosByTipo: DayParameter[];
    }>({
      query: $querys.queryconvariablesdistintas(
        "parametrosByTipo",
        "id valor",
        "tipo",
      ),
      variables: { datos: "dia_semana" },
    });
    diasSemana.value = result.parametrosByTipo;
  } catch (error) {
    useMessage().error(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los días de la semana",
    );
  }
}

async function crearHorariosIniciales(
  servicioCreado: CrudRecord,
): Promise<void> {
  if (typeof servicioCreado.id !== "string") {
    throw new Error("La respuesta de creación no incluyó el UUID del servicio");
  }

  const intervalos = [
    { hora_inicio: "08:30", hora_fin: "12:30" },
    { hora_inicio: "14:30", hora_fin: "18:30" },
  ];

  for (const weekday of WEEKDAY_NAMES) {
    const dia = findDayParameter(diasSemana.value, weekday);
    if (!dia) {
      throw new Error(
        `No se encontró un parámetro único activo para ${weekday}`,
      );
    }

    for (const intervalo of intervalos) {
      await $service.graphql({
        query: $querys.mutationCreateWithVariable("horario", "id_horario"),
        variables: {
          datos: {
            id_servicio: servicioCreado.id,
            id_dia: dia.id,
            ...intervalo,
            id_estado: 1,
          },
        },
      });
    }
  }
}

function gestionarHorarios(item: CrudRecord): void {
  if (typeof item.id !== "string" || typeof item.servicio !== "string") {
    useMessage().error("No se pudo identificar el servicio seleccionado");
    return;
  }

  servicioSeleccionado.value = {
    id: item.id,
    servicio: item.servicio,
  };
  horariosDialog.value = true;
}

onMounted(cargarDiasSemana);
</script>

<style scoped>
.servicios-page {
  min-width: 0;
}
</style>
