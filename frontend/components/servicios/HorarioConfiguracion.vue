<template>
  <DialogCE
    :model-value="modelValue"
    :datos="{}"
    tabla="Horario"
    :titulo="props.idProfesional ? 'Horario personal del practicante' : 'Horario base del servicio'"
    guardar-texto="Guardar horarios"
    max-width="760"
    :inputs="[]"
    :on-save="guardarDesdeDialogo"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #content>
      <div class="schedule-content">
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ servicio.servicio }}<template v-if="props.nombreProfesional"> · {{ props.nombreProfesional }}</template>
        </p>
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
        <v-radio-group v-model="modalidad" inline hide-details class="mb-3">
          <v-radio label="Jornada continua" value="continua" />
          <v-radio label="Jornada discontinua" value="discontinua" />
        </v-radio-group>

        <v-card variant="outlined" class="pa-4 mb-4">
          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-calendar-week" class="mr-2" color="primary" />
            <span class="text-subtitle-1 font-weight-bold">
              Lunes a viernes
            </span>
          </div>

          <v-row v-if="modalidad === 'continua'" dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="inicio"
                type="time"
                label="Hora de inicio"
                prepend-inner-icon="mdi-clock-start"
                density="compact"
                variant="outlined"
                hide-details="auto"
                step="60"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fin"
                type="time"
                label="Hora de fin"
                prepend-inner-icon="mdi-clock-end"
                density="compact"
                variant="outlined"
                hide-details="auto"
                step="60"
              />
            </v-col>
          </v-row>

          <template v-else>
            <div class="text-body-2 font-weight-medium mb-2">Turno de mañana</div>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="mananaInicio"
                  type="time"
                  label="Hora de inicio"
                  prepend-inner-icon="mdi-clock-start"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  step="60"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="mananaFin"
                  type="time"
                  label="Hora de fin"
                  prepend-inner-icon="mdi-clock-end"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  step="60"
                />
              </v-col>
            </v-row>
            <div class="text-body-2 font-weight-medium mb-2">Turno de tarde</div>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="tardeInicio"
                  type="time"
                  label="Hora de inicio"
                  prepend-inner-icon="mdi-clock-start"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  step="60"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="tardeFin"
                  type="time"
                  label="Hora de fin"
                  prepend-inner-icon="mdi-clock-end"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  step="60"
                />
              </v-col>
            </v-row>
          </template>
        </v-card>

        <v-card variant="outlined" class="pa-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon icon="mdi-calendar-check" class="mr-2" color="primary" />
              <div>
                <div class="text-subtitle-1 font-weight-bold">Sábado</div>
                <div class="text-caption text-medium-emphasis">
                  Habilitar atención este día
                </div>
              </div>
            </div>
            <v-switch
              v-model="sabado"
              :label="sabado ? 'Activo' : 'Inactivo'"
              color="primary"
              hide-details
              inset
              :disabled="!sabadoDisponible"
            />
          </div>

          <v-expand-transition>
            <v-row v-if="sabado" dense class="mt-3">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="sabInicio"
                  type="time"
                  label="Hora de inicio"
                  prepend-inner-icon="mdi-clock-start"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  step="60"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="sabFin"
                  type="time"
                  label="Hora de fin"
                  prepend-inner-icon="mdi-clock-end"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  step="60"
                />
              </v-col>
            </v-row>
          </v-expand-transition>
        </v-card>
      </div>
    </template>
  </DialogCE>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import DialogCE from "~/components/common/DialogCrearEditar.vue";
import type {
  DayParameter,
  ScheduleRecord,
  ServiceRecord,
} from "~/interfaces/app/common";
import { findDayParameter, WEEKDAY_NAMES } from "~/interfaces/app/common";

const props = defineProps<{
  modelValue: boolean;
  servicio: ServiceRecord;
  diasSemana: DayParameter[];
  idProfesional?: string;
  nombreProfesional?: string;
}>();
const { $service } = useNuxtApp();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

type Jornada = "continua" | "discontinua";
interface TimeSlot {
  id_dia: number;
  hora_inicio: string;
  hora_fin: string;
}

const modalidad = ref<Jornada>("discontinua");
const inicio = ref("09:00");
const fin = ref("18:00");
const mananaInicio = ref("09:00");
const mananaFin = ref("13:00");
const tardeInicio = ref("14:00");
const tardeFin = ref("18:00");
const sabado = ref(false);
const sabInicio = ref("09:00");
const sabFin = ref("13:00");
const loading = ref(false);
const horariosActuales = ref<ScheduleRecord[]>([]);
const sabadoDisponible = computed(() => dayId("sabado") !== undefined);

function timeValue(value: string): string {
  return value.slice(0, 5);
}

function dayId(name: string): number | undefined {
  return findDayParameter(props.diasSemana, name)?.id;
}

function resetDefaults(): void {
  modalidad.value = "discontinua";
  inicio.value = "09:00";
  fin.value = "18:00";
  mananaInicio.value = "09:00";
  mananaFin.value = "13:00";
  tardeInicio.value = "14:00";
  tardeFin.value = "18:00";
  sabado.value = false;
  sabInicio.value = "09:00";
  sabFin.value = "13:00";
}

function applyExistingSchedule(rows: ScheduleRecord[]): void {
  resetDefaults();
  horariosActuales.value = rows;
  const mondayId = dayId("lunes");
  const monday = rows
    .filter((row) => row.id_dia === mondayId)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const firstMondaySlot = monday[0];
  const secondMondaySlot = monday[1];
  if (monday.length === 1 && firstMondaySlot) {
    modalidad.value = "continua";
    inicio.value = timeValue(firstMondaySlot.hora_inicio);
    fin.value = timeValue(firstMondaySlot.hora_fin);
  } else if (monday.length >= 2 && firstMondaySlot && secondMondaySlot) {
    modalidad.value = "discontinua";
    mananaInicio.value = timeValue(firstMondaySlot.hora_inicio);
    mananaFin.value = timeValue(firstMondaySlot.hora_fin);
    tardeInicio.value = timeValue(secondMondaySlot.hora_inicio);
    tardeFin.value = timeValue(secondMondaySlot.hora_fin);
  }

  const saturdayId = dayId("sabado");
  const saturday = rows.find((row) => row.id_dia === saturdayId);
  if (saturday) {
    sabado.value = true;
    sabInicio.value = timeValue(saturday.hora_inicio);
    sabFin.value = timeValue(saturday.hora_fin);
  }
}

async function cargarHorarios(): Promise<void> {
  loading.value = true;
  try {
    const result = await $service.graphql<{
      horarios: { rows: ScheduleRecord[]; count: number };
    }>({
      query: $querys.queryWithVar(
        "horario",
        "id_horario id_servicio id_profesional id_dia hora_inicio hora_fin id_estado",
      ),
      variables: {
        limit: 100,
        pagina: 1,
        search: {
          id_servicio: props.servicio.id,
          id_profesional: props.idProfesional ?? null,
        },
        order: { columna: "hora_inicio", order: "ASC" },
      },
    });
    applyExistingSchedule(result.horarios.rows);
  } catch (error) {
    useMessage().error(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los horarios del servicio",
    );
  } finally {
    loading.value = false;
  }
}

function crearSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (const weekday of WEEKDAY_NAMES) {
    const id = dayId(weekday);
    if (id === undefined) {
      throw new Error(`Falta un parámetro único para el día ${weekday}`);
    }
    if (modalidad.value === "continua") {
      slots.push({ id_dia: id, hora_inicio: inicio.value, hora_fin: fin.value });
    } else {
      slots.push(
        {
          id_dia: id,
          hora_inicio: mananaInicio.value,
          hora_fin: mananaFin.value,
        },
        {
          id_dia: id,
          hora_inicio: tardeInicio.value,
          hora_fin: tardeFin.value,
        },
      );
    }
  }

  if (sabado.value) {
    const id = dayId("sabado");
    if (id === undefined) {
      throw new Error("Falta crear el parámetro del día sábado");
    }
    slots.push({ id_dia: id, hora_inicio: sabInicio.value, hora_fin: sabFin.value });
  }

  for (const slot of slots) {
    if (!slot.hora_inicio || !slot.hora_fin || slot.hora_inicio >= slot.hora_fin) {
      throw new Error("Cada hora de fin debe ser posterior a la hora de inicio");
    }
  }
  if (modalidad.value === "discontinua" && mananaFin.value > tardeInicio.value) {
    throw new Error("El turno de tarde debe iniciar después del turno de mañana");
  }
  return slots;
}

async function createHorario(slot: TimeSlot): Promise<void> {
  await $service.graphql({
    query: $querys.mutationCreateWithVariable("horario", "id_horario"),
    variables: {
      datos: {
        id_servicio: props.servicio.id,
        id_profesional: props.idProfesional ?? null,
        ...slot,
        id_estado: 1,
      },
    },
  });
}

async function updateHorario(
  existing: ScheduleRecord,
  slot: TimeSlot,
): Promise<void> {
  await $service.graphql({
    query: $querys.mutationEditWithVariable("horario", "id_horario"),
    variables: {
      datos: {
        id_horario: existing.id_horario,
        id_servicio: props.servicio.id,
        id_profesional: props.idProfesional ?? null,
        ...slot,
      },
    },
  });
}

async function removeHorario(existing: ScheduleRecord): Promise<void> {
  await $service.graphql({
    query: $querys.mutationDeleteWithVariable(
      "horario",
      "Int",
      "id_horario",
      "id_horario",
    ),
    variables: { id_horario: existing.id_horario },
  });
}

async function guardarDesdeDialogo(): Promise<void> {
  await guardar();
}

async function guardar(): Promise<void> {
  const desiredSlots = crearSlots();
  try {
    if (!props.idProfesional) {
      await $service.graphql({
        query: `mutation ActualizarHorarioServicio($datos: UpdateServicioInput!) { updateServicio(updateServicioInput: $datos) { id } }`,
        variables: { datos: { id: props.servicio.id, horarios: desiredSlots } },
      });
      await cargarHorarios();
      return;
    }
    const previousByDay = new Map<number, ScheduleRecord[]>();
    for (const row of horariosActuales.value) {
      const dayRows = previousByDay.get(row.id_dia) ?? [];
      dayRows.push(row);
      previousByDay.set(row.id_dia, dayRows);
    }
    for (const rows of previousByDay.values()) {
      rows.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    }

    const desiredByDay = new Map<number, TimeSlot[]>();
    for (const slot of desiredSlots) {
      const daySlots = desiredByDay.get(slot.id_dia) ?? [];
      daySlots.push(slot);
      desiredByDay.set(slot.id_dia, daySlots);
    }

    for (const [idDia, slots] of desiredByDay) {
      const current = previousByDay.get(idDia) ?? [];
      for (let index = 0; index < slots.length; index += 1) {
        const slot = slots[index];
        if (!slot) throw new Error("No se encontró la franja horaria configurada");
        const existing = current[index];
        if (existing) await updateHorario(existing, slot);
        else await createHorario(slot);
      }
    }

    for (const [idDia, rows] of previousByDay) {
      const retained = desiredByDay.get(idDia)?.length ?? 0;
      for (const stale of rows.slice(retained)) await removeHorario(stale);
    }
  } catch (error) {
    await cargarHorarios();
    throw new Error(
      error instanceof Error
        ? `No se pudieron guardar todos los horarios: ${error.message}`
        : "No se pudieron guardar todos los horarios",
    );
  }
}
watch(
  () => [props.modelValue, props.servicio.id] as const,
  ([open]) => {
    if (open) void cargarHorarios();
  },
  { immediate: true },
);
</script>
