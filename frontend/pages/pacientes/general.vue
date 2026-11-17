<template>
  <v-container fluid class="pacientes-page">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">ATENCIÓN PROFESIONAL</div>
        <h1 class="text-h4">Pacientes general</h1>
      </div>
    </div>

    <v-alert v-if="!canView" type="warning" variant="tonal" class="mb-4">
      Esta vista está disponible para administración.
    </v-alert>
    <template v-else>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <CommonCrudTable
        tabla="expediente"
        titulo="Pacientes"
        :headers="headers"
        getrows=""
        :filters="filters"
        :inputs="patientInputs"
        :on-save="createPatient"
        :source-items="cases"
        :source-loading="loading"
        :source-reload="load"
        :acciones="false"
        @filters-change="appliedFilters = $event"
      >
        <template #source-toolbar>
          <v-btn v-if="pendingPatient" variant="tonal" color="primary" prepend-icon="mdi-calendar-plus" @click="openAppointment(pendingPatient)">
            Agendar primera cita de {{ patientName(pendingPatient) }}
          </v-btn>
        </template>
        <template #paciente="{ item }">{{ patientName(item) }}</template>
        <template #acciones="{ item }">
          <div class="d-flex flex-wrap ga-2">
            <v-btn size="small" variant="outlined" prepend-icon="mdi-eye" @click="openDetail(item)">
              Ver detalle
            </v-btn>
            <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-calendar-plus" @click="openAppointment(item)">
              Agendar cita
            </v-btn>
          </div>
        </template>
      </CommonCrudTable>
    </template>

    <v-dialog v-model="detailDialog" max-width="900">
      <v-card>
        <v-card-title>Detalle del paciente</v-card-title>
        <v-divider />
        <v-card-text>
          <v-progress-linear v-if="detailLoading" indeterminate color="primary" />
          <v-alert v-if="detailError" type="error" variant="tonal">{{ detailError }}</v-alert>
          <template v-if="detail">
            <v-list lines="two">
              <v-list-item v-for="dato in patientData" :key="dato.title" :title="dato.title" :subtitle="dato.value" />
            </v-list>
            <CommonCrudTable
              tabla="expediente"
              titulo="Servicios del paciente"
              :headers="detailHeaders"
              getrows=""
              :filters="[]"
              :inputs="[]"
              :source-items="detail.expedientes"
              :acciones="false"
            >
              <template #responsable="{ item }">{{ staffName(item.responsable) }}</template>
              <template #profesional="{ item }">{{ staffName(item.profesional) }}</template>
            </CommonCrudTable>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CommonDialogCrearEditar
      v-model="appointmentDialog"
      tabla="cita"
      titulo="Agendar cita"
      guardar-texto="Agendar"
      :datos="{}"
      :inputs="[]"
      :on-save="saveAppointment"
      :max-width="680"
      @reload-item="load"
    >
      <template #content>
        <v-progress-linear v-if="detailLoading" indeterminate color="primary" />
        <v-alert v-if="detailError" type="error" variant="tonal" class="mb-4">{{ detailError }}</v-alert>
        <ServicioSelect
          v-model="form.id_servicio"
          label="Servicio"
          :rules="[required]"
          required
        />
        <v-textarea
          v-model="form.motivo_consulta"
          label="Motivo de consulta"
          maxlength="500"
          rows="3"
          :readonly="Boolean(activeCase)"
          :hint="activeCase ? 'Se conserva el motivo del expediente activo de este servicio.' : undefined"
          :persistent-hint="Boolean(activeCase)"
          :rules="[required]"
          required
        />
        <v-text-field v-model="form.fecha" type="date" label="Fecha" :min="today" :rules="[required]" required />
        <div class="text-subtitle-2 mb-2">Horarios disponibles</div>
        <v-progress-linear v-if="slotsLoading" indeterminate color="primary" />
        <v-input
          :model-value="form.slot"
          :disabled="slotsLoading || !form.id_servicio || !form.fecha || detailLoading || !!detailError"
          :rules="[required]"
          hide-details="auto"
        >
          <template #default>
            <v-chip-group
              v-model="form.slot"
              :disabled="slotsLoading || !form.id_servicio || !form.fecha || detailLoading || !!detailError"
              color="primary"
              column
              aria-label="Seleccionar horario disponible"
            >
              <v-chip v-for="slot in slotOptions" :key="slot.value" :value="slot.value" variant="outlined" filter>
                {{ slot.title }}
              </v-chip>
            </v-chip-group>
          </template>
        </v-input>
        <v-alert v-if="slotsError" type="error" variant="tonal" class="mt-3">{{ slotsError }}</v-alert>
        <v-alert v-else-if="form.fecha && form.id_servicio && !slotsLoading && !slotOptions.length" type="info" variant="tonal" class="mt-3">
          No hay horarios disponibles para el servicio y la fecha seleccionados.
        </v-alert>
      </template>
    </CommonDialogCrearEditar>
  </v-container>
</template>

<script setup lang="ts">
import type { CrudRecord, Filters, Header, Inputs } from "~/interfaces/app/common";
import ServicioSelect from "~/components/common/Fields/ServicioSelect.vue";
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole, useUserSession } from "~/utils/session";

interface Person {
  nombres: string;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  nro_documento: string | null;
  complemento?: string | null;
  procedencia: string | null;
  edad?: number | null;
  movil?: string | null;
  telefono?: string | null;
  correo_personal?: string | null;
  genero?: { valor: string } | null;
  expedito?: { valor: string } | null;
}
interface PatientCase extends CrudRecord {
  id: string;
  codigo_caso: string;
  id_persona: string;
  persona: Person;
}
interface CaseDetail extends CrudRecord {
  id: string;
  codigo_caso: string;
  id_servicio: string;
  estado_caso: string;
  motivo_consulta: string;
  fecha_apertura: string;
  persona: Person;
  servicio: { servicio: string };
  responsable: Staff | null;
  profesional: Staff | null;
}
interface Staff { persona: Pick<Person, "nombres" | "primer_apellido" | "segundo_apellido"> }
interface Detail { persona: Person; expedientes: CaseDetail[]; fecha_ingreso: string | null }
interface Slot { hora_inicio: string; hora_fin: string; id_profesional: string }

const { $service } = useNuxtApp();
const session = useUserSession();
const canView = computed(() => sessionHasRole(session.roles.value, "administrador"));
const cases = ref<PatientCase[]>([]);
const pendingPatient = ref<PatientCase | null>(null);
const patientInputs: Inputs[] = [
  { field: "nombres", descripcion: "Nombres", type: "text", required: true, maxlength: 200 },
  { field: "primer_apellido", descripcion: "Primer apellido", type: "text", maxlength: 200 },
  { field: "segundo_apellido", descripcion: "Segundo apellido", type: "text", maxlength: 200 },
  { field: "nro_documento", descripcion: "Carnet de identidad", type: "text", required: true, maxlength: 50 },
  { field: "complemento", descripcion: "Complemento", type: "text", maxlength: 50 },
  { field: "id_expedito", descripcion: "Extensión", type: "extension" },
  { field: "edad", descripcion: "Edad", type: "number", required: true, integer: true, min: 0, max: 120 },
  { field: "id_genero", descripcion: "Género", type: "genero", required: true },
  { field: "correo_personal", descripcion: "Correo electrónico", type: "text", required: true, maxlength: 100 },
  { field: "movil", descripcion: "Celular", type: "text", maxlength: 50 },
  { field: "procedencia", descripcion: "Procedencia / Municipio", type: "text", maxlength: 200 },
  { field: "id_institucion_referencia", descripcion: "Institución de referencia", type: "referencia_institucional" },
];
const loading = ref(false);
const error = ref("");
const appliedFilters = ref<CrudRecord>({});
const headers: Header[] = [
  { title: "Código del caso", key: "codigo_caso" },
  { title: "Paciente", key: "paciente", crearColumna: true, sortable: false },
  { title: "CI", key: "persona.nro_documento" },
  { title: "Municipio", key: "persona.procedencia" },
  { title: "Acciones", key: "acciones", crearColumna: true, sortable: false },
];
const filters: Filters[] = [
  { field: "nombres", label: "Nombres", type: "text" },
  { field: "primer_apellido", label: "Primer apellido", type: "text" },
  { field: "nro_documento", label: "CI", type: "text" },
];
const detailHeaders: Header[] = [
  { title: "Caso", key: "codigo_caso" },
  { title: "Servicio", key: "servicio.servicio" },
  { title: "Responsable", key: "responsable", crearColumna: true, sortable: false },
  { title: "Profesional asignado", key: "profesional", crearColumna: true, sortable: false },
  { title: "Fecha de apertura", key: "fecha_apertura" },
  { title: "Motivo de consulta", key: "motivo_consulta" },
];
const detailDialog = ref(false);
const appointmentDialog = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const detail = ref<Detail | null>(null);
const selectedPerson = ref<string | null>(null);
const form = reactive({ id_servicio: null as string | null, motivo_consulta: "", fecha: "", slot: null as string | null });
const slots = ref<Slot[]>([]);
const slotsLoading = ref(false);
const slotsError = ref("");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
let listRequest = 0;
let detailRequest = 0;
let slotsRequest = 0;
const activeCase = computed(() => detail.value?.expedientes.find(item => item.id_servicio === form.id_servicio && item.estado_caso === "ACTIVO"));
const slotOptions = computed(() => {
  const options = new Map<string, { title: string; value: string }>();
  for (const slot of slots.value) {
    if (!options.has(slot.hora_inicio)) options.set(slot.hora_inicio, {
      title: slot.hora_inicio.slice(0, 5) + " - " + slot.hora_fin.slice(0, 5),
      value: slot.id_profesional + "|" + slot.hora_inicio,
    });
  }
  return [...options.values()];
});
const patientData = computed(() => {
  const person = detail.value?.persona;
  if (!person) return [];
  return [
    { title: "Nombre completo", value: fullName(person) },
    { title: "CI", value: [person.nro_documento, person.complemento, person.expedito?.valor].filter(Boolean).join(" ") },
    { title: "Edad", value: person.edad == null ? "" : String(person.edad) },
    { title: "Género", value: person.genero?.valor },
    { title: "Municipio", value: person.procedencia },
    { title: "Celular", value: person.movil },
    { title: "Teléfono", value: person.telefono },
    { title: "Correo", value: person.correo_personal },
    { title: "Fecha de ingreso", value: detail.value?.fecha_ingreso ?? "Sin atención registrada" },
  ].map(item => ({ title: item.title, value: item.value || "No registrado" }));
});
function fullName(person: Pick<Person, "nombres" | "primer_apellido" | "segundo_apellido">): string {
  return [person.nombres, person.primer_apellido, person.segundo_apellido].filter(Boolean).join(" ");
}
function patientName(row: CrudRecord): string {
  return fullName((row as PatientCase).persona);
}
function staffName(value: unknown): string {
  return value && typeof value === "object" && "persona" in value
    ? fullName((value as Staff).persona) : "Sin responsable registrado";
}
function required(value: unknown): true | string {
  return (typeof value === "string" && !!value.trim()) || "Complete este campo";
}
async function createPatient(data: CrudRecord): Promise<void> {
  const email = typeof data.correo_personal === "string" ? data.correo_personal.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingrese un correo electrónico válido");
  const input = Object.fromEntries(patientInputs.map(field => {
    const value = data[field.field];
    return [field.field, typeof value === "string" ? value.trim() || null : value ?? null];
  }));
  const result = await $service.graphql<{ createPaciente: { id: string } & Person }>({
    query: $querys.staff.crearPaciente,
    variables: { input },
  });
  const persona = result.createPaciente;
  pendingPatient.value = { id: persona.id, id_persona: persona.id, codigo_caso: "", persona };
  openAppointment(pendingPatient.value);
}
async function load(): Promise<void> {
  const request = ++listRequest;
  if (!canView.value) { cases.value = []; return; }
  loading.value = true;
  error.value = "";
  try {
    const rows: PatientCase[] = [];
    let pagina = 1;
    let count = 0;
    do {
      const result = await $service.graphql<{ pacientesAdministracionPage: { rows: PatientCase[]; count: number } }>({
        query: $querys.staff.pacientesGeneral,
        variables: { pagina, search: { ...appliedFilters.value } },
      });
      if (request !== listRequest) return;
      const page = result.pacientesAdministracionPage;
      rows.push(...page.rows);
      count = page.count;
      if (!page.rows.length) break;
      pagina++;
    } while (rows.length < count);
    cases.value = rows;
  } catch (cause) {
    if (request === listRequest) error.value = cause instanceof Error ? cause.message : "No se pudieron cargar los pacientes";
  } finally {
    if (request === listRequest) loading.value = false;
  }
}
async function loadDetail(row: CrudRecord): Promise<void> {
  const request = ++detailRequest;
  selectedPerson.value = typeof row.id_persona === "string" ? row.id_persona : null;
  detail.value = null;
  detailError.value = "";
  detailLoading.value = true;
  try {
    if (!selectedPerson.value) throw new Error("No se pudo identificar al paciente");
    const result = await $service.graphql<{ detallePacienteGeneral: Detail }>({
      query: $querys.staff.detallePacienteGeneral,
      variables: { id_persona: selectedPerson.value },
    });
    if (request === detailRequest) detail.value = result.detallePacienteGeneral;
  } catch (cause) {
    if (request === detailRequest) detailError.value = cause instanceof Error ? cause.message : "No se pudo cargar el detalle";
  } finally {
    if (request === detailRequest) detailLoading.value = false;
  }
}
function openDetail(row: CrudRecord): void {
  detailDialog.value = true;
  void loadDetail(row);
}
function openAppointment(row: CrudRecord): void {
  Object.assign(form, { id_servicio: null, motivo_consulta: "", fecha: "", slot: null });
  slots.value = [];
  slotsError.value = "";
  appointmentDialog.value = true;
  void loadDetail(row);
}
async function loadSlots(): Promise<void> {
  const request = ++slotsRequest;
  form.slot = null;
  slots.value = [];
  slotsError.value = "";
  slotsLoading.value = false;
  if (!appointmentDialog.value || !form.id_servicio || !form.fecha || !selectedPerson.value || detailLoading.value || detailError.value) return;
  slotsLoading.value = true;
  try {
    const result = await $service.graphql<{ horariosDisponibles: Slot[] }>({
      query: $querys.publicas.horariosDisponibles,
      variables: { id: form.id_servicio, fecha: form.fecha, id_persona: selectedPerson.value },
    });
    if (request === slotsRequest) slots.value = result.horariosDisponibles;
  } catch (cause) {
    if (request === slotsRequest) slotsError.value = cause instanceof Error ? cause.message : "No se pudieron cargar los horarios";
  } finally {
    if (request === slotsRequest) slotsLoading.value = false;
  }
}
async function saveAppointment(): Promise<void> {
  const slot = slots.value.find(item => item.id_profesional + "|" + item.hora_inicio === form.slot);
  if (!selectedPerson.value || !form.id_servicio || !form.fecha || !form.motivo_consulta.trim() || !slot || slotsLoading.value || detailLoading.value || detailError.value) {
    throw new Error("Complete el servicio, motivo, fecha y hora disponible");
  }
  try {
    await $service.graphql({
      query: $querys.staff.agendarCitaPacienteGeneral,
      variables: { input: {
        id_persona: selectedPerson.value,
        id_servicio: form.id_servicio,
        motivo_consulta: form.motivo_consulta.trim(),
        fecha: form.fecha,
        hora_inicio: slot.hora_inicio,
        id_profesional: slot.id_profesional,
      } },
    });
    if (pendingPatient.value?.id_persona === selectedPerson.value) pendingPatient.value = null;
  } catch (cause) {
    await loadSlots();
    throw cause;
  }
}
watch([() => form.id_servicio, activeCase], () => {
  form.motivo_consulta = activeCase.value?.motivo_consulta ?? "";
});
watch([() => form.id_servicio, () => form.fecha, selectedPerson, detailLoading, appointmentDialog], () => { void loadSlots(); });
watch(appliedFilters, () => { void load(); }, { deep: true });
watch(canView, () => { void load(); });
onMounted(() => { void load(); });
</script>

<style scoped>
.pacientes-page {
  min-width: 0;
}
</style>
