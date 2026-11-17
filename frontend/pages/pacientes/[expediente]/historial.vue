<template>
  <v-container class="history-page" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">ATENCIÓN PROFESIONAL</div>
        <h1 class="text-h4">Historial del paciente</h1>
        <div v-if="expediente" class="text-body-2 text-medium-emphasis">Expediente {{ expediente.codigo_caso }}</div>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn v-if="canRegister" color="primary" prepend-icon="mdi-plus" @click="openSessionDialog">
          Registrar sesión
        </v-btn>
        <v-btn v-if="canClose" color="warning" prepend-icon="mdi-folder-lock-outline" @click="closeDialog = true">
          Cerrar caso
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-arrow-left" to="/pacientes/pacientes">Mis pacientes</v-btn>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <template v-if="expediente">
      <v-row>
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="h-100">
            <v-card-title>Datos del paciente</v-card-title><v-divider />
            <v-list lines="two">
              <v-list-item title="Nombre completo" :subtitle="patientName" />
              <v-list-item title="Carnet de identidad" :subtitle="expediente.persona.nro_documento || 'No registrado'" />
              <v-list-item title="Celular" :subtitle="expediente.persona.movil || 'No registrado'" />
              <v-list-item title="Correo" :subtitle="expediente.persona.correo_personal || 'No registrado'" />
              <v-list-item title="Servicio" :subtitle="expediente.servicio.servicio" />
              <v-list-item title="Psicólogo responsable" :subtitle="staffName(expediente.responsable) || 'Sin responsable vigente'" />
              <v-list-item title="Practicante asignado" :subtitle="staffName(expediente.profesional) || 'Sin asignar'" />
            </v-list>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="h-100">
            <v-card-title>Datos del expediente</v-card-title><v-divider />
            <v-list lines="two">
              <v-list-item title="Código del caso" :subtitle="expediente.codigo_caso" />
              <v-list-item title="Motivo de consulta" :subtitle="expediente.motivo_consulta || 'No registrado'" />
              <v-list-item title="Fecha de apertura" :subtitle="formatDate(expediente.fecha_apertura)" />
              <v-list-item title="Estado" :subtitle="expediente.estado_actual?.descripcion || stateLabel(expediente.estado_caso)" />
              <v-list-item v-if="expediente.fecha_cierre" title="Fecha de cierre" :subtitle="formatDate(expediente.fecha_cierre)" />
              <v-list-item v-if="expediente.conclusion_diagnostico" title="Conclusión o diagnóstico" :subtitle="expediente.conclusion_diagnostico" />
              <v-list-item v-if="expediente.derivaciones" title="Derivaciones" :subtitle="expediente.derivaciones" />
            </v-list>
          </v-card>
        </v-col>
      </v-row>

      <v-card variant="outlined" class="mt-5">
        <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
          <span>Sesiones anteriores</span>
          <v-chip size="small" color="primary" variant="tonal">{{ sessions.length }} sesiones</v-chip>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="sessions.length" class="pa-4">
          <v-timeline density="compact" side="end">
            <v-timeline-item v-for="item in sessions" :key="item.id" dot-color="primary" size="small">
              <v-card variant="tonal" color="surface-variant">
                <v-card-title class="text-subtitle-1">Sesión {{ item.numero_correlativo }} · {{ formatDate(item.fecha_sesion) }}</v-card-title>
                <v-card-text>
                  <div class="text-subtitle-2 mb-1">{{ item.tipo_atencion?.valor || 'Atención' }}</div>
                  <div class="session-text">{{ item.accion_realizada }}</div>
                  <div v-if="item.observaciones" class="text-medium-emphasis mt-2">{{ item.observaciones }}</div>
                  <div v-if="registrarName(item)" class="text-caption mt-2">Registrada por: {{ registrarName(item) }}</div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
        <v-card-text v-else class="text-medium-emphasis">Todavía no hay sesiones registradas para este expediente.</v-card-text>
      </v-card>
    </template>

    <CommonDialogCrearEditar
      v-model="sessionDialog"
      tabla="sesión"
      titulo="Registrar sesión de seguimiento"
      guardar-texto="Guardar sesión"
      :datos="{}"
      :inputs="[]"
      :on-save="saveSession"
      :max-width="680"
      @reload-item="loadSessions"
    >
      <template #content>
        <v-text-field v-model="sessionForm.fecha_sesion" type="date" label="Fecha de la sesión" :rules="[requiredRule('Seleccione la fecha de la sesión')]" required />
        <v-select
          v-model="sessionForm.id_tipo_atencion"
          :items="attentionTypes"
          item-title="valor"
          item-value="id"
          label="Tipo de atención"
          :loading="loadingTypes"
          :rules="[requiredRule('Seleccione el tipo de atención')]"
          required
        />
        <v-textarea
          v-model="sessionForm.accion_realizada"
          label="Acción realizada"
          maxlength="10000"
          rows="4"
          :rules="[requiredRule('Ingrese la acción realizada')]"
          required
        />
        <v-textarea v-model="sessionForm.observaciones" label="Observaciones (opcional)" maxlength="10000" rows="3" />
        <div class="text-caption text-medium-emphasis">La fecha se toma de la reserva y el número de sesión se asigna automáticamente al guardar.</div>
      </template>
    </CommonDialogCrearEditar>

    <v-dialog v-model="closeDialog" max-width="600">
      <v-card>
        <v-card-title>Cerrar expediente</v-card-title>
        <v-card-text>
          <v-select v-model="closeForm.id_estado_caso" :items="closingStates" :item-props="stateOptionProps" item-title="descripcion" item-value="id" label="Estado actual del caso" :rules="[requiredRule('Seleccione el estado del caso')]" />
          <v-textarea v-model="closeForm.conclusion_diagnostico" label="Conclusión o diagnóstico" maxlength="10000" rows="3" />
          <v-textarea v-model="closeForm.derivaciones" label="Derivaciones (opcional)" maxlength="10000" rows="3" />
          <v-alert v-if="closeError" type="error" variant="tonal">{{ closeError }}</v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" :disabled="savingClose" @click="closeDialog = false">Cancelar</v-btn>
          <v-btn color="warning" :loading="savingClose" :disabled="!closeForm.id_estado_caso || !closeForm.conclusion_diagnostico.trim()" @click="closeCase">Cerrar caso</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole, useUserSession } from "~/utils/session";

interface PersonInfo { nombres: string; primer_apellido: string | null; segundo_apellido: string | null; nro_documento: string | null; movil: string | null; correo_personal: string | null; }
interface StaffInfo { id: string; persona: Pick<PersonInfo, "nombres" | "primer_apellido" | "segundo_apellido">; }
interface CaseInfo {
  id: string; id_profesional: string; id_servicio: string; codigo_caso: string; motivo_consulta: string;
  fecha_apertura: string; fecha_cierre: string | null; estado_caso: string; id_estado_caso: number | null;
  conclusion_diagnostico: string | null; derivaciones: string | null;
  estado_actual: { id: number; descripcion: string; tipo: string | null } | null;
  persona: PersonInfo; servicio: { servicio: string }; responsable: StaffInfo | null; profesional: StaffInfo | null;
}
interface SessionInfo {
  id: string; numero_correlativo: number; fecha_sesion: string; accion_realizada: string;
  observaciones: string | null; tipo_atencion: { id: number; valor: string } | null;
  nombre_registrado_por: string | null;
  registrado_por?: { persona: Pick<PersonInfo, "nombres" | "primer_apellido" | "segundo_apellido"> };
}
interface CatalogOption { id: number; valor: string; id_estado: number; }
interface CaseState { id: number; descripcion: string; tipo: string | null; id_estado: number; }

const route = useRoute();
const { $service } = useNuxtApp();
const session = useUserSession();
const expediente = ref<CaseInfo | null>(null);
const sessions = ref<SessionInfo[]>([]);
const attentionTypes = ref<CatalogOption[]>([]);
const closingStates = ref<CaseState[]>([]);
const loading = ref(false);
const loadingTypes = ref(false);
const error = ref("");
const sessionDialog = ref(false);
const sessionForm = reactive({ fecha_sesion: new Date().toISOString().slice(0, 10), id_tipo_atencion: null as number | null, accion_realizada: "", observaciones: "" });
const closeDialog = ref(false);
const closeError = ref("");
const savingClose = ref(false);
const closeForm = reactive({ id_estado_caso: null as number | null, conclusion_diagnostico: "", derivaciones: "" });
const caseId = computed(() => Array.isArray(route.params.expediente) ? route.params.expediente[0] || "" : route.params.expediente || "");
const patientName = computed(() => expediente.value ? [expediente.value.persona.nombres, expediente.value.persona.primer_apellido, expediente.value.persona.segundo_apellido].filter(Boolean).join(" ") : "");
const canClose = computed(() => sessionHasRole(session.roles.value, "responsable") && isActiveCase(expediente.value));
const canRegister = computed(() => {
  const active = isActiveCase(expediente.value);
  const practitionerOwnsCase = sessionHasRole(session.roles.value, "practicante") && Boolean(expediente.value);
  const responsibleOwnsService = sessionHasRole(session.roles.value, "responsable");
  return active && (practitionerOwnsCase || responsibleOwnsService);
});

onMounted(() => { void loadCase(); void loadAttentionTypes(); void loadClosingStates(); });

async function loadCase(): Promise<void> {
  if (!caseId.value) { error.value = "No se indicó un expediente."; return; }
  loading.value = true; error.value = "";
  try {
    const result = await $service.graphql<{ expediente: CaseInfo }>({
      query: `query ExpedienteHistorial($id: String!) {
        expediente(id: $id) {
          id id_profesional id_servicio codigo_caso motivo_consulta fecha_apertura fecha_cierre estado_caso id_estado_caso
          conclusion_diagnostico derivaciones
          estado_actual { id descripcion tipo }
          persona { nombres primer_apellido segundo_apellido nro_documento movil correo_personal }
          servicio { servicio }
          responsable { id persona { nombres primer_apellido segundo_apellido } }
          profesional { id persona { nombres primer_apellido segundo_apellido } }
        }
      }`,
      variables: { id: caseId.value },
    });
    expediente.value = result.expediente;
    await loadSessions();
  } catch (cause) { error.value = cause instanceof Error ? cause.message : "No se pudo cargar el expediente."; }
  finally { loading.value = false; }
}

async function loadSessions(): Promise<void> {
  if (!caseId.value) return;
  const result = await $service.graphql<{ sesiones: SessionInfo[] }>({ query: $querys.staff.sesionesExpediente, variables: { id: caseId.value } });
  sessions.value = result.sesiones.toSorted((a, b) => a.numero_correlativo - b.numero_correlativo);
}

async function loadAttentionTypes(): Promise<void> {
  loadingTypes.value = true;
  try {
    const result = await $service.graphql<{ parametrosByTipo: CatalogOption[] }>({ query: $querys.staff.parametrosPorTipo, variables: { tipo: "tipo_atencion" } });
    attentionTypes.value = result.parametrosByTipo.filter((item) => [1, 2].includes(item.id_estado));
  } catch (cause) { error.value = cause instanceof Error ? cause.message : "No se pudo cargar el catálogo de atención."; }
  finally { loadingTypes.value = false; }
}

async function loadClosingStates(): Promise<void> {
  if (!sessionHasRole(session.roles.value, "responsable")) return;
  try {
    const result = await $service.graphql<{ estado: CaseState[] }>({ query: `query EstadosCierre { estado { id descripcion tipo id_estado } }` });
    closingStates.value = result.estado.filter((item) => item.id_estado === 1 && normalizeStateType(item.tipo) === "seguimiento");
  } catch (cause) { error.value = cause instanceof Error ? cause.message : "No se pudo cargar el catálogo de cierre."; }
}

function openSessionDialog(): void {
  Object.assign(sessionForm, { fecha_sesion: new Date().toISOString().slice(0, 10), id_tipo_atencion: null, accion_realizada: "", observaciones: "" });
  sessionDialog.value = true;
}

async function saveSession(): Promise<void> {
  if (!expediente.value || !sessionForm.fecha_sesion || !sessionForm.id_tipo_atencion || !sessionForm.accion_realizada.trim()) throw new Error("Complete la fecha, el tipo de atención y la acción realizada.");
  const result = await $service.graphql<{ createSesion: SessionInfo }>({
    query: $querys.staff.crearSesion,
    variables: { input: {
      id_expediente: expediente.value.id,
      fecha_sesion: sessionForm.fecha_sesion,
      id_tipo_atencion: sessionForm.id_tipo_atencion,
      id_reserva: typeof route.query.id_reserva === "string" ? route.query.id_reserva : undefined,
      accion_realizada: sessionForm.accion_realizada.trim(),
      observaciones: sessionForm.observaciones.trim() || null,
    } },
  });
  sessions.value = [...sessions.value, result.createSesion].toSorted((a, b) => a.numero_correlativo - b.numero_correlativo);
  Object.assign(sessionForm, { fecha_sesion: new Date().toISOString().slice(0, 10), id_tipo_atencion: null, accion_realizada: "", observaciones: "" });
}

async function closeCase(): Promise<void> {
  if (!expediente.value || !closeForm.id_estado_caso || !closeForm.conclusion_diagnostico.trim()) return;
  savingClose.value = true; closeError.value = "";
  try {
    const result = await $service.graphql<{ cerrarExpediente: Pick<CaseInfo, "estado_caso" | "id_estado_caso" | "estado_actual" | "conclusion_diagnostico" | "derivaciones" | "fecha_cierre"> }>({
      query: $querys.staff.cerrarExpediente,
      variables: { input: { id: expediente.value.id, id_estado_caso: closeForm.id_estado_caso, conclusion_diagnostico: closeForm.conclusion_diagnostico.trim(), derivaciones: closeForm.derivaciones.trim() || null } },
    });
    Object.assign(expediente.value, result.cerrarExpediente);
    closeDialog.value = false;
  } catch (cause) { closeError.value = cause instanceof Error ? cause.message : "No se pudo cerrar el expediente."; }
  finally { savingClose.value = false; }
}

function requiredRule(message: string) { return (value: unknown) => (value !== null && value !== undefined && value !== "") || message; }
function normalizeStateType(value: string | null): string { return (value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }
function stateOptionProps(item: CaseState) { return { disabled: normalizeStateType(item.descripcion) === "activo" }; }
function staffName(staff: StaffInfo | null): string { return staff ? [staff.persona.nombres, staff.persona.primer_apellido, staff.persona.segundo_apellido].filter(Boolean).join(" ") : ""; }
function registrarName(item: SessionInfo): string { return item.nombre_registrado_por || (item.registrado_por ? staffName({ id: "", persona: item.registrado_por.persona }) : ""); }
function isActiveCase(item: CaseInfo | null): boolean { return item ? item.estado_caso === "ACTIVO" || item.estado_caso === "Activo" : false; }
function stateLabel(value: string): string { return value === "ACTIVO" || value === "Activo" ? "Activo" : value === "CERRADO" || value === "Cerrado" ? "Cerrado" : value; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeZone: "America/La_Paz" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
</script>

<style scoped>
.history-page { max-width: 1440px; }
.session-text { white-space: pre-wrap; }
</style>
