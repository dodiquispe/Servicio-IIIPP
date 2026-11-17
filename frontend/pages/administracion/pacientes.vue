<template>
  <v-container fluid>
    <v-alert v-if="!canView" type="warning" variant="tonal">
      Esta vista está disponible solo para administración.
    </v-alert>
    <template v-else>
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
        <div>
          <div class="text-overline text-primary">ADMINISTRACIÓN</div>
          <h1 class="text-h4">Pacientes</h1>
          <p class="text-medium-emphasis">
            Consulta de pacientes registrados en todos los servicios. Esta vista es de solo lectura.
          </p>
        </div>
        <div class="d-flex align-center ga-1">
          <v-btn
            icon
            variant="text"
            aria-label="Recargar pacientes"
            :loading="loading"
            @click="load"
          >
            <v-tooltip activator="parent" location="bottom">
              Recargar pacientes
            </v-tooltip>
            <v-icon>mdi-reload</v-icon>
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
        {{ error }}
      </v-alert>

      <CommonCrudTable
        tabla="paciente"
        titulo="Pacientes"
        :headers="headers"
        getrows=""
        :filters="patientFilters"
        :inputs="[]"
        :source-items="filteredPatients"
        :source-loading="loading"
        :source-reload="load"
        @filters-change="appliedFilters = $event"
        :acciones="false"
      >
        <template #persona="{ item }">{{ fullNameFromRow(item) }}</template>
        <template #responsable="{ item }">{{ responsibleFromRow(item) }}</template>
        <template #estado_caso="{ item }">{{ item.estado_actual?.descripcion ?? item.estado_caso }}</template>
        <template #acciones="{ item }"><v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-history" @click="navigateTo(`/pacientes/${item.id}/historial`)">Historial</v-btn></template>
        <template #servicios="{ item }">
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="service in item.servicios"
              :key="service"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ service }}
            </v-chip>
          </div>
        </template>
      </CommonCrudTable>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { Filters, CrudRecord } from "~/interfaces/app/common";
import { sessionHasRole, useUserSession } from "~/utils/session";

definePageMeta({ alias: ["/pacientes"] });
interface PatientCase extends CrudRecord {
  estado_caso: string;
  estado_actual: { descripcion: string } | null;
  id: string;
  id_persona: string;
  fecha_apertura: string;
  responsable: {
    id: string;
    persona: { nombres: string; primer_apellido: string | null; segundo_apellido: string | null };
  } | null;
  persona: {
    id: string;
    nombres: string;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    nro_documento: string | null;
    movil: string | null;
    correo_personal: string | null;
  };
  servicio: { servicio: string };
}

interface PatientRow extends PatientCase {
  servicios: string[];
  totalCasos: number;
  ultimaApertura: string;
}

const { $service } = useNuxtApp();
const session = useUserSession();
const canView = computed(() =>
  sessionHasRole(session.roles.value, "administrador"),
);
const cases = ref<PatientCase[]>([]);
const appliedFilters = ref<CrudRecord>({});
const professionals = ref<Array<{ id: string; name: string }>>([]);
const caseStates = ref<Array<{ id: number; descripcion: string }>>([]);
const patientFilters = computed<Filters[]>(() => [
  { field: "nombres", label: "Nombres", type: "text" },
  { field: "primer_apellido", label: "Primer apellido", type: "text" },
  { field: "nro_documento", label: "CI", type: "text" },
  { field: "id_profesional", label: "Psicólogo responsable", type: "select", items: professionals.value, itemTitle: "name", itemValue: "id" },
  { field: "id_estado_caso", label: "Estado del caso", type: "estado", items: caseStates.value, itemTitle: "descripcion", itemValue: "id" },
]);
async function loadPatientCatalogs(): Promise<void> {
  try {
    const [professionalResult, stateResult] = await Promise.all([
      $service.graphql<{ profesionalesFiltroAgenda: Array<{ id: string; name: string }> }>({ query: `query { profesionalesFiltroAgenda { id name } }` }),
      $service.graphql<{ estados: Array<{ id: number; descripcion: string; id_estado: number }> }>({ query: `query { estados { id descripcion id_estado } }` }),
    ]);
    professionals.value = professionalResult.profesionalesFiltroAgenda;
    caseStates.value = stateResult.estados.filter((state) => state.id_estado === 1);
  } catch (cause) { useMessage().error(cause instanceof Error ? cause.message : "No se pudieron cargar los filtros"); }
}
const loading = ref(false);
const error = ref("");
const showFilters = ref(true);
const headers = [
  { title: "Paciente", key: "persona", crearColumna: true },
  { title: "CI", key: "persona.nro_documento" },
  { title: "Celular", key: "persona.movil" },
  { title: "Correo", key: "persona.correo_personal" },
  { title: "Servicios", key: "servicios", sortable: false, crearColumna: true },
  { title: "Psicólogo responsable", key: "responsable", crearColumna: true },
  { title: "Estado del caso", key: "estado_caso", crearColumna: true },
  { title: "Detalle", key: "acciones", crearColumna: true, sortable: false },
  { title: "Casos", key: "totalCasos" },
  { title: "Última apertura", key: "ultimaApertura" },
];

const patients = computed<PatientRow[]>(() => {
  const grouped = new Map<string, PatientCase[]>();
  for (const patientCase of cases.value) {
    const records = grouped.get(patientCase.id_persona) ?? [];
    records.push(patientCase);
    grouped.set(patientCase.id_persona, records);
  }

  return [...grouped.values()].map((records) => {
    const latest = records.reduce((current, record) =>
      record.fecha_apertura > current.fecha_apertura ? record : current,
    );
    return {
      ...latest,
      servicios: [...new Set(records.map((record) => record.servicio.servicio))].sort(),
      totalCasos: records.length,
      ultimaApertura: latest.fecha_apertura,
    };
  });
});

const filteredPatients = computed(() => patients.value);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const allCases: PatientCase[] = [];
    let pagina = 1; let count = 0;
    do {
      const result = await $service.graphql<{ pacientesAdministracionPage: { rows: PatientCase[]; count: number } }>({
        query: `query($pagina: Int!, $search: PacientesAdministracionArgs) {
          pacientesAdministracionPage(limit:100, pagina:$pagina, search:$search) {
            count rows { id id_persona fecha_apertura estado_caso estado_actual { descripcion }
              persona { id nombres primer_apellido segundo_apellido nro_documento movil correo_personal }
              servicio { servicio } responsable { id persona { nombres primer_apellido segundo_apellido } }
            }
          }
        }`, variables: { pagina, search: appliedFilters.value },
      });
      allCases.push(...result.pacientesAdministracionPage.rows);
      count = result.pacientesAdministracionPage.count;
      if (!result.pacientesAdministracionPage.rows.length) break;
      pagina++;
    } while (allCases.length < count);
    cases.value = allCases;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los pacientes.";
  } finally {
    loading.value = false;
  }
}

function fullName(patient: Pick<PatientCase, "persona">): string {
  return [
    patient.persona.nombres,
    patient.persona.primer_apellido,
    patient.persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(" ");
}

function responsibleName(item: PatientCase): string {
  const person = item.responsable?.persona;
  return person
    ? [person.nombres, person.primer_apellido, person.segundo_apellido].filter(Boolean).join(" ")
    : "Sin responsable vigente";
}

function patientFromRow(row: Record<string, unknown>): PatientCase | null {
  return typeof row.id_persona === "string" && row.persona && typeof row.persona === "object"
    ? row as unknown as PatientCase
    : null;
}

function fullNameFromRow(row: Record<string, unknown>): string {
  const item = patientFromRow(row);
  return item ? fullName(item) : "";
}

function responsibleFromRow(row: Record<string, unknown>): string {
  const item = patientFromRow(row);
  return item ? responsibleName(item) : "Sin responsable vigente";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

onMounted(() => {
  if (canView.value) { void load(); void loadPatientCatalogs(); }
});

watch(canView, (allowed) => {
  if (allowed) { void load(); void loadPatientCatalogs(); }
  else cases.value = [];
});
</script>
