<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div>
        <div class="text-overline text-primary">AGENDA</div>
        <h1 class="text-h4">{{ isCoordinator || isAdministrator ? 'Agenda semanal de responsables' : 'Mi semana' }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ rangeLabel }}</div>
      </div>
      <div class="d-flex align-center ga-2">
        <v-select
          v-if="isAdministrator || isResponsible"
          v-model="selectedProfessional"
          :items="professionalOptions"
          item-title="name"
          item-value="id"
          :label="isAdministrator ? 'Responsable' : 'Practicante'"
          clearable
          hide-details
          density="compact"
          style="min-width: 230px"
        />
        <v-select v-model="selectedService" :items="serviceOptions" item-title="servicio" item-value="id" label="Servicio" density="compact" hide-details style="min-width: 220px" />
        <v-btn icon="mdi-chevron-left" aria-label="Semana anterior" @click="moveWeek(-7)" />
        <v-btn variant="outlined" @click="goToToday">Hoy</v-btn>
        <v-btn icon="mdi-chevron-right" aria-label="Semana siguiente" @click="moveWeek(7)" />
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />

    <v-alert v-if="!selectedService" type="info" variant="tonal">Seleccione un servicio para consultar su horario.</v-alert>
    <v-table v-else class="agenda-grid" density="compact" fixed-header>
      <thead><tr><th class="hour-cell">Hora</th><th v-for="day in agendaDays" :key="day.date">{{ day.label }}</th></tr></thead>
      <tbody>
        <tr v-for="hour in agendaHours" :key="hour"><th class="hour-cell">{{ hour }}</th>
          <td v-for="day in agendaDays" :key="day.date" class="agenda-cell">
            <button v-for="event in eventsAt(day.date, hour)" :key="event.id" type="button" class="appointment-chip" @click="openDetail(event)">
              <strong>{{ event.paciente || event.estado }}</strong><span>{{ event.hora_inicio.slice(0, 5) }} · {{ event.estado }} · {{ event.servicio || selectedServiceName }}</span><span>{{ event.responsable || event.profesional || 'Sin responsable' }}</span>
            </button>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="detailOpen" max-width="620">
      <v-card v-if="detailEvent">
        <v-card-title>Detalle de la cita</v-card-title><v-card-text>
          <v-list lines="two">
            <v-list-item title="Paciente" :subtitle="detailEvent.paciente || 'No registrado'" />
            <v-list-item title="Servicio" :subtitle="detailEvent.servicio || selectedServiceName" />
            <v-list-item title="Fecha y hora" :subtitle="`${detailEvent.fecha} · ${detailEvent.hora_inicio.slice(0, 5)}`" />
            <v-list-item title="Estado" :subtitle="detailEvent.estado" />
            <v-list-item title="Responsable" :subtitle="detailEvent.responsable || 'No registrado'" />
          </v-list>
          <v-alert v-if="detailError" type="error" variant="tonal">{{ detailError }}</v-alert>
        </v-card-text>
        <v-card-actions v-if="canMark(detailEvent)">
          <v-btn color="success" :loading="marking === detailEvent.id" :disabled="Boolean(marking)" @click="markAttendance(detailEvent, 'ASISTIO')">Asistió</v-btn>
          <v-btn color="error" :loading="marking === detailEvent.id" :disabled="Boolean(marking)" @click="markAttendance(detailEvent, 'NO_ASISTIO')">No asistió</v-btn>
          <v-spacer /><v-btn variant="text" @click="detailOpen = false">Cerrar</v-btn>
        </v-card-actions>
        <v-card-actions v-else><v-spacer /><v-btn variant="text" @click="detailOpen = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole } from "~/utils/session";

interface AgendaEvent {
  id: string;
  tipo_evento: "CITA" | "BLOQUE";
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  id_profesional: string | null;
  profesional: string | null;
  id_responsable: string | null;
  responsable: string | null;
  id_servicio: string | null;
  servicio: string | null;
  codigo_caso: string | null;
  paciente: string | null;
  estado: string;
  motivo: string | null;
}
interface ProfessionalOption {
  id: string;
  name: string;
}
interface ServiceOption { id: string; servicio: string; duracion_sesion_min: number }
interface Schedule { hora_inicio: string; hora_fin: string; id_profesional: string | null; dia: { valor: string } }

const { $service } = useNuxtApp();
const session = useUserSession();
const weekDate = ref(localDate(mondayOf(new Date())));
const events = ref<AgendaEvent[]>([]);
const serviceOptions = ref<ServiceOption[]>([]);
const selectedService = ref<string | null>(null);
const schedules = ref<Schedule[]>([]);
const professionalOptions = ref<ProfessionalOption[]>([]);
const loading = ref(false);
const error = ref("");
const marking = ref("");
const detailOpen = ref(false);
const detailEvent = ref<AgendaEvent | null>(null);
const detailError = ref("");
const selectedProfessional = ref<string | null>(null);
let requestVersion = 0;
const isCoordinator = computed(() => sessionHasRole(session.roles.value, "coordinador"));
const isAdministrator = computed(() => sessionHasRole(session.roles.value, "administrador"));
const isResponsible = computed(() => sessionHasRole(session.roles.value, "responsable"));
const isPractitioner = computed(() => sessionHasRole(session.roles.value, "practicante"));
const selectedServiceRecord = computed(() => serviceOptions.value.find(item => item.id === selectedService.value));
const selectedServiceName = computed(() => selectedServiceRecord.value?.servicio ?? "Servicio");
const rangeLabel = computed(() => {
  const start = mondayOf(parseLocalDate(weekDate.value));
  const end = agendaDays.value.length ? parseLocalDate(agendaDays.value.at(-1)!.date) : addDays(start, 4);
  const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
});
const filteredEvents = computed(() => {
  return events.value.filter((event) =>
    (!selectedService.value || event.id_servicio === selectedService.value) && (!selectedProfessional.value || (isAdministrator.value
    ? event.id_responsable === selectedProfessional.value ||
      event.tipo_evento === "BLOQUE" && event.id_profesional === null && event.id_responsable === null
    : event.id_profesional === selectedProfessional.value ||
      event.tipo_evento === "BLOQUE" && event.id_profesional === null)),
  );
});
const weekStart = computed(() => localDate(mondayOf(parseLocalDate(weekDate.value))));
const agendaDays = computed(() => {
  const hasSaturday = schedules.value.some(schedule => normalizeDay(schedule.dia.valor) === "sabado");
  const names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return names.slice(0, hasSaturday ? 6 : 5).map((name, index) => {
    const date = localDate(addDays(parseLocalDate(weekStart.value), index));
    return { date, label: `${name} ${date.slice(8, 10)}/${date.slice(5, 7)}` };
  });
});
const agendaHours = computed(() => {
  const duration = selectedServiceRecord.value?.duracion_sesion_min ?? 60;
  const hours = new Set<string>();
  for (const schedule of schedules.value.filter(item => !item.id_profesional)) {
    const end = toMinutes(schedule.hora_fin);
    for (let start = toMinutes(schedule.hora_inicio); start + duration <= end; start += duration) hours.add(toClock(start));
  }
  return [...hours].sort();
});

watch([weekDate, selectedProfessional, selectedService], () => void loadWeek());
watch(selectedService, () => void loadSchedule());
onMounted(() => {
  void loadServiceOptions();
  void loadWeek();
  if (isResponsible.value || isAdministrator.value) void loadProfessionalOptions();
});

async function loadWeek(): Promise<void> {
  const version = ++requestVersion;
  loading.value = true;
  error.value = "";
  const start = localDate(mondayOf(parseLocalDate(weekDate.value)));
  const end = localDate(addDays(parseLocalDate(start), 6));
  try {
    const result = await $service.graphql<{ agendaSemanal: AgendaEvent[] }>({
      query: $querys.staff.agendaSemanal,
      variables: {
        desde: start,
        hasta: end,
        id_profesional: selectedProfessional.value,
      },
    });
    if (version === requestVersion) events.value = result.agendaSemanal;
  } catch (cause) {
    if (version === requestVersion) {
      events.value = [];
      error.value = cause instanceof Error ? cause.message : "No se pudo cargar la agenda semanal.";
    }
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

async function loadProfessionalOptions(): Promise<void> {
  try {
    const result = await $service.graphql<{ profesionalesFiltroAgenda: ProfessionalOption[] }>({
      query: `query ProfesionalesFiltroAgenda { profesionalesFiltroAgenda { id name } }`,
    });
    professionalOptions.value = result.profesionalesFiltroAgenda;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "No se pudo cargar la lista de profesionales.";
  }
}

async function loadServiceOptions(): Promise<void> {
  try {
    const result = await $service.graphql<{ servicios: { rows: ServiceOption[] } }>({
      query: $querys.publicas.servicios,
    });
    serviceOptions.value = result.servicios.rows;
    if (!selectedService.value) selectedService.value = result.servicios.rows[0]?.id ?? null;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "No se pudieron cargar los servicios.";
  }
}

async function loadSchedule(): Promise<void> {
  schedules.value = [];
  if (!selectedService.value) return;
  try {
    const result = await $service.graphql<{ horarios: { rows: Schedule[] } }>({
      query: `query HorariosAgenda($id: String!) { horarios(limit: 100, pagina: 1, search: { id_servicio: $id }) { rows { hora_inicio hora_fin id_profesional dia { valor } } } }`,
      variables: { id: selectedService.value },
    });
    schedules.value = result.horarios.rows;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "No se pudo cargar el horario del servicio.";
  }
}

function eventsAt(date: string, hour: string): AgendaEvent[] {
  return filteredEvents.value.filter(event => event.tipo_evento === "CITA" && event.fecha === date && event.hora_inicio.slice(0, 5) === hour);
}
function openDetail(event: AgendaEvent): void {
  detailEvent.value = event;
  detailError.value = "";
  detailOpen.value = true;
}
function canMark(event: AgendaEvent): boolean {
  return (isResponsible.value || isPractitioner.value) && event.tipo_evento === "CITA" &&
    ["Confirmada", "PAGADA", "AGENDADA", "EN_ATENCION", "REAGENDADA"].includes(event.estado);
}
async function markAttendance(event: AgendaEvent, status: "ASISTIO" | "NO_ASISTIO"): Promise<void> {
  const id = event.id.replace(/^reserva:/, "");
  marking.value = id;
  detailError.value = "";
  try {
    await $service.graphql({ query: $querys.staff.cambiarEstadoReserva, variables: { input: { id, estado_reserva: status } } });
    detailOpen.value = false;
    await loadWeek();
  } catch (cause) {
    detailError.value = cause instanceof Error ? cause.message : "No se pudo actualizar la asistencia.";
  } finally {
    marking.value = "";
  }
}
function moveWeek(offset: number): void {
  weekDate.value = localDate(addDays(parseLocalDate(weekDate.value), offset));
}
function goToToday(): void {
  weekDate.value = localDate(mondayOf(new Date()));
}
function mondayOf(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  return result;
}
function addDays(date: Date, count: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}
function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function normalizeDay(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }
function toMinutes(value: string): number { const [hour = 0, minute = 0] = value.split(":").map(Number); return hour * 60 + minute; }
function toClock(value: number): string { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
</script>

<style scoped>
.agenda-grid { min-height: 400px; }
.hour-cell { min-width: 80px; background: rgb(var(--v-theme-surface)); }
.agenda-cell { min-width: 145px; vertical-align: top; }
.appointment-chip {
  display: flex; width: 100%; flex-direction: column; align-items: flex-start; gap: 2px;
  margin: 3px 0; padding: 6px 8px; border-radius: 6px; text-align: left;
  color: rgb(var(--v-theme-on-primary)); background: rgb(var(--v-theme-primary));
  font-size: .72rem; line-height: 1.25;
}
.appointment-chip:hover { opacity: .86; }
.appointment-chip span {
  display: flex;
  overflow: hidden; max-width: 100%; white-space: nowrap; text-overflow: ellipsis;
}
</style>
