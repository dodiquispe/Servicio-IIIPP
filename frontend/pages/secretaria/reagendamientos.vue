<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">SECRETARÍA</div>
        <h1 class="text-h4">Reagendamientos por verificar</h1>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <CommonCrudTable
      tabla="reserva"
      titulo="Reagendamientos"
      :headers="headers"
      getrows=""
      :filters="[]"
      :inputs="[]"
      :source-items="reservasFiltradas"
      :source-loading="cargando"
      :acciones="false"
      :source-reload="cargarReservas"
    >
      <template #source-filters>
        <ServicioSelect v-model="servicioFiltro" label="Servicio" solo-con-responsable class="mb-3" />
        <v-select v-model="estadoFiltro" :items="estadosFiltro" label="Filtrar por estado" density="compact" variant="outlined" clearable hide-details class="mb-3" />
      </template>
      <template #source-toolbar>
        <v-spacer />
        <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="cargando" @click="cargarReservas">
          Actualizar
        </v-btn>
      </template>
      <template #paciente="{ item }">
        {{ nombrePaciente(asBooking(item)) }}
      </template>
      <template #fecha="{ item }">
        {{ formatoFecha(String(item.fecha)) }}
      </template>
      <template #estado_reserva="{ item }">
        <v-chip
          size="small"
          :color="String(item.estado_reserva) === 'NO_ASISTIO' ? 'error' : 'primary'"
          variant="tonal"
        >
          {{ etiquetaEstado(String(item.estado_reserva)) }}
        </v-chip>
      </template>
      <template #acciones="{ item }">
        <v-btn
          v-if="canRebook(item)"
          icon="mdi-calendar-refresh"
          size="small"
          color="primary"
          variant="flat"
          class="table-action-btn"
          :aria-label="`Reagendar ${nombrePaciente(asBooking(item))}`"
          @click="seleccionar(asBooking(item))"
        >
          <v-tooltip activator="parent" location="bottom">Reagendar</v-tooltip>
        </v-btn>
      </template>
    </CommonCrudTable>

    <v-dialog v-model="dialogo" max-width="680">
      <v-card>
        <v-card-title class="text-h6">Autorizar nuevo horario</v-card-title>
        <v-card-text v-if="seleccionada">
          <v-alert type="info" variant="tonal" class="mb-4">
            {{ nombrePaciente(seleccionada) }} · {{ seleccionada.servicio.servicio }}
            · {{ formatoFecha(seleccionada.fecha) }} a
            {{ seleccionada.hora_inicio.slice(0, 5) }}
          </v-alert>
          <v-text-field
            v-model="motivo"
            label="Motivo del reagendamiento"
            maxlength="300"
            required
          />
          <v-text-field
            v-model="fechaNueva"
            label="Nueva fecha"
            type="date"
            :min="fechaMinima"
            required
          />
          <div v-if="fechaNueva" class="mt-3">
            <div class="text-subtitle-2 mb-2">Horarios disponibles</div>
            <v-progress-linear v-if="cargandoHorarios" indeterminate color="primary" />
            <div v-else>
              <v-chip-group v-model="horaNueva" color="primary" column :disabled="guardando" aria-label="Seleccionar nuevo horario disponible">
              <v-chip
                v-for="slot in horarios"
                :key="slot.hora_inicio"
                :value="slot.hora_inicio"
                variant="outlined"
                filter
              >
                {{ slot.hora_inicio.slice(0, 5) }}
              </v-chip>
              </v-chip-group>
              <span v-if="!horarios.length" class="text-medium-emphasis">
                No hay cupos disponibles para esta fecha.
              </span>
            </div>
          </div>
          <v-alert v-if="errorDialogo" type="error" variant="tonal" class="mt-4">
            {{ errorDialogo }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end flex-wrap">
          <v-btn variant="text" :disabled="guardando" @click="dialogo = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :loading="guardando"
            :disabled="cargandoHorarios || !motivo.trim() || !fechaNueva || !horaNueva"
            @click="guardarReagendamiento"
          >
            Confirmar reagendamiento
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import ServicioSelect from "~/components/common/Fields/ServicioSelect.vue";
import { $querys } from "~/utils/querys.graphql";
import type { CrudRecord } from "~/interfaces/app/common";

interface Booking extends CrudRecord {
  id: string;
  id_expediente: string;
  id_servicio: string;
  id_profesional: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_reserva: string;
  servicio: { servicio: string; id_estado: number };
  expediente: {
    id_persona: string;
    codigo_caso: string;
    persona: {
      nombres: string;
      primer_apellido: string | null;
      segundo_apellido: string | null;
    };
  };
}
interface Slot {
  hora_inicio: string;
  hora_fin: string;
  id_profesional: string;
}

const { $service } = useNuxtApp();
const session = useUserSession();
const reservas = ref<Booking[]>([]);
const estadoFiltro = ref<string | null>("NO_ASISTIO");
const estadosFiltro = [
  { title: "No asistió", value: "NO_ASISTIO" },
  { title: "Reagendada", value: "REAGENDADA" },
  { title: "Todas", value: null },
];
const servicioFiltro = ref<string | null>(null);
const reservasFiltradas = computed(() => reservas.value.filter((booking) =>
  (!estadoFiltro.value || booking.estado_reserva === estadoFiltro.value) &&
  (!servicioFiltro.value || booking.id_servicio === servicioFiltro.value),
));
const seleccionada = ref<Booking | null>(null);
const horarios = ref<Slot[]>([]);
const dialogo = ref(false);
const cargando = ref(false);
const cargandoHorarios = ref(false);
const guardando = ref(false);
const error = ref("");
const errorDialogo = ref("");
const motivo = ref("");
const fechaNueva = ref("");
const horaNueva = ref("");
const fechaMinima = localDate(new Date());
const headers = [
  { title: "Paciente", key: "paciente", crearColumna: true },
  { title: "Servicio", key: "servicio.servicio" },
  { title: "Fecha", key: "fecha", crearColumna: true },
  { title: "Hora", key: "hora_inicio" },
  { title: "Estado", key: "estado_reserva", crearColumna: true },
  { title: "Acciones", key: "acciones", sortable: false },
];

watch(fechaNueva, async (date) => {
  horaNueva.value = "";
  horarios.value = [];
  errorDialogo.value = "";
  if (!date || !seleccionada.value) return;
  cargandoHorarios.value = true;
  try {
    const result = await $service.graphql<{ horariosDisponibles: Slot[] }>({
      query: $querys.publicas.horariosDisponibles,
      variables: {
        id: seleccionada.value.id_servicio,
        fecha: date,
        id_persona: seleccionada.value.expediente.id_persona,
      },
    });
    horarios.value = result.horariosDisponibles.filter(
      (slot) => slot.id_profesional === seleccionada.value?.id_profesional,
    ).filter(slot => withinMinimumLead(date, slot.hora_inicio));
  } catch (requestError) {
    errorDialogo.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo consultar la disponibilidad.";
  } finally {
    cargandoHorarios.value = false;
  }
});

onMounted(() => void cargarReservas());

async function cargarReservas() {
  cargando.value = true;
  error.value = "";
  try {
    const result = await $service.graphql<{ reservas: Booking[] }>({
      query: $querys.staff.reservasSecretaria,
      variables: {
        desde: localDate(addDays(new Date(), -30)),
        hasta: localDate(addDays(new Date(), 60)),
      },
    });
    reservas.value = result.reservas;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar las reservas.";
  } finally {
    cargando.value = false;
  }
}

function seleccionar(booking: Booking) {
  seleccionada.value = booking;
  motivo.value = "";
  fechaNueva.value = "";
  horaNueva.value = "";
  errorDialogo.value = "";
  dialogo.value = true;
}

async function guardarReagendamiento() {
  if (!seleccionada.value || !session.usuario.value?.id || !horaNueva.value) return;
  guardando.value = true;
  errorDialogo.value = "";
  try {
    await $service.graphql({
      query: $querys.staff.crearReagendamiento,
      variables: {
        input: {
          id_reserva: seleccionada.value.id,
          motivo: motivo.value.trim(),
          solicitado_por: session.usuario.value.id,
          autorizado_por: session.usuario.value.id,
          resultado: "AUTORIZADO",
          fecha_anterior: seleccionada.value.fecha,
          hora_anterior: seleccionada.value.hora_inicio,
          fecha_nueva: fechaNueva.value,
          hora_nueva: horaNueva.value,
        },
      },
    });
    dialogo.value = false;
    await cargarReservas();
  } catch (requestError) {
    errorDialogo.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo confirmar el reagendamiento.";
  } finally {
    guardando.value = false;
  }
}

function nombrePaciente(booking: Booking) {
  const person = booking.expediente.persona;
  return [person.nombres, person.primer_apellido, person.segundo_apellido]
    .filter(Boolean)
    .join(" ");
}
function asBooking(record: CrudRecord): Booking { return record as Booking; }
function canRebook(record: CrudRecord): boolean {
  const booking = asBooking(record);
  return booking.estado_reserva === "NO_ASISTIO" && booking.servicio.id_estado === 1;
}
function withinMinimumLead(date: string, hour: string): boolean {
  const now = new Date(Date.now() + 60 * 60_000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (date < parts) return false;
  if (date > parts) return true;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const [h = 0, m = 0] = time.split(":").map(Number);
  const minimum = h * 60 + m + (now.getSeconds() ? 1 : 0);
  const [slotHour = 0, slotMinute = 0] = hour.split(":").map(Number);
  return slotHour * 60 + slotMinute >= minimum;
}
function etiquetaEstado(value: string) {
  const labels: Record<string, string> = {
    RESERVADA: "Reservada",
    ASISTIO: "Asistió",
    NO_ASISTIO: "No asistió",
    REAGENDADA: "Reagendada",
    CANCELADA: "Cancelada",
    PENDIENTE_PAGO: "Pendiente de pago",
  };
  return labels[value] ?? value;
}
function formatoFecha(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}
</script>
