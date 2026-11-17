<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">ATENCIÓN PROFESIONAL</div>
        <h1 class="text-h4">Mis pacientes</h1>
        <p class="text-medium-emphasis">
          Pacientes con expediente asignado a su cuenta.
        </p>
      </div>
      <v-btn
        icon
        variant="text"
        aria-label="Actualizar pacientes"
        :loading="loading"
        @click="load"
      >
        <v-icon>mdi-reload</v-icon>
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-text-field
      v-model="search"
      label="Buscar paciente, CI, caso o servicio"
      prepend-inner-icon="mdi-magnify"
      clearable
      hide-details
      class="mb-4"
    />

    <CommonCrudTable
      tabla="expediente"
      titulo="Pacientes asignados"
      :headers="headers"
      getrows=""
      :filters="[]"
      :inputs="[]"
      :source-items="filteredCases"
      :source-loading="loading"
      :acciones="false"
    >
      <template #persona="{ item }">{{ fullNameFromRow(item) }}</template>
      <template #responsable="{ item }">{{
        responsibleFromRow(item)
      }}</template>
      <template #estado_caso="{ item }">
        <v-chip
          size="small"
          :color="caseStateFromRow(item) === 'Activo' ? 'success' : 'default'"
          variant="tonal"
        >
          {{ caseStateFromRow(item) }}
        </v-chip>
      </template>
      <template #acciones="{ item }">
        <div class="d-flex flex-wrap ga-2">
          <v-btn
            v-if="canRegisterSessions"
            color="primary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-plus"
            :disabled="!puedeRegistrarDesdeFila(item)"
            @click="openSessionFromRow(item)"
          >
            Registrar sesión
          </v-btn>
          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-history"
            @click="goToCase(item)"
          >
            Historial
          </v-btn>
        </div>
      </template>
    </CommonCrudTable>
    <CommonDialogCrearEditar
      v-model="sessionDialog"
      tabla="sesión"
      :titulo="`Registrar sesión Â· ${selectedCase ? fullName(selectedCase) : ''}`"
      guardar-texto="Guardar sesión"
      :datos="{}"
      :inputs="[]"
      :on-save="saveSession"
      :max-width="680"
      @reload-item="load"
    >
      <template #content>
        <v-alert v-if="dialogError" type="error" variant="tonal" class="mb-4">{{
          dialogError
        }}</v-alert>
        <v-text-field
          v-model="sessionForm.fecha_sesion"
          type="date"
          label="Fecha de la sesión"
          :rules="[requiredRule('Seleccione una fecha')]"
          required
        />
        <ParametroSelect
          v-model="sessionForm.id_tipo_atencion"
          tipo="tipo_atencion" item-value="id"
          label="Tipo de atención"
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
        <v-textarea
          v-model="sessionForm.observaciones"
          label="Observaciones (opcional)"
          maxlength="10000"
          rows="3"
        />
        <div class="text-caption text-medium-emphasis">
          El número correlativo se genera automáticamente para este expediente.
        </div>
      </template>
    </CommonDialogCrearEditar>
  </v-container>
</template>

<script setup lang="ts">
import type { CrudRecord } from "~/interfaces/app/common";
import ParametroSelect from "~/components/common/Fields/ParametroSelect.vue";
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole, useUserSession } from "~/utils/session";

interface AssignedCase extends CrudRecord {
  id: string;
  id_servicio: string;
  id_profesional: string | null;
  codigo_caso: string;
  fecha_apertura: string;
  estado_caso: string;
  estado_actual: { descripcion: string } | null;
  persona: {
    nombres: string;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    nro_documento: string | null;
  };
  servicio: { servicio: string };
  responsable: {
    id: string;
    persona: {
      nombres: string;
      primer_apellido: string | null;
      segundo_apellido: string | null;
    };
  } | null;
}

const { $service } = useNuxtApp();
const session = useUserSession();
const cases = ref<AssignedCase[]>([]);
const search = ref("");
const loading = ref(false);
const error = ref("");
const isPractitioner = computed(() =>
  sessionHasRole(session.roles.value, "practicante"),
);
const isResponsible = computed(() =>
  sessionHasRole(session.roles.value, "responsable"),
);
const canRegisterSessions = computed(
  () => isPractitioner.value || isResponsible.value,
);
const selectedCase = ref<AssignedCase | null>(null);
const sessionDialog = ref(false);
const dialogError = ref("");
const sessionForm = reactive({
  fecha_sesion: new Date().toISOString().slice(0, 10),
  id_tipo_atencion: null as number | null,
  accion_realizada: "",
  observaciones: "",
});
const headers = [
  { title: "Caso", key: "codigo_caso" },
  { title: "Paciente", key: "persona", crearColumna: true },
  { title: "CI", key: "persona.nro_documento" },
  { title: "Servicio", key: "servicio.servicio" },
  { title: "Psicólogo responsable", key: "responsable", crearColumna: true },
  { title: "Apertura", key: "fecha_apertura" },
  { title: "Estado", key: "estado_caso", crearColumna: true },
  { title: "Acciones", key: "acciones", sortable: false, crearColumna: true },
];
const filteredCases = computed(() => {
  const term = search.value.trim().toLocaleLowerCase();
  if (!term) return cases.value;
  return cases.value.filter((item) =>
    [
      item.codigo_caso,
      fullName(item),
      item.persona.nro_documento,
      item.servicio.servicio,
    ].some((value) => value?.toLocaleLowerCase().includes(term)),
  );
});

function fullName(item: AssignedCase): string {
  return [
    item.persona.nombres,
    item.persona.primer_apellido,
    item.persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(" ");
}

function responsibleName(item: AssignedCase): string {
  const person = item.responsable?.persona;
  return person
    ? [person.nombres, person.primer_apellido, person.segundo_apellido]
        .filter(Boolean)
        .join(" ")
    : "Sin responsable vigente";
}
function caseState(item: AssignedCase): string {
  return (
    item.estado_actual?.descripcion ??
    (item.estado_caso === "ACTIVO" ? "Activo" : "Cerrado")
  );
}
function caseFromRow(row: Record<string, unknown>): AssignedCase | null {
  const id = idFromRow(row);
  if (id) {
    const loadedCase = cases.value.find((item) => item.id === id);
    if (loadedCase) return loadedCase;
  }
  const raw = unwrapRow(row);
  return typeof raw.id === "string" &&
    (typeof raw.id_profesional === "string" || raw.id_profesional === null)
    ? (raw as unknown as AssignedCase)
    : null;
}
function fullNameFromRow(row: Record<string, unknown>): string {
  const item = caseFromRow(row);
  return item ? fullName(item) : "";
}
function responsibleFromRow(row: Record<string, unknown>): string {
  const item = caseFromRow(row);
  return item ? responsibleName(item) : "Sin responsable vigente";
}
function caseStateFromRow(row: Record<string, unknown>): string {
  const item = caseFromRow(row);
  return item ? caseState(item) : "";
}
function idFromRow(row: Record<string, unknown>): string {
  const raw = unwrapRow(row);
  return typeof raw.id === "string" ? raw.id : "";
}

function unwrapRow(row: Record<string, unknown>): Record<string, unknown> {
  let current = row;
  for (
    let depth = 0;
    depth < 3 && current.raw && typeof current.raw === "object";
    depth += 1
  ) {
    current = current.raw as Record<string, unknown>;
  }
  return current;
}

function goToCase(row: Record<string, unknown>): void {
  const id = idFromRow(row);
  if (id) void navigateTo({ path: `/pacientes/${id}/historial` });
}

function requiredRule(message: string): (value: unknown) => true | string {
  return (value) => Boolean(value) || message;
}

function puedeRegistrar(item: AssignedCase): boolean {
  if (caseState(item).toLocaleLowerCase() !== "activo") return false;
  if (isResponsible.value) return true;
  return (
    isPractitioner.value
  );
}
function puedeRegistrarDesdeFila(row: Record<string, unknown>): boolean {
  const item = caseFromRow(row);
  return Boolean(item && puedeRegistrar(item));
}
function openSessionFromRow(row: Record<string, unknown>): void {
  const item = caseFromRow(row);
  if (item && puedeRegistrar(item)) void openSession(item);
}
async function openSession(item: AssignedCase): Promise<void> {
  selectedCase.value = item;
  Object.assign(sessionForm, {
    fecha_sesion: new Date().toISOString().slice(0, 10),
    id_tipo_atencion: null,
    accion_realizada: "",
    observaciones: "",
  });
  dialogError.value = "";
  sessionDialog.value = true;
}
async function saveSession(): Promise<void> {
  if (!selectedCase.value || !session.usuario.value?.id)
    throw new Error("No se identificó el expediente o el usuario.");
  if (
    !sessionForm.fecha_sesion ||
    !sessionForm.id_tipo_atencion ||
    !sessionForm.accion_realizada.trim()
  ) {
    throw new Error(
      "Complete la fecha, el tipo de atención y la acción realizada.",
    );
  }
  dialogError.value = "";
  await $service.graphql({
    query: $querys.staff.crearSesion,
    variables: {
      input: {
        id_expediente: selectedCase.value.id,
        fecha_sesion: sessionForm.fecha_sesion,
        id_tipo_atencion: sessionForm.id_tipo_atencion,
        accion_realizada: sessionForm.accion_realizada.trim(),
        observaciones: sessionForm.observaciones.trim() || null,
      },
    },
  });
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await $service.graphql<{ expedientes: AssignedCase[] }>({
      query: $querys.staff.expedientesAtencion,
    });
    cases.value = result.expedientes;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar sus pacientes.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());
</script>
