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
        <v-btn icon="mdi-chevron-left" aria-label="Semana anterior" @click="moveWeek(-7)" />
        <v-btn variant="outlined" @click="goToToday">Hoy</v-btn>
        <v-btn icon="mdi-chevron-right" aria-label="Semana siguiente" @click="moveWeek(7)" />
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />

    <VCalendar
      ref="calendar"
      v-model="weekDate"
      type="week"
      locale="es"
      first-day-of-week="1"
      :events="calendarEvents"
      event-start="start"
      event-end="end"
      event-name="name"
      event-color="color"
      :interval-minutes="60"
      :interval-height="48"
      class="week-calendar"
    >
      <template #day-body="day">
        <div
          v-if="currentTimeLine(day.date, day.timeToY)"
          class="v-current-time"
          :style="currentTimeLine(day.date, day.timeToY)"
        />
      </template>
      <template #event="{ event }">
        <div class="event-content">
          <strong>{{ event.input.name }}</strong>
          <span v-if="event.input.tipo_evento === 'CITA'">{{ event.input.estado }}</span>
          <div v-if="!isCoordinator && !isAdministrator && event.input.tipo_evento === 'CITA' && event.input.id_reserva && ['Confirmada', 'AGENDADA', 'EN_ATENCION', 'REAGENDADA'].includes(event.input.estado)" class="event-actions">
            <v-btn
              size="x-small"
              color="success"
              variant="flat"
              prepend-icon="mdi-account-check"
              :loading="marking === event.input.id_reserva"
              :disabled="Boolean(marking)"
              @click.stop="markAttendance(event.input, 'ASISTIO')"
            >Asistió</v-btn>
            <v-btn
              size="x-small"
              color="error"
              variant="flat"
              prepend-icon="mdi-account-cancel"
              :loading="marking === event.input.id_reserva"
              :disabled="Boolean(marking)"
              @click.stop="markAttendance(event.input, 'NO_ASISTIO')"
            >No asistió</v-btn>
          </div>
        </div>
      </template>
    </VCalendar>
  </v-container>
</template>

<script setup lang="ts">
import { VCalendar } from "vuetify/components";
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole } from "~/utils/session";

// Vuetify 4.2.4 expone estas funciones en VCalendarDaily; `week` renderiza ese componente.
interface CalendarApi {
  times: { now: { date: string; time: string } };
  updateTimes: () => void;
  scrollToTime: (time: string) => boolean;
}
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
interface CalendarEvent extends AgendaEvent {
  name: string;
  start: string;
  end: string;
  color: string;
  id_reserva: string | null;
}
interface ProfessionalOption {
  id: string;
  name: string;
}

const { $service } = useNuxtApp();
const session = useUserSession();
const calendar = ref<CalendarApi | null>(null);
const weekDate = ref(localDate(mondayOf(new Date())));
const events = ref<AgendaEvent[]>([]);
const professionalOptions = ref<ProfessionalOption[]>([]);
const loading = ref(false);
const error = ref("");
const marking = ref("");
const selectedProfessional = ref<string | null>(null);
let clockTimer: ReturnType<typeof setInterval> | undefined;
let requestVersion = 0;
const isCoordinator = computed(() => sessionHasRole(session.roles.value, "coordinador"));
const isAdministrator = computed(() => sessionHasRole(session.roles.value, "administrador"));
const isResponsible = computed(() => sessionHasRole(session.roles.value, "responsable"));
const rangeLabel = computed(() => {
  const start = mondayOf(parseLocalDate(weekDate.value));
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
});
const calendarEvents = computed<CalendarEvent[]>(() => filteredEvents.value.map((event) => {
  const time = (value: string) => value.slice(0, 5);
  const isBlock = event.tipo_evento === "BLOQUE";
  const label = isBlock
    ? event.estado === "Ausencia"
      ? `Ausencia: ${event.motivo ?? "Sin motivo"}`
      : `${event.estado}: ${event.motivo ?? ""}`
    : `${time(event.hora_inicio)} · ${event.paciente ?? "Paciente"} · ${event.servicio ?? "Servicio"}`;
  const color = isBlock ? "warning" : event.estado === "Asistió" ? "success" : event.estado === "No asistió" ? "grey" : "primary";
  return {
    ...event,
    id_reserva: isBlock ? null : event.id.replace(/^reserva:/, ""),
    name: label,
    // VCalendar 4 parseTimestamp requiere "YYYY-MM-DD HH:mm" (espacio, sin zona).
    start: `${event.fecha} ${time(event.hora_inicio)}`,
    end: `${event.fecha} ${time(event.hora_fin)}`,
    color,
  };
}));
const filteredEvents = computed(() => {
  if (!selectedProfessional.value) return events.value;
  return events.value.filter((event) => isAdministrator.value
    ? event.id_responsable === selectedProfessional.value ||
      event.tipo_evento === "BLOQUE" && event.id_profesional === null && event.id_responsable === null
    : event.id_profesional === selectedProfessional.value ||
      event.tipo_evento === "BLOQUE" && event.id_profesional === null,
  );
});

watch([weekDate, selectedProfessional], () => void loadWeek());
onMounted(() => {
  void loadWeek();
  if (isResponsible.value || isAdministrator.value) void loadProfessionalOptions();
  clockTimer = setInterval(() => calendar.value?.updateTimes(), 60_000);
  void nextTick(() => {
    calendar.value?.updateTimes();
    if (isCurrentWeek()) calendar.value?.scrollToTime(calendar.value.times.now.time);
  });
});
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
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

async function markAttendance(event: CalendarEvent, status: "ASISTIO" | "NO_ASISTIO"): Promise<void> {
  if (!event.id_reserva) return;
  marking.value = event.id_reserva;
  error.value = "";
  try {
    await $service.graphql({
      query: $querys.staff.cambiarEstadoReserva,
      variables: { input: { id: event.id_reserva, estado_reserva: status } },
    });
    await loadWeek();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "No se pudo actualizar la asistencia.";
  } finally {
    marking.value = "";
  }
}

function currentTimeLine(date: string, timeToY: (time: string) => number): Record<string, string> | null {
  const now = calendar.value?.times.now;
  if (!now || now.date !== date) return null;
  const y = timeToY(now.time);
  return Number.isFinite(y) ? { top: `${y}px` } : null;
}
function moveWeek(offset: number): void {
  weekDate.value = localDate(addDays(parseLocalDate(weekDate.value), offset));
}
function goToToday(): void {
  weekDate.value = localDate(mondayOf(new Date()));
}
function isCurrentWeek(): boolean {
  return weekDate.value === localDate(mondayOf(new Date()));
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
</script>

<style scoped>
.week-calendar {
  min-height: 680px;
}

.event-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  padding: 4px 6px;
  font-size: 0.72rem;
  line-height: 1.25;
}

.event-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
}

.v-current-time {
  position: absolute;
  inset-inline: 0;
  z-index: 5;
  height: 2px;
  background: rgb(var(--v-theme-error));
  pointer-events: none;
}
</style>
