<template>
  <v-container fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div><div class="text-overline text-primary">CASOS</div><h1 class="text-h4">Asignación a practicantes</h1><p class="text-medium-emphasis mb-0">Asigna cada expediente a un practicante activo de su servicio.</p></div>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="load">Actualizar</v-btn>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-text-field v-model="search" label="Buscar paciente, CI, servicio o caso" prepend-inner-icon="mdi-magnify" clearable class="mb-4" />
    <v-card variant="outlined">
      <v-table>
        <thead><tr><th>Caso / paciente</th><th>Servicio</th><th>Practicante asignado</th><th>Asignar</th></tr></thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.codigo_caso }} · {{ patientName(item) }}<div class="text-caption">CI: {{ item.persona.nro_documento || '—' }}</div></td>
            <td>{{ item.servicio.servicio }}</td>
            <td>{{ item.profesional ? staffName(item.profesional) : 'Sin asignar' }}</td>
            <td class="assignment-cell">
              <v-select v-model="chosen[item.id]" :items="practitionersFor(item.id_servicio)" item-title="name" item-value="id" label="Practicante" density="compact" hide-details />
              <v-btn size="small" color="primary" :loading="saving === item.id" :disabled="!chosen[item.id] || chosen[item.id] === item.id_profesional" @click="assign(item)">Guardar</v-btn>
            </td>
          </tr>
          <tr v-if="!loading && !filtered.length"><td colspan="4" class="text-center py-8">No hay casos activos que coincidan.</td></tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";
import { normalizeRoleName } from "~/utils/session";

interface CaseRow { id: string; id_servicio: string; id_profesional: string | null; codigo_caso: string; estado_caso: string; persona: { nombres: string; primer_apellido: string | null; segundo_apellido: string | null; nro_documento: string | null }; servicio: { servicio: string }; profesional: { id: string; persona: { nombres: string; primer_apellido: string | null; segundo_apellido: string | null } } | null; }
interface Staff { id_usuario: string; id_servicio: string; id_estado: number; fecha_inicio: string; fecha_fin: string | null; rol: { descripcion: string } | null; usuario: { id: string; id_estado: number; persona: { nombres: string; primer_apellido: string | null; segundo_apellido: string | null } }; }
const { $service } = useNuxtApp();
const cases = ref<CaseRow[]>([]); const staff = ref<Staff[]>([]); const chosen = reactive<Record<string, string>>({});
const loading = ref(false); const saving = ref(""); const error = ref(""); const search = ref("");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const filtered = computed(() => { const term = search.value.trim().toLocaleLowerCase(); return cases.value.filter((item) => item.estado_caso === "ACTIVO" && (!term || [item.codigo_caso, patientName(item), item.persona.nro_documento, item.servicio.servicio].some((value) => value?.toLocaleLowerCase().includes(term)))); });
onMounted(() => void load());
async function load(): Promise<void> {
  loading.value = true; error.value = "";
  try {
    const [caseResult, staffResult] = await Promise.all([
      $service.graphql<{ expedientes: CaseRow[] }>({ query: $querys.staff.expedientesAtencion }),
      $service.graphql<{ servicioPersonal: Staff[] }>({ query: `query Personal { servicioPersonal { id_usuario id_servicio id_estado fecha_inicio fecha_fin rol { descripcion } usuario { id id_estado persona { nombres primer_apellido segundo_apellido } } } }` }),
    ]);
    cases.value = caseResult.expedientes;
    staff.value = staffResult.servicioPersonal;
    for (const item of cases.value) if (item.id_profesional) chosen[item.id] = item.id_profesional;
  } catch (cause) { error.value = cause instanceof Error ? cause.message : "No se pudo cargar la asignación."; }
  finally { loading.value = false; }
}
function patientName(item: CaseRow): string { return [item.persona.nombres, item.persona.primer_apellido, item.persona.segundo_apellido].filter(Boolean).join(" "); }
function staffName(user: CaseRow["profesional"]): string { return user ? [user.persona.nombres, user.persona.primer_apellido, user.persona.segundo_apellido].filter(Boolean).join(" ") : "Sin asignar"; }
function practitionersFor(serviceId: string): Array<{ id: string; name: string }> {
  return staff.value.filter((item) => item.id_servicio === serviceId && item.id_estado === 1 && item.usuario.id_estado === 1 && item.fecha_inicio <= today && (!item.fecha_fin || item.fecha_fin >= today) && normalizeRoleName(item.rol?.descripcion).includes("practicante")).map((item) => ({ id: item.id_usuario, name: [item.usuario.persona.nombres, item.usuario.persona.primer_apellido, item.usuario.persona.segundo_apellido].filter(Boolean).join(" ") }));
}
async function assign(item: CaseRow): Promise<void> {
  const practitionerId = chosen[item.id]; if (!practitionerId) return;
  saving.value = item.id; error.value = "";
  try {
    await $service.graphql({ query: `mutation($input: ReasignarExpedienteInput!) { asignarExpedientePracticante(input: $input) { id id_profesional } }`, variables: { input: { id_expediente: item.id, id_profesional: practitionerId } } });
    await load();
  } catch (cause) { error.value = cause instanceof Error ? cause.message : "No se pudo asignar el caso."; }
  finally { saving.value = ""; }
}
</script>

<style scoped>
.assignment-cell { min-width: 300px; display: flex; align-items: center; gap: 8px; }
</style>
