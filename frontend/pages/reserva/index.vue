<template>
  <v-container class="booking-page" max-width="900">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
      <div class="text-overline text-primary">RESERVA · PASO 2 DE 3</div>
      <h1 class="text-h4 mb-2">Elige servicio y horario</h1>
      <p class="text-body-1 mb-6">
        Selecciona un servicio, un día y uno de los horarios que todavía tienen
        cupo.
      </p>

      <v-alert v-if="!admision.id_persona" type="warning" variant="tonal" class="mb-5">
        Primero verifica tu carnet en admisión.
        <NuxtLink to="/">Volver a admisión</NuxtLink>
      </v-alert>

      <v-select
        v-model="reserva.id_servicio"
        :items="servicios"
        item-title="servicio"
        item-value="id"
        label="Servicio"
        prepend-inner-icon="mdi-medical-bag"
        :loading="cargandoServicios"
        no-data-text="No hay datos registrados"
        :disabled="!admision.id_persona"
      />

      <v-textarea
        v-model="reserva.motivo_consulta"
        label="Motivo de consulta"
        maxlength="500"
        rows="2"
        counter
        required
      />

      <h2 class="text-h6 mt-4 mb-3">Selecciona un día</h2>
      <div class="date-picker">
        <v-btn
          icon="mdi-chevron-left"
          variant="outlined"
          aria-label="Fechas anteriores"
          :disabled="dateOffset === 0"
          @click="changeDatePage(-1)"
        />
        <div class="date-list" role="list" aria-label="Próximas fechas disponibles">
          <button
            v-for="day in visibleDays"
            :key="day.value"
            type="button"
            class="date-card"
            :class="{ 'date-card--selected': reserva.fecha === day.value }"
            :disabled="cargandoFechasBloqueadas || Boolean(errorFechasBloqueadas) || Boolean(blockedDates[day.value])"
            :title="blockedDates[day.value] ? `No disponible: ${blockedDates[day.value]}` : undefined"
            :aria-pressed="reserva.fecha === day.value"
            @click="selectDay(day.value)"
          >
            <span class="date-weekday">{{ day.weekday }}</span>
            <span class="date-number">{{ day.number }}</span>
            <span class="date-month">{{ day.month }}</span>
            <span v-if="blockedDates[day.value]" class="date-blocked">{{ blockedDates[day.value] }}</span>
          </button>
        </div>
        <div v-if="cargandoFechasBloqueadas" class="text-body-2 text-medium-emphasis mt-2" role="status">
          Consultando fechas no disponibles…
        </div>
        <v-alert v-else-if="errorFechasBloqueadas" type="error" variant="tonal" class="mt-2">
          {{ errorFechasBloqueadas }}
        </v-alert>
        <v-btn
          icon="mdi-chevron-right"
          variant="outlined"
          aria-label="Fechas siguientes"
          @click="changeDatePage(1)"
        />
      </div>

      <div v-if="reserva.fecha && reserva.id_servicio" class="mt-6">
        <h2 class="text-h6 mb-3">Horarios disponibles</h2>
        <div v-if="cargandoHorarios" class="py-4 text-medium-emphasis">
          Consultando disponibilidad…
        </div>
        <div v-else-if="horarios.length" class="time-list">
          <v-btn
            v-for="slot in horarios"
            :key="`${slot.hora_inicio}-${slot.id_profesional}`"
            :variant="horarioSeleccionado === slot ? 'flat' : 'outlined'"
            :color="horarioSeleccionado === slot ? 'primary' : undefined"
            class="time-option"
            @click="horarioSeleccionado = slot"
          >
            {{ formatoHora(slot.hora_inicio) }}
          </v-btn>
        </div>
        <v-alert v-else-if="cierreAgenda" type="warning" variant="outlined">
          No habrá atención este día por: {{ cierreAgenda }}.
        </v-alert>
        <v-alert v-else type="info" variant="tonal">
          No hay horarios disponibles para este día. Prueba con otra fecha.
        </v-alert>
      </div>

      <v-alert v-if="error" class="mt-5" type="error" variant="tonal">
        {{ error }}
      </v-alert>

      <div class="d-flex justify-space-between flex-wrap ga-3 mt-6">
        <v-btn variant="outlined" prepend-icon="mdi-arrow-left" to="/">
          Volver
        </v-btn>
        <v-btn
          color="primary"
          append-icon="mdi-arrow-right"
          :loading="reservando"
          :disabled="
            !admision.id_persona ||
            !reserva.id_servicio ||
            !reserva.fecha ||
            !horarioSeleccionado ||
            !reserva.motivo_consulta.trim()
          "
          @click="continuar"
        >
          Confirmar reserva
        </v-btn>
      </div>
    </v-card>


    <v-dialog v-model="confirmacionPrevia" max-width="680">
      <v-card class="formal-dialog">
        <v-card-title class="text-h6">Importante antes de continuar</v-card-title>
        <v-card-text>
          <p>
            <strong>IMPORTANTE:</strong> Verifica el servicio, la fecha y el horario antes de confirmar tu reserva.
          </p>
          <p class="mt-4">
            Si el formulario se registró correctamente, aparecerá una ventana
            de <strong>CONFIRMACIÓN DE RESERVA EXITOSA</strong>. La confirmación
            de pago será revisada por secretaría.
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="confirmacionPrevia = false">Volver</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="reservando"
            @click="crearReserva"
          >
            Continuar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";

definePageMeta({ layout: "public" });

interface Servicio {
  id: string;
  servicio: string;
  descripcion: string;
  duracion_sesion_min: number;
  id_estado: number;
}

interface HorarioDisponible {
  hora_inicio: string;
  hora_fin: string;
  id_profesional: string;
}

interface ReservaPublicaCreada {
  expediente: { id: string; codigo_caso: string };
  reserva: {
    id: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
  };
}

const { $service } = useNuxtApp();
const router = useRouter();
const admision = useState("reserva-admision", () => ({
  ci: "",
  id_persona: "",
  nombres: "",
  primer_apellido: "",
  segundo_apellido: "",
  movil: "",
  correo_personal: "",
  id_genero: null as number | null,
  id_expedito: null as number | null,
  expedito_input: null as number | string | null,
}));
const reserva = useState("reserva-datos", () => ({
  id_servicio: "",
  fecha: "",
  motivo_consulta: "",
}));
const confirmacion = useState("reserva-confirmacion", () => ({
  id_reserva: "",
  codigo_caso: "",
  servicio: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  nit_factura: "",
  razon_social_factura: "",
  estado_pago: "",
  tiene_comprobante: false,
}));
const servicios = ref<Servicio[]>([]);
const horarios = ref<HorarioDisponible[]>([]);
const cierreAgenda = ref("");
const horarioSeleccionado = ref<HorarioDisponible | null>(null);
const cargandoServicios = ref(false);
const cargandoHorarios = ref(false);
const reservando = ref(false);
const error = ref("");
const dateOffset = ref(0);
const confirmacionPrevia = ref(false);
const blockedDates = ref<Record<string, string>>({});
const cargandoFechasBloqueadas = ref(false);
let bloqueosRequest = 0;
let horariosRequest = 0;
const errorFechasBloqueadas = ref("");

const days = computed(() => {
  const result: Array<{
    value: string;
    weekday: string;
    number: string;
    month: string;
  }> = [];
  const [year, month, day] = localDate(new Date()).split("-").map(Number);
  const firstDay = new Date(Date.UTC(year!, month! - 1, day!));
  for (let offset = 0; offset < Math.max(30, dateOffset.value + 14); offset += 1) {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + offset);
    result.push({
      value: date.toISOString().slice(0, 10),
      weekday: new Intl.DateTimeFormat("es", { weekday: "short", timeZone: "UTC" })
        .format(date)
        .replace(".", ""),
      number: String(date.getUTCDate()),
      month: new Intl.DateTimeFormat("es", { month: "short", timeZone: "UTC" })
        .format(date)
        .replace(".", ""),
    });
  }
  return result;
});
const visibleDays = computed(() => days.value.slice(dateOffset.value, dateOffset.value + 7));

onMounted(async () => {
  if (!admision.value.id_persona) return;
  cargandoServicios.value = true;
  try {
    const result = await $service.graphql<{
      servicios: { rows: Servicio[] };
    }>({
      query: $querys.publicas.servicios,
    });
    servicios.value = result.servicios.rows.filter(
      (service) => service.id_estado === 1,
    );
    if (
      !reserva.value.fecha ||
      reserva.value.fecha < (days.value[0]?.value ?? "")
    ) {
      reserva.value.fecha = days.value[0]?.value ?? "";
    }
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los servicios.";
  } finally {
    cargandoServicios.value = false;
  }

});

watch(
  () => [reserva.value.id_servicio, dateOffset.value] as const,
  async ([idServicio]) => {
    const requestId = ++bloqueosRequest;
    blockedDates.value = {};
    errorFechasBloqueadas.value = "";
    cargandoFechasBloqueadas.value = Boolean(idServicio);
    if (!idServicio) return;
    const desde = visibleDays.value[0]?.value;
    const hasta = visibleDays.value.at(-1)?.value;
    if (!desde || !hasta) return;
    try {
      const result = await $service.graphql<{
        fechasBloqueadasReserva: Array<{ fecha: string; tipo: string }>;
      }>({
        query: `query($id: String!, $desde: String!, $hasta: String!, $persona: String) {
          fechasBloqueadasReserva(id_servicio: $id, desde: $desde, hasta: $hasta, id_persona: $persona) { fecha tipo }
        }`,
        variables: { id: idServicio, desde, hasta, persona: admision.value.id_persona || null },
      });
      if (requestId !== bloqueosRequest) return;
      blockedDates.value = Object.fromEntries(
        result.fechasBloqueadasReserva.map((block) => [block.fecha, block.tipo]),
      );
    } catch (requestError) {
      if (requestId === bloqueosRequest) errorFechasBloqueadas.value = requestError instanceof Error ? requestError.message : 'No se pudieron cargar los días disponibles.';
    } finally {
      if (requestId === bloqueosRequest) cargandoFechasBloqueadas.value = false;
    }
  },
);

watch(
  () => [reserva.value.id_servicio, reserva.value.fecha] as const,
  async ([idServicio, fecha]) => {
    const requestId = ++horariosRequest;
    horarioSeleccionado.value = null;
    horarios.value = [];
    cierreAgenda.value = "";
    if (!idServicio || !fecha) {
      cargandoHorarios.value = false;
      return;
    }
    cargandoHorarios.value = true;
    error.value = "";
    try {
      const [availability, closure] = await Promise.all([
        $service.graphql<{ horariosDisponibles: HorarioDisponible[] }>({
          query: $querys.publicas.horariosDisponibles,
          variables: {
            id: idServicio,
            fecha,
            id_persona: admision.value.id_persona,
          },
        }),
        $service.graphql<{ avisoCierreAgenda: string | null }>({
          query: $querys.publicas.avisoCierreAgenda,
          variables: { fecha },
        }),
      ]);
      if (requestId !== horariosRequest) return;
      horarios.value = availability.horariosDisponibles;
      cierreAgenda.value = closure.avisoCierreAgenda ?? "";
    } catch (requestError) {
      if (requestId !== horariosRequest) return;
      error.value =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo consultar la disponibilidad.";
    } finally {
      if (requestId === horariosRequest) cargandoHorarios.value = false;
    }
  },
);

function selectDay(date: string) {
  if (blockedDates.value[date]) return;
  reserva.value.fecha = date;
}

function changeDatePage(direction: -1 | 1) {
  dateOffset.value = Math.min(
    Math.max(dateOffset.value + direction * 7, 0),
    Math.max(days.value.length - 7, 0),
  );
}

function continuar() {
  if (
    !admision.value.id_persona ||
    !reserva.value.id_servicio ||
    !reserva.value.fecha ||
    !horarioSeleccionado.value ||
    !reserva.value.motivo_consulta.trim()
  ) {
    return;
  }
  confirmacionPrevia.value = true;
}

async function crearReserva() {
  const selectedSlot = horarioSeleccionado.value;
  const selectedService = servicios.value.find(
    (service) => service.id === reserva.value.id_servicio,
  );
  if (!selectedSlot || !selectedService || !admision.value.id_persona) return;

  reservando.value = true;
  confirmacionPrevia.value = false;
  error.value = "";
  try {
    const result = await $service.graphql<{
      createReservaPublica: ReservaPublicaCreada;
    }>({
      query: $querys.publicas.crearReserva,
      variables: {
        input: {
          id_persona: admision.value.id_persona,
          id_servicio: selectedService.id,
          id_profesional: selectedSlot.id_profesional,
          fecha: reserva.value.fecha,
          hora_inicio: selectedSlot.hora_inicio,
          motivo_consulta: reserva.value.motivo_consulta.trim(),
        },
      },
    });
    const booking = result.createReservaPublica.reserva;
    confirmacion.value = {
      id_reserva: booking.id,
      codigo_caso: result.createReservaPublica.expediente.codigo_caso,
      servicio: selectedService.servicio,
      fecha: booking.fecha,
      hora_inicio: booking.hora_inicio,
      hora_fin: booking.hora_fin,
      nit_factura: "",
      razon_social_factura: "",
      estado_pago: "PENDIENTE",
      tiene_comprobante: false,
    };
    await router.push("/pago");
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo completar la reserva. Elige otro horario e inténtalo nuevamente.";
  } finally {
    reservando.value = false;
  }
}

function localDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatoHora(time: string) {
  return time.slice(0, 5);
}
</script>

<style scoped>
.formal-dialog {
  border: 1px solid #d5dde3;
  border-radius: 6px;
  box-shadow: 0 12px 36px rgb(20 35 45 / 18%);
}

.formal-dialog > .v-card-title {
  padding: 22px 24px 12px;
  color: #1d3442;
  font-weight: 600;
}

.formal-dialog > .v-card-text {
  padding: 12px 24px 20px;
  color: #263640;
  line-height: 1.65;
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-list,
.time-list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  min-width: 0;
}

.date-card {
  width: 82px;
  min-height: 104px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #16495f;
  background: #fff;
  border: 1px solid #c9dbe4;
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease,
    transform 120ms ease;
}

.date-card:hover {
  transform: translateY(-2px);
  border-color: #0086bf;
}

.date-card:disabled {
  color: rgba(var(--v-theme-on-surface), 0.55);
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-color: rgba(var(--v-theme-on-surface), 0.18);
  cursor: not-allowed;
  transform: none;
}

.date-blocked {
  font-size: 0.65rem;
  line-height: 1;
  text-transform: capitalize;
}

.date-card--selected {
  color: #fff;
  background: #087ead;
  border-color: #087ead;
}

.date-weekday,
.date-month {
  font-size: 0.78rem;
  text-transform: capitalize;
}

.date-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.15;
}

@media (max-width: 600px) {
  .date-picker {
    gap: 6px;
  }

  .date-list {
    gap: 5px;
    overflow: hidden;
  }

  .date-card {
    flex: 1 1 0;
    min-width: 0;
    min-height: 88px;
    padding-inline: 2px;
  }

  .date-number {
    font-size: 1.5rem;
  }
}

.time-option {
  min-width: 104px;
  flex: 0 1 140px;
}

@media (max-width: 600px) {
  .date-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .date-card {
    width: 100%;
  }
}
</style>
