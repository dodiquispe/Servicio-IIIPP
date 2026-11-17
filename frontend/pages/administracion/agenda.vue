<template>
  <v-container fluid>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <CommonCrudTable tabla="cita" titulo="Agenda" :headers="headers" getrows="" :inputs="[]"
      :filters="filters" :source-items="filtered" :source-loading="loading" :source-reload="load"
      :acciones="false" @filters-change="applied = $event">
      <template #acciones="{ item }">
        <div class="d-flex flex-wrap ga-1">
          <v-btn size="small" variant="tonal" :disabled="busy || !open(item)" @click="asistencia(item, true)">Asistió</v-btn>
          <v-btn size="small" variant="tonal" :disabled="busy || !open(item)" @click="asistencia(item, false)">No asistió</v-btn>
          <v-btn size="small" variant="tonal" :disabled="busy" @click="editar(item, 'reagendar')">Reagendar</v-btn>
          <v-btn size="small" variant="tonal" :disabled="busy || !open(item)" @click="editar(item, 'practicante')">Asignar practicante</v-btn>
          <v-btn size="small" variant="tonal" :disabled="busy || !open(item)" @click="editar(item, 'cancelar')">Cancelar</v-btn>
          <v-btn size="small" variant="tonal" :disabled="item.estado_texto !== 'ATENDIDA'" :to="`/pacientes/${item.id_expediente}/historial?id_reserva=${item.id_reserva}`">Registrar sesión</v-btn>
          <v-btn size="small" variant="tonal" @click="detalle = item">Ver detalle</v-btn>
        </div>
      </template>
    </CommonCrudTable>
    <DialogCrearEditar v-model="dialog" :datos="form" tabla="cita" :titulo="dialogTitle" :inputs="inputs" :on-save="save" />
    <v-dialog :model-value="!!detalle" max-width="650" @update:model-value="detalle = null">
      <v-card v-if="detalle" title="Detalle de cita">
        <v-card-text><v-list>
          <v-list-item v-for="header in headers.filter(h => h.key !== 'acciones')" :key="header.key"
            :title="header.title" :subtitle="String(detalle[header.key] ?? 'Sin asignar')" />
        </v-list></v-card-text>
        <v-card-actions><v-btn @click="detalle = null">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import DialogCrearEditar from '~/components/common/DialogCrearEditar.vue';
import type { CrudRecord, Filters, Header, Inputs } from '~/interfaces/app/common';

interface Cita extends CrudRecord {
  id: string; id_reserva: string; id_expediente: string; id_servicio: string;
  id_responsable: string; id_practicante: string | null; fecha: string; hora_inicio: string; hora_fin: string;
  estado: { descripcion: string }; motivo: string | null;
  reserva: { servicio: { servicio: string }; expediente: { persona: { nombres: string; primer_apellido: string; segundo_apellido: string | null; nro_documento: string } } };
}
const { $service } = useNuxtApp();
const rows = ref<CrudRecord[]>([]);
const applied = ref<Record<string, unknown>>({});
const loading = ref(false), busy = ref(false), error = ref(''), dialog = ref(false);
const detalle = ref<CrudRecord | null>(null), selected = ref<CrudRecord | null>(null);
const mode = ref<'reagendar' | 'practicante' | 'cancelar'>('reagendar');
const form = ref<CrudRecord>({});
const headers: Header[] = [
  { title: 'Fecha', key: 'fecha' }, { title: 'Hora', key: 'hora' }, { title: 'Paciente', key: 'paciente' },
  { title: 'CI', key: 'ci' }, { title: 'Servicio', key: 'servicio' }, { title: 'Responsable', key: 'responsable' },
  { title: 'Practicante', key: 'practicante' }, { title: 'Estado', key: 'estado_texto' }, { title: 'Acciones', key: 'acciones', sortable: false },
];
const filters = computed<Filters[]>(() => [
  ...['responsable', 'servicio', 'practicante', 'estado_texto'].map(field => ({ field, label: field === 'estado_texto' ? 'Estado' : field.charAt(0).toUpperCase() + field.slice(1), type: 'select' as const, items: [...new Set(rows.value.map(r => String(r[field] ?? '')))] })),
  { field: 'desde', label: 'Fecha desde', type: 'date' }, { field: 'hasta', label: 'Fecha hasta', type: 'date' },
]);
const filtered = computed(() => rows.value.filter(row => Object.entries(applied.value).every(([key, value]) => {
  if (!value) return true;
  if (key === 'desde') return String(row.fecha) >= String(value);
  if (key === 'hasta') return String(row.fecha) <= String(value);
  return String(row[key] ?? '') === String(value);
})));
const dialogTitle = computed(() => ({ reagendar: 'Reagendar cita', practicante: 'Asignar practicante', cancelar: 'Cancelar cita' })[mode.value]);
const inputs = computed<Inputs[]>(() => mode.value === 'practicante'
  ? [{ field: 'id_practicante', descripcion: 'Practicante', type: 'practicante', idServicio: String(selected.value?.id_servicio ?? ''), required: true }]
  : [...(mode.value === 'reagendar' ? [
    { field: 'fecha', descripcion: 'Fecha', type: 'date' as const, required: true },
    { field: 'hora_inicio', descripcion: 'Hora', type: 'time' as const, required: true },
  ] : []), { field: 'motivo', descripcion: 'Motivo', type: 'textarea', required: true, maxlength: 300 }]);
function open(item: CrudRecord) { return ['AGENDADA', 'EN_ATENCION', 'REAGENDADA'].includes(String(item.estado_texto)); }
function editar(item: CrudRecord, action: typeof mode.value) {
  selected.value = item; mode.value = action;
  form.value = { fecha: item.fecha, hora_inicio: item.hora_inicio, motivo: '', id_practicante: item.id_practicante };
  dialog.value = true;
}
async function mutation(query: string, variables: Record<string, unknown>) {
  busy.value = true; error.value = '';
  try { await $service.graphql({ query, variables }); await load(); }
  catch (e) { error.value = e instanceof Error ? e.message : 'No se pudo actualizar la cita'; throw e; }
  finally { busy.value = false; }
}
async function asistencia(item: CrudRecord, asistio: boolean) {
  try { await mutation('mutation($id: String!, $asistio: Boolean!) { marcarAsistencia(idCita: $id, asistio: $asistio) { id } }', { id: item.id, asistio }); } catch { /* El mensaje permanece visible. */ }
}
async function save(data: CrudRecord) {
  const id = selected.value?.id;
  if (mode.value === 'reagendar') await mutation('mutation($id: String!, $datos: ReagendarCitaInput!) { reagendarCita(idCita: $id, datos: $datos) { id } }', { id, datos: { fecha: data.fecha, hora_inicio: data.hora_inicio, motivo: data.motivo } });
  else if (mode.value === 'practicante') await mutation('mutation($id: String!, $p: String!) { asignarPracticante(idCita: $id, idPracticante: $p) { id } }', { id, p: data.id_practicante });
  else await mutation('mutation($id: String!, $motivo: String!) { cancelarCita(idCita: $id, motivo: $motivo) { id } }', { id, motivo: data.motivo });
}
async function load() {
  loading.value = true;
  try {
    const result = await $service.graphql<{ citasAgenda: Cita[] }>({ query: `query { citasAgenda {
      id id_reserva id_expediente id_servicio id_responsable id_practicante fecha hora_inicio hora_fin motivo
      estado { descripcion } responsable { persona { nombres primer_apellido segundo_apellido } }
      practicante { persona { nombres primer_apellido segundo_apellido } }
      reserva { servicio { servicio } expediente { persona { nombres primer_apellido segundo_apellido nro_documento } } }
    } }` });
    const name = (person: Record<string, unknown> | undefined) => person ? [person.nombres, person.primer_apellido, person.segundo_apellido].filter(Boolean).join(' ') : 'Sin asignar';
    rows.value = result.citasAgenda.map(c => ({ ...c, hora: `${c.hora_inicio.slice(0, 5)} – ${c.hora_fin.slice(0, 5)}`, paciente: name(c.reserva.expediente.persona), ci: c.reserva.expediente.persona.nro_documento,
      servicio: c.reserva.servicio.servicio, responsable: name((c.responsable as { persona: Record<string, unknown> } | null)?.persona), practicante: name((c.practicante as { persona: Record<string, unknown> } | null)?.persona), estado_texto: c.estado.descripcion }));
  } catch (e) { error.value = e instanceof Error ? e.message : 'No se pudo cargar la agenda'; }
  finally { loading.value = false; }
}
onMounted(load);
</script>
