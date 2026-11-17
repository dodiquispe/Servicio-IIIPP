<template>
  <v-container fluid>
    <v-alert v-if="!canView" type="warning" variant="tonal" class="mb-4">Esta vista está disponible para administración.</v-alert>
    <template v-else>
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
        <div>
          <div class="text-overline text-primary">AGENDA</div>
          <h1 class="text-h4">Agenda de responsables</h1>
          <div class="text-body-2 text-medium-emphasis">{{ rangeLabel }}</div>
        </div>
        <div class="d-flex align-center ga-2">
          <v-btn icon="mdi-chevron-left" aria-label="Semana anterior" @click="moveWeek(-7)" />
          <v-btn variant="outlined" @click="weekDate = today">Hoy</v-btn>
          <v-btn icon="mdi-chevron-right" aria-label="Semana siguiente" @click="moveWeek(7)" />
          <v-btn icon="mdi-refresh" aria-label="Actualizar agenda" :loading="loading" @click="loadWeek" />
        </div>
      </div>
      <v-row class="mb-2">
        <v-col cols="12">
          <v-select
            :model-value="selectedOption"
            :items="agendaOptions"
            item-title="label"
            item-value="key"
            return-object
            label="Responsable — Servicio"
            :loading="optionsLoading"
            :disabled="optionsLoading || !agendaOptions.length"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="selectAgenda"
          >
            <template #selection><span class="v-select__selection-text">{{ selectedOption?.label }}</span></template>
          </v-select>
          <div class="text-caption text-medium-emphasis mt-1" aria-live="polite">
            Agenda: {{ selectedOption?.label || (optionsLoading ? 'Cargando responsables…' : 'Sin asignaciones vigentes') }}
          </div>
        </v-col>
      </v-row>
      <div class="d-flex flex-wrap ga-3 mb-3">
        <v-chip color="primary" size="small" variant="tonal">Sesión / cita de paciente</v-chip>
        <v-chip color="warning" size="small" variant="tonal">Reunión / otro evento</v-chip>
      </div>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />
      <VCalendar
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
      >
        <template #event="{ event }">
          <button type="button" class="w-100 h-100 text-start px-1" :aria-label="event.input.name" @click.stop="openEvent(event.input)">
            {{ event.input.name }}
            <v-tooltip activator="parent">{{ event.input.name }} · {{ event.input.estado }}</v-tooltip>
          </button>
        </template>
      </VCalendar>
    </template>

    <v-dialog v-model="detailDialog" max-width="720">
      <v-card v-if="selectedEvent">
        <v-card-title>{{ selectedEvent.tipo_evento === 'CITA' ? 'Detalle de la sesión / cita' : 'Detalle del evento' }}</v-card-title>
        <v-divider />
        <v-card-text>
          <v-progress-linear v-if="detailLoading" indeterminate color="primary" />
          <v-alert v-if="detailError" type="error" variant="tonal" class="mb-3">{{ detailError }}</v-alert>
          <v-list lines="two">
            <v-list-item title="Fecha" :subtitle="selectedEvent.fecha" />
            <v-list-item title="Horario" :subtitle="selectedEvent.hora_inicio.slice(0, 5) + ' - ' + selectedEvent.hora_fin.slice(0, 5)" />
            <v-list-item title="Responsable" :subtitle="selectedEvent.responsable || 'No registrado'" />
            <v-list-item title="Servicio" :subtitle="selectedEvent.servicio || 'Todos los servicios'" />
            <template v-if="selectedEvent.tipo_evento === 'CITA'">
              <v-list-item title="Paciente" :subtitle="selectedEvent.paciente || 'No registrado'" />
              <v-list-item title="Caso" :subtitle="selectedEvent.codigo_caso || 'No registrado'" />
              <v-list-item title="Profesional" :subtitle="selectedEvent.profesional || 'No registrado'" />
              <template v-if="booking">
                <v-list-item title="CI" :subtitle="booking.expediente.persona.nro_documento || 'No registrado'" />
                <v-list-item title="Celular" :subtitle="booking.expediente.persona.movil || 'No registrado'" />
                <v-list-item title="Motivo de consulta" :subtitle="booking.expediente.motivo_consulta || 'No registrado'" />
                <v-list-item title="Asistencia" :subtitle="attendanceLabel(booking.estado_reserva)" />
              </template>
            </template>
            <template v-else>
              <v-list-item title="Tipo" :subtitle="selectedEvent.estado" />
              <v-list-item title="Motivo" :subtitle="selectedEvent.motivo || 'No registrado'" />
            </template>
          </v-list>
          <v-form v-if="rebooking && booking" @submit.prevent="saveRebooking">
            <v-divider class="my-3" />
            <v-text-field v-model="rebook.motivo" label="Motivo del reagendamiento" maxlength="300" :rules="[required]" required />
            <v-text-field v-model="rebook.fecha" type="date" label="Nueva fecha" :min="today" :rules="[required]" required />
            <v-select
              v-model="rebook.hora"
              :items="slots"
              item-title="hora_inicio"
              item-value="hora_inicio"
              label="Horario disponible"
              :loading="slotsLoading"
              :disabled="slotsLoading || !rebook.fecha"
              :rules="[required]"
              clearable
              required
            />
            <v-alert v-if="rebookError" type="error" variant="tonal" class="mb-3">{{ rebookError }}</v-alert>
            <v-btn type="submit" color="primary" :loading="saving" :disabled="slotsLoading || !rebook.hora || !rebook.motivo.trim()">Confirmar reagendamiento</v-btn>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn v-if="booking?.estado_reserva === 'NO_ASISTIO' && !rebooking" color="primary" variant="tonal" prepend-icon="mdi-calendar-refresh" @click="rebooking = true">Reagendar</v-btn>
          <v-btn variant="text" :disabled="saving" @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { VCalendar } from "vuetify/components";
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole, useUserSession } from "~/utils/session";

interface AgendaEvent {
  id: string; tipo_evento: "CITA" | "BLOQUE"; fecha: string;
  hora_inicio: string; hora_fin: string;
  id_responsable: string | null; responsable: string | null;
  id_servicio: string | null; servicio: string | null;
  id_profesional: string | null; profesional: string | null;
  codigo_caso: string | null; paciente: string | null; estado: string; motivo: string | null;
}
interface Booking {
  id: string; id_servicio: string; id_profesional: string;
  fecha: string; hora_inicio: string; estado_reserva: string;
  expediente: { id_persona: string; motivo_consulta: string; persona: { nro_documento: string | null; movil: string | null } };
}
interface Slot { hora_inicio: string; hora_fin: string; id_profesional: string }
const { $service } = useNuxtApp();
const session = useUserSession();
const canView = computed(() => sessionHasRole(session.roles.value, "administrador"));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const weekDate = ref(today);
interface AgendaOption { key: string; label: string; id_responsable: string; id_servicio: string }
interface Assignment {
  id_usuario: string; id_servicio: string; id_estado: number; vigencia: string;
  rol: { descripcion: string; id_estado: number } | null;
  servicio: { servicio: string; id_estado: number };
  usuario: { id_estado: number; persona: { nombres: string; primer_apellido: string | null; segundo_apellido: string | null } };
}
const agendaOptions = ref<AgendaOption[]>([]);
const selectedOption = ref<AgendaOption | null>(null);
const optionsLoading = ref(false);
function selectAgenda(value: unknown): void {
  const key = typeof value === "string" ? value : value && typeof value === "object" && "key" in value ? value.key : null;
  const option = agendaOptions.value.find(item => item.key === key);
  if (option) selectedOption.value = option;
}
const events = ref<AgendaEvent[]>([]);
const loading = ref(false);
const error = ref("");
const selectedEvent = ref<AgendaEvent | null>(null);
const detailDialog = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const booking = ref<Booking | null>(null);
const rebooking = ref(false);
const rebook = reactive({ motivo: "", fecha: "", hora: null as string | null });
const slots = ref<Slot[]>([]);
const slotsLoading = ref(false);
const rebookError = ref("");
const saving = ref(false);
let weekRequest = 0;
let detailRequest = 0;
let slotRequest = 0;
const weekStart = computed(() => {
  const date = parseDate(weekDate.value);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
});
const weekEnd = computed(() => addDays(weekStart.value, 6));
const rangeLabel = computed(() => weekStart.value + " – " + weekEnd.value);
const calendarEvents = computed(() => events.value.map(event => ({
  ...event,
  name: event.tipo_evento === "CITA"
    ? event.hora_inicio.slice(0, 5) + " · " + (event.paciente || "Paciente") + " · " + (event.servicio || "Servicio")
    : (event.motivo || event.estado || "Otro evento"),
  start: event.fecha + " " + event.hora_inicio.slice(0, 5),
  end: event.fecha + " " + event.hora_fin.slice(0, 5),
  color: event.tipo_evento === "CITA" ? "primary" : "warning",
})));
function parseDate(value: string): Date { return new Date(value + "T00:00:00Z"); }
function addDays(value: string, count: number): string {
  const date = parseDate(value); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10);
}
function moveWeek(count: number): void { weekDate.value = addDays(weekDate.value, count); }
function required(value: unknown): true | string { return typeof value === "string" && !!value.trim() || "Complete este campo"; }
function attendanceLabel(status: string): string {
  const labels: Record<string, string> = { ASISTIO: "Asistió", NO_ASISTIO: "No asistió", CONFIRMADA: "Pendiente de asistencia", RESERVADA: "Pendiente de confirmación", CANCELADA: "Cancelada", PENDIENTE_PAGO: "Pendiente de pago" };
  return labels[status] || status;
}
async function loadWeek(): Promise<void> {
  const request = ++weekRequest;
  if (!canView.value || !selectedOption.value) { events.value = []; loading.value = false; return; }
  loading.value = true; error.value = "";
  const search = { fecha_inicial: weekStart.value, fecha_final: weekEnd.value, id_responsable: selectedOption.value.id_responsable, id_servicio: selectedOption.value.id_servicio };
  try {
    const rows: AgendaEvent[] = [];
    let pagina = 1; let count = 0;
    do {
      const result = await $service.graphql<{ agendaResponsables: { rows: AgendaEvent[]; count: number } }>({
        query: $querys.queryWithVar("agendaResponsable", "id tipo_evento fecha hora_inicio hora_fin id_responsable responsable id_servicio servicio id_profesional profesional codigo_caso paciente estado motivo"),
        variables: { limit: 100, pagina, search, order: { columna: "fecha", order: "asc" } },
      });
      if (request !== weekRequest) return;
      rows.push(...result.agendaResponsables.rows); count = result.agendaResponsables.count;
      if (!result.agendaResponsables.rows.length) break;
      pagina++;
    } while (rows.length < count);
    events.value = rows;
  } catch (cause) {
    if (request === weekRequest) { events.value = []; error.value = cause instanceof Error ? cause.message : "No se pudo cargar la agenda"; }
  } finally { if (request === weekRequest) loading.value = false; }
}
async function loadResponsables(): Promise<void> {
  if (!canView.value) { agendaOptions.value = []; selectedOption.value = null; return; }
  optionsLoading.value = true;
  error.value = "";
  try {
    const result = await $service.graphql<{ servicioPersonal: Assignment[] }>({ query: $querys.staff.responsablesServicioAgenda });
    const options = new Map<string, AgendaOption>();
    for (const assignment of result.servicioPersonal) {
      const role = assignment.rol?.descripcion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? "";
      if (assignment.id_estado !== 1 || assignment.vigencia !== "Vigente" || assignment.rol?.id_estado !== 1 || !role.includes("responsable") || assignment.usuario.id_estado !== 1 || assignment.servicio.id_estado !== 1) continue;
      const person = assignment.usuario.persona;
      const name = [person.nombres, person.primer_apellido, person.segundo_apellido].filter(Boolean).join(" ");
      const key = assignment.id_usuario + "|" + assignment.id_servicio;
      options.set(key, { key, label: name + " — " + assignment.servicio.servicio, id_responsable: assignment.id_usuario, id_servicio: assignment.id_servicio });
    }
    agendaOptions.value = [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
    selectedOption.value = agendaOptions.value[0] ?? null;
    if (!selectedOption.value) events.value = [];
  } catch (cause) {
    agendaOptions.value = []; selectedOption.value = null; events.value = [];
    error.value = cause instanceof Error ? cause.message : "No se pudieron cargar los responsables y servicios";
  } finally { optionsLoading.value = false; }
}
async function openEvent(event: AgendaEvent): Promise<void> {
  const request = ++detailRequest;
  selectedEvent.value = event; booking.value = null;
  detailDialog.value = true; detailError.value = ""; rebooking.value = false;
  Object.assign(rebook, { motivo: "", fecha: "", hora: null });
  if (event.tipo_evento !== "CITA") { detailLoading.value = false; return; }
  detailLoading.value = true;
  try {
    const result = await $service.graphql<{ reservas: Booking[] }>({ query: $querys.staff.reservasDetalleAgenda, variables: { desde: event.fecha, hasta: event.fecha } });
    if (request !== detailRequest) return;
    booking.value = result.reservas.find(item => item.id === event.id.replace(/^reserva:/, "")) ?? null;
    if (!booking.value) detailError.value = "La reserva ya no está disponible; actualice la agenda";
  } catch (cause) {
    if (request === detailRequest) detailError.value = cause instanceof Error ? cause.message : "No se pudo cargar la cita";
  } finally { if (request === detailRequest) detailLoading.value = false; }
}
async function loadSlots(): Promise<void> {
  const request = ++slotRequest;
  slots.value = []; rebook.hora = null; rebookError.value = ""; slotsLoading.value = false;
  if (!booking.value || !rebook.fecha || !detailDialog.value || !rebooking.value) return;
  slotsLoading.value = true;
  const professional = booking.value.id_profesional;
  try {
    const result = await $service.graphql<{ horariosDisponibles: Slot[] }>({
      query: $querys.publicas.horariosDisponibles,
      variables: { id: booking.value.id_servicio, fecha: rebook.fecha, id_persona: booking.value.expediente.id_persona },
    });
    if (request === slotRequest) {
      slots.value = result.horariosDisponibles.filter(item => item.id_profesional === professional);
      if (!slots.value.length) rebookError.value = "No hay horarios disponibles para el profesional y la fecha seleccionados";
    }
  } catch (cause) {
    if (request === slotRequest) rebookError.value = cause instanceof Error ? cause.message : "No se pudieron cargar los horarios";
  } finally { if (request === slotRequest) slotsLoading.value = false; }
}
async function saveRebooking(): Promise<void> {
  if (saving.value || !booking.value || !session.usuario.value?.id || !rebook.motivo.trim() || !rebook.fecha || !slots.value.some(slot => slot.hora_inicio === rebook.hora)) return;
  saving.value = true; rebookError.value = "";
  try {
    await $service.graphql({
      query: $querys.staff.crearReagendamiento,
      variables: { input: {
        id_reserva: booking.value.id, motivo: rebook.motivo.trim(),
        solicitado_por: session.usuario.value.id, autorizado_por: session.usuario.value.id,
        resultado: "AUTORIZADO", fecha_anterior: booking.value.fecha, hora_anterior: booking.value.hora_inicio,
        fecha_nueva: rebook.fecha, hora_nueva: rebook.hora,
      } },
    });
    detailDialog.value = false; useMessage().success("Cita reagendada"); await loadWeek();
  } catch (cause) {
    await loadSlots();
    rebookError.value = cause instanceof Error ? cause.message : "No se pudo reagendar la cita";
  } finally { saving.value = false; }
}
watch([weekStart, selectedOption, canView], () => { void loadWeek(); });
watch([() => rebook.fecha, rebooking, detailDialog], () => { void loadSlots(); });
watch(canView, () => { void loadResponsables(); });
onMounted(() => { void loadResponsables(); });
</script>
