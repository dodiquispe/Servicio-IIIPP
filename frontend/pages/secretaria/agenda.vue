<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">SECRETARÍA</div>
        <h1 class="text-h4">Días sin atención</h1>
        <p class="text-body-2 text-medium-emphasis">
          Registra cierres de todo el día o bloqueos por horario. Las fechas
          cerradas no ofrecerán turnos en la reserva pública.
        </p>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <CommonCrudTable
      tabla="bloqueAgenda"
      titulo="Días sin atención registrados"
      :headers="headers"
      getrows=""
      :filters="[]"
      :inputs="inputs"
      :create-data="createData"
      :source-items="bloqueos"
      :source-loading="cargando"
      :acciones="false"
      :source-reload="cargarBloqueos"
      :on-save="guardarBloqueDesdeTabla"
    >
      <template #fecha_inicio="{ item }">
        {{ formatoFecha(item.fecha_inicio) }}
      </template>
      <template #fecha_fin="{ item }">
        {{ formatoFecha(item.fecha_fin) }}
      </template>
      <template #horario="{ item }">
        {{
          item.hora_inicio && item.hora_fin
            ? `Sin atención de ${item.hora_inicio.slice(0, 5)} a ${item.hora_fin.slice(0, 5)}`
            : "Sin atención todo el día"
        }}
      </template>
      <template #servicio="{ item }">{{
        item.servicio?.servicio || "Todos los servicios"
      }}</template>
      <template #acciones="{ item }">
        <v-btn
          icon="mdi-delete-outline"
          size="small"
          color="error"
          variant="flat"
          class="table-action-btn"
          aria-label="Eliminar bloqueo"
          :loading="eliminando === item.id"
          @click="eliminarBloque(item)"
        >
        </v-btn>
      </template>
    </CommonCrudTable>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";
import type { CrudRecord, Inputs } from "~/interfaces/app/common";

interface Block extends CrudRecord {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string;
  tipo: string;
  servicio?: { servicio: string } | null;
}
interface ServiceOption {
  id: string;
  servicio: string;
  id_estado: number;
}

const { $service } = useNuxtApp();
const session = useUserSession();
const bloqueos = ref<Block[]>([]);
const cargando = ref(false);
const eliminando = ref("");
const error = ref("");
const servicios = ref<ServiceOption[]>([]);
const fechaMinima = localDate(new Date());
const headers = [
  { title: "Desde", key: "fecha_inicio", crearColumna: true },
  { title: "Hasta", key: "fecha_fin", crearColumna: true },
  { title: "Horario", key: "horario", crearColumna: true },
  { title: "Servicio", key: "servicio", crearColumna: true },
  { title: "Motivo", key: "motivo" },
  { title: "Acciones", key: "acciones", sortable: false },
];
const inputs: Inputs[] = [
  { field: "fecha_inicio", descripcion: "Desde", type: "date", required: true },
  { field: "fecha_fin", descripcion: "Hasta", type: "date", required: true },
  {
    field: "diaCompleto",
    descripcion: "Bloquear todo el día",
    type: "boolean",
  },
  { field: "hora_inicio", descripcion: "Hora inicial", type: "time" },
  { field: "hora_fin", descripcion: "Hora final", type: "time" },
  {
    field: "id_servicio",
    descripcion: "Servicio (vacío para todos)",
    type: "select",
    items: [{ id: "", servicio: "Todos los servicios" }, ...servicios.value],
    itemTitle: "servicio",
    itemValue: "id",
  },
  {
    field: "motivo",
    descripcion: "Motivo (feriado, evento, mantenimiento...)",
    type: "text",
    required: true,
    maxlength: 200,
  },
];
const createData = {
  fecha_inicio: fechaMinima,
  fecha_fin: fechaMinima,
  diaCompleto: true,
  hora_inicio: "",
  hora_fin: "",
  motivo: "",
  id_servicio: "",
};

onMounted(() => {
  void cargarBloqueos();
  void cargarServicios();
});

async function cargarServicios() {
  try {
    const result = await $service.graphql<{
      servicios: { rows: ServiceOption[] };
    }>({
      query:
        "query { servicios(limit: 100, pagina: 1) { rows { id servicio id_estado } } }",
    });
    servicios.value = result.servicios.rows.filter(
      (service) => service.id_estado === 1,
    );
    const serviceInput = inputs.find((input) => input.field === "id_servicio");
    if (serviceInput)
      serviceInput.items = [
        { id: "", servicio: "Todos los servicios" },
        ...servicios.value,
      ];
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los servicios.";
  }
}

async function cargarBloqueos() {
  cargando.value = true;
  error.value = "";
  try {
    const result = await $service.graphql<{ bloquesAgenda: Block[] }>({
      query: $querys.staff.bloquesSecretaria,
      variables: {
        desde: fechaMinima,
        hasta: `${new Date().getFullYear()}-12-31`,
      },
    });
    bloqueos.value = result.bloquesAgenda;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los bloqueos.";
  } finally {
    cargando.value = false;
  }
}

async function guardarBloqueDesdeTabla(data: CrudRecord, isEditing: boolean) {
  if (isEditing) {
    throw new Error("Los cierres registrados no se pueden editar.");
  }
  const fechaInicio =
    typeof data.fecha_inicio === "string" ? data.fecha_inicio : "";
  const fechaFin = typeof data.fecha_fin === "string" ? data.fecha_fin : "";
  const motivo = typeof data.motivo === "string" ? data.motivo.trim() : "";
  const diaCompleto = data.diaCompleto === true;
  const horaInicio =
    typeof data.hora_inicio === "string" ? data.hora_inicio : "";
  const horaFin = typeof data.hora_fin === "string" ? data.hora_fin : "";
  const userId = session.usuario.value?.id;
  if (!userId) {
    throw new Error(
      "La sesión no contiene un usuario válido. Vuelve a iniciar sesión.",
    );
  }
  if (
    !fechaInicio ||
    !fechaFin ||
    fechaInicio < fechaMinima ||
    fechaFin < fechaInicio
  ) {
    throw new Error("Indica un rango de fechas válido desde hoy.");
  }
  if (!motivo) {
    throw new Error("El motivo del cierre es obligatorio.");
  }
  if (!diaCompleto && (!horaInicio || !horaFin || horaInicio >= horaFin)) {
    throw new Error(
      "Indica un horario válido con hora final posterior a la inicial.",
    );
  }
  await $service.graphql({
    query: $querys.staff.crearBloque,
    variables: {
      input: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        hora_inicio: diaCompleto ? null : horaInicio,
        hora_fin: diaCompleto ? null : horaFin,
        motivo,
        id_servicio:
          typeof data.id_servicio === "string" && data.id_servicio
            ? data.id_servicio
            : null,
        creado_por: userId,
      },
    },
  });
}

async function eliminarBloque(block: Block) {
  eliminando.value = block.id;
  error.value = "";
  try {
    await $service.graphql({
      query: $querys.staff.eliminarBloque,
      variables: { id: block.id },
    });
    bloqueos.value = bloqueos.value.filter((item) => item.id !== block.id);
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo eliminar el bloqueo.";
  } finally {
    eliminando.value = "";
  }
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatoFecha(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}
</script>
