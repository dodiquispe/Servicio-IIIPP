<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">ADMINISTRACIÓN</div>
        <h1 class="text-h4">Reportes</h1>
      </div>
      <div v-if="canView" class="d-flex align-center flex-wrap ga-2">
        <v-btn icon="mdi-chevron-left" aria-label="Período anterior" :disabled="loading" @click="movePeriod(-1)" />
        <v-btn variant="outlined" :disabled="loading" @click="filters.fecha_referencia = today">Período actual</v-btn>
        <v-btn icon="mdi-chevron-right" aria-label="Período siguiente" :disabled="loading" @click="movePeriod(1)" />
      </div>
    </div>
    <v-alert v-if="!canView" type="warning" variant="tonal" class="mb-4">Esta vista está disponible para administración.</v-alert>
    <template v-else>
      <v-card color="secondary" class="pa-3 mb-3">
        <v-form @submit.prevent="load">
          <v-row align="center">
            <v-col cols="12" sm="6" md="3">
              <v-select v-model="filters.periodo" :items="periods" label="Período" density="compact" variant="outlined" hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-text-field v-model="filters.fecha_referencia" type="date" label="Fecha de referencia" density="compact" variant="outlined" hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3"><ServicioSelect v-model="filters.id_servicio" label="Servicio" /></v-col>
            <v-col cols="12" sm="6" md="3">
              <v-text-field v-model="filters.municipio" label="Municipio" maxlength="200" density="compact" variant="outlined" hide-details clearable />
            </v-col>
            <v-col cols="12"><v-btn color="primary" type="submit" :loading="loading">Consultar</v-btn></v-col>
          </v-row>
        </v-form>
      </v-card>
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <v-chip v-if="filters.id_servicio" closable color="primary" variant="tonal" @click:close="filters.id_servicio = null">{{ selectedServiceName || 'Servicio seleccionado' }}</v-chip>
        <v-chip v-if="filters.municipio" closable color="primary" variant="tonal" @click:close="filters.municipio = ''">{{ filters.municipio }}</v-chip>
        <v-btn v-if="filters.id_servicio || filters.municipio" size="small" variant="text" prepend-icon="mdi-filter-remove" @click="clearFilters">Limpiar filtros</v-btn>
      </div>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <div v-if="report.desde && report.hasta" class="text-body-2 text-medium-emphasis mb-3">Período consultado: {{ report.desde }} – {{ report.hasta }}</div>
      <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
      <v-row class="mb-2">
        <v-col v-for="indicator in indicators" :key="indicator.title" cols="12" sm="6" lg="3">
          <v-card variant="outlined" class="pa-4" :aria-busy="loading">
            <div class="d-flex align-center justify-space-between">
              <span class="text-medium-emphasis">{{ indicator.title }}</span>
              <v-icon :icon="indicator.icon" color="primary" />
            </div>
            <div class="text-h4 mt-2">{{ loading ? '—' : indicator.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ indicator.subtitle }}</div>
          </v-card>
        </v-col>
      </v-row>
      <v-row class="mb-2">
        <v-col v-for="status in caseStatuses" :key="status.clave" cols="12" sm="6" lg="3">
          <v-card variant="outlined" class="pa-4" :aria-busy="loading" :disabled="loading" @click="selectedStatus = status.clave; statusDialog = true">
            <div class="text-medium-emphasis">{{ status.etiqueta }}</div>
            <div class="text-h4 mt-2">{{ loading ? '—' : status.cantidad }}</div>
            <div class="text-caption text-medium-emphasis">{{ status.clave === 'ACTIVO' ? 'Activos al cierre del período' : status.clave === 'CERRADO' ? 'Altas y cierres sin tipo registrados en el período' : 'Cierres registrados en el período' }}</div>
            <div class="text-caption text-primary mt-2">Ver distribución <v-icon size="small">mdi-arrow-top-right</v-icon></div>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col v-for="section in sections" :key="section.key" cols="12" md="6">
          <v-card variant="outlined" class="h-100">
            <v-card-title>{{ section.title }}</v-card-title>
            <v-card-text>
              <div v-if="!report.total" class="text-medium-emphasis py-8">No hay atenciones en el período consultado.</div>
              <template v-else-if="section.key === 'periodo'">
                <v-btn-toggle v-model="chartType" mandatory density="compact" color="primary" class="mb-3" aria-label="Tipo de gráfica">
                  <v-btn value="trend" size="small">Líneas</v-btn>
                  <v-btn value="bar" size="small">Barras</v-btn>
                </v-btn-toggle>
                <VSparkline
                  :model-value="section.rows.map(row => row.cantidad)"
                  :labels="section.rows.map(row => row.etiqueta)"
                  :type="chartType"
                  :min="0"
                  :height="180"
                  :padding="20"
                  :line-width="chartType === 'bar' ? 8 : 2"
                  color="primary"
                  :show-markers="chartType === 'trend'"
                  show-labels
                  interactive
                  tooltip
                  :aria-label="section.title"
                  @update:current-index="selectedPoint = $event"
                />
                <div v-if="focusedPoint" class="d-flex align-center justify-space-between flex-wrap ga-2 mt-2" aria-live="polite">
                  <span>{{ focusedPoint.clave }} · <strong>{{ focusedPoint.cantidad }} atenciones</strong></span>
                  <v-btn v-if="appliedPeriod === 'ANIO'" size="small" variant="tonal" color="primary" :disabled="loading" @click="openMonth(focusedPoint.clave)">Explorar este mes</v-btn>
                </div>
              </template>
              <template v-else>
                <button v-for="row in section.rows" :key="row.clave" type="button" class="w-100 text-start mb-4" :disabled="loading || row.clave === 'Sin municipio registrado'" :aria-label="'Filtrar por ' + row.etiqueta" @click="filterByRow(section.key, row)">
                  <div class="d-flex justify-space-between ga-3 mb-1">
                    <span>{{ row.etiqueta }}</span>
                    <strong>{{ row.cantidad }} · {{ percentage(row.cantidad) }}%</strong>
                  </div>
                  <v-progress-linear :model-value="percentage(row.cantidad)" color="primary" height="12" rounded :aria-label="row.etiqueta + ': ' + row.cantidad + ' atenciones'" />
                </button>
                <div class="text-caption text-medium-emphasis">Pulsa una barra para filtrar el dashboard.</div>
              </template>
              <v-expansion-panels variant="accordion" class="mt-4">
                <v-expansion-panel title="Ver datos">
                  <v-expansion-panel-text>
                    <CommonCrudTable
                      :tabla="section.key"
                      :titulo="section.title"
                      :headers="section.headers"
                      getrows=""
                      :filters="[]"
                      :inputs="[]"
                      :source-items="section.rows"
                      :source-loading="loading"
                      :acciones="false"
                    />
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
    <v-dialog v-model="statusDialog" max-width="680">
      <v-card>
        <v-card-title>Distribución de casos</v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-4">{{ report.desde }} – {{ report.hasta }}</div>
          <div v-for="status in caseStatuses" :key="status.clave" class="mb-4">
            <v-btn :variant="selectedStatus === status.clave ? 'tonal' : 'text'" color="primary" @click="selectedStatus = status.clave">{{ status.etiqueta }}: {{ status.cantidad }}</v-btn>
            <v-progress-linear :model-value="caseTotal ? status.cantidad / caseTotal * 100 : 0" color="primary" height="12" rounded class="mt-2" />
          </div>
          <div class="text-caption text-medium-emphasis">Activos al cierre del período; los demás corresponden a cierres registrados dentro del período consultado.</div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="statusDialog = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import type { CrudRecord, Header } from "~/interfaces/app/common";
import { VSparkline } from "vuetify/components";
import ServicioSelect from "~/components/common/Fields/ServicioSelect.vue";
import { $querys } from "~/utils/querys.graphql";
import { sessionHasRole, useUserSession } from "~/utils/session";

interface Group extends CrudRecord { clave: string; etiqueta: string; cantidad: number }
interface Report { total: number; desde: string | null; hasta: string | null; casos: Group[]; por_mes: Group[]; por_dia: Group[]; por_dia_semana: Group[]; por_servicio: Group[]; por_municipio: Group[] }
const emptyReport = (): Report => ({ total: 0, desde: null, hasta: null, casos: [], por_mes: [], por_dia: [], por_dia_semana: [], por_servicio: [], por_municipio: [] });
const { $service } = useNuxtApp();
const session = useUserSession();
const canView = computed(() => sessionHasRole(session.roles.value, "administrador"));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
const periods = [{ title: "Por semana", value: "SEMANA" }, { title: "Por mes", value: "MES" }, { title: "Por año", value: "ANIO" }];
const filters = reactive({ periodo: "MES", fecha_referencia: today, id_servicio: null as string | null, municipio: "" as string | null });
const appliedPeriod = ref("MES");
const report = ref<Report>(emptyReport());
const loading = ref(false);
const error = ref("");
const chartType = ref("trend");
const selectedPoint = ref<number | undefined>(undefined);
const selectedServiceName = ref("");
const statusDialog = ref(false);
const selectedStatus = ref("ACTIVO");
let municipalityTimer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;
const caseStatuses = computed(() => [
  { clave: "ACTIVO", etiqueta: "Activos" },
  { clave: "CERRADO", etiqueta: "Cerrados" },
  { clave: "DERIVADO", etiqueta: "Derivados" },
  { clave: "ABANDONO", etiqueta: "Abandonados" },
].map(status => ({ ...status, cantidad: report.value.casos.find(row => row.clave === status.clave)?.cantidad ?? 0 })));
const caseTotal = computed(() => caseStatuses.value.reduce((total, status) => total + status.cantidad, 0));
const periodRows = computed<Group[]>(() => {
  if (!report.value.desde || !report.value.hasta) return [];
  if (appliedPeriod.value === "ANIO") {
    const year = report.value.desde.slice(0, 4);
    return Array.from({ length: 12 }, (_, index) => {
      const clave = year + "-" + String(index + 1).padStart(2, "0");
      const etiqueta = new Intl.DateTimeFormat("es", { month: "short", timeZone: "UTC" }).format(new Date(clave + "-01T00:00:00Z"));
      return { clave, etiqueta, cantidad: report.value.por_mes.find(row => row.clave === clave)?.cantidad ?? 0 };
    });
  }
  const counts = new Map(report.value.por_dia.map(row => [row.clave, row.cantidad]));
  const rows: Group[] = [];
  const date = new Date(report.value.desde + "T00:00:00Z");
  while (date.toISOString().slice(0, 10) <= report.value.hasta) {
    const clave = date.toISOString().slice(0, 10);
    rows.push({ clave, etiqueta: clave.slice(5), cantidad: counts.get(clave) ?? 0 });
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return rows;
});
const indicators = computed(() => [
  { title: "Total de atenciones", value: report.value.total, icon: "mdi-heart-pulse", subtitle: "Sesiones registradas" },
  { title: "Días con atención", value: report.value.por_dia.length, icon: "mdi-calendar-check", subtitle: "En el período consultado" },
  { title: "Servicios con atención", value: report.value.por_servicio.length, icon: "mdi-domain", subtitle: "Servicios con sesiones registradas" },
  { title: "Municipios", value: report.value.por_municipio.filter(row => row.clave !== "Sin municipio registrado").length, icon: "mdi-map-marker", subtitle: "Municipios identificados" },
]);
const focusedPoint = computed(() => selectedPoint.value == null ? null : periodRows.value[selectedPoint.value] ?? null);
function movePeriod(direction: number): void {
  const date = new Date(filters.fecha_referencia + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return;
  if (filters.periodo === 'SEMANA') date.setUTCDate(date.getUTCDate() + direction * 7);
  else if (filters.periodo === 'MES') { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + direction); }
  else { date.setUTCMonth(0, 1); date.setUTCFullYear(date.getUTCFullYear() + direction); }
  filters.fecha_referencia = date.toISOString().slice(0, 10);
}
function filterByRow(section: string, row: Group): void {
  if (section === 'servicio') { selectedServiceName.value = row.etiqueta; filters.id_servicio = row.clave; }
  else if (section === 'municipio') filters.municipio = row.clave;
}
function clearFilters(): void { filters.id_servicio = null; filters.municipio = ''; selectedServiceName.value = ''; }
function openMonth(month: string): void { filters.periodo = 'MES'; filters.fecha_referencia = month + '-01'; }
function percentage(value: number): number {
  return report.value.total ? Math.round(value / report.value.total * 1000) / 10 : 0;
}
const sections = computed(() => [
  { key: "periodo", title: "Atenciones " + (appliedPeriod.value === "SEMANA" ? "de la semana" : appliedPeriod.value === "ANIO" ? "del año" : "del mes"), label: appliedPeriod.value === "ANIO" ? "Mes" : "Fecha", rows: periodRows.value },
  { key: "servicio", title: "Atenciones por servicio", label: "Servicio", rows: report.value.por_servicio },
  { key: "municipio", title: "Atenciones por municipio", label: "Municipio", rows: report.value.por_municipio },
].map(section => ({ ...section, headers: [{ title: section.label, key: "etiqueta" }, { title: "Atenciones", key: "cantidad" }] as Header[] })));

async function load(): Promise<void> {
  const request = ++requestId;
  if (!canView.value) { report.value = emptyReport(); loading.value = false; return; }
  if (!filters.periodo || !filters.fecha_referencia) {
    loading.value = false;
    error.value = "Seleccione un período y una fecha de referencia";
    return;
  }
  loading.value = true;
  error.value = "";
  const selectedPeriod = filters.periodo;
  try {
    const result = await $service.graphql<{ reporteAtenciones: Report }>({
      query: $querys.staff.reporteAtenciones,
      variables: { search: { periodo: selectedPeriod, fecha_referencia: filters.fecha_referencia, id_servicio: filters.id_servicio, municipio: filters.municipio?.trim() || null } },
    });
    if (request === requestId) { report.value = result.reporteAtenciones; appliedPeriod.value = selectedPeriod; selectedPoint.value = undefined; }
  } catch (cause) {
    if (request === requestId) { report.value = emptyReport(); error.value = cause instanceof Error ? cause.message : "No se pudieron cargar los reportes"; }
  } finally {
    if (request === requestId) loading.value = false;
  }
}
watch(canView, () => { void load(); });
watch([() => filters.periodo, () => filters.fecha_referencia, () => filters.id_servicio], () => {
  if (municipalityTimer) clearTimeout(municipalityTimer);
  void load();
});
watch(() => filters.municipio, () => {
  if (municipalityTimer) clearTimeout(municipalityTimer);
  municipalityTimer = setTimeout(() => { void load(); }, 350);
});
onUnmounted(() => { if (municipalityTimer) clearTimeout(municipalityTimer); });
onMounted(() => { void load(); });
</script>
