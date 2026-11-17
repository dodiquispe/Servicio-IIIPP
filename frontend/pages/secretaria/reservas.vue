<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">SECRETARÍA</div>
        <h1 class="text-h4">Reservas recibidas</h1>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>
    <v-alert type="info" variant="tonal" class="mb-4">
      La verificación de pagos y datos de factura se realiza en la vista de pagos.
    </v-alert>

    <CommonCrudTable
      tabla="reserva"
      titulo="Reservas recibidas"
      :headers="headers"
      getrows=""
      :filters="[]"
      :inputs="[]"
      :source-items="reservas"
      :source-loading="cargando"
      :acciones="false"
      :source-reload="cargarReservas"
    >
      <template #source-toolbar>
        <v-spacer />
        <v-btn to="/secretaria/pagos" color="primary" variant="tonal" prepend-icon="mdi-cash-check">
          Revisar pagos
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="cargarReservas"
        >
          Actualizar
        </v-btn>
      </template>
      <template #paciente="{ item }">
        {{ nombrePaciente(item) }}
      </template>
      <template #fecha="{ item }">
        {{ formatoFecha(item.fecha) }}
      </template>
      <template #hora_inicio="{ item }">
        {{ item.hora_inicio.slice(0, 5) }}
      </template>
      <template #estado_reserva="{ item }">
        <v-chip
          size="small"
          :color="item.estado_reserva === 'CONFIRMADA' ? 'success' : 'primary'"
          variant="tonal"
        >
          {{ item.estado_reserva === "CONFIRMADA" ? "Exitosa" : "Por confirmar" }}
        </v-chip>
      </template>
      <template #acciones="{ item }">
        <v-btn v-if="['RESERVADA', 'PENDIENTE_PAGO'].includes(String(item.estado_reserva)) && item.estado_pago !== 'PAGADO'" size="small" variant="tonal" color="primary" :loading="confirmando === item.id" @click="pagoSimulado(item)">Pago simulado</v-btn>
        <v-btn
          v-if="item.estado_reserva === 'RESERVADA' && item.canal === 'PRESENCIAL'"
          size="small"
          color="success"
          variant="flat"
          class="table-action-btn"
          prepend-icon="mdi-check"
          :loading="confirmando === item.id"
          @click="confirmarReserva(item)"
        >
          Confirmar reserva
        </v-btn>
        <span
          v-else-if="item.canal === 'WEB' && item.estado_pago === 'PENDIENTE'"
          class="text-medium-emphasis"
        >
          Pago por verificar
        </span>
        <span
          v-else-if="item.canal === 'WEB' && item.estado_pago !== 'PAGADO'"
          class="text-medium-emphasis"
        >
          Pago pendiente
        </span>
        <span v-else class="text-medium-emphasis">Confirmada</span>
      </template>
    </CommonCrudTable>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";
import type { CrudRecord } from "~/interfaces/app/common";

interface Reserva extends CrudRecord {
  id: string;
  fecha: string;
  hora_inicio: string;
  canal: string;
  estado_reserva: string;
  estado_pago: string | null;
  servicio: { servicio: string };
  expediente: {
    codigo_caso: string;
    persona: {
      nombres: string;
      primer_apellido: string | null;
      segundo_apellido: string | null;
    };
  };
}

const { $service } = useNuxtApp();
const reservas = ref<Reserva[]>([]);
const cargando = ref(false);
const confirmando = ref("");
const error = ref("");
const headers = [
  { title: "Paciente", key: "paciente", crearColumna: true },
  { title: "Caso", key: "expediente.codigo_caso" },
  { title: "Servicio", key: "servicio.servicio" },
  { title: "Fecha", key: "fecha", crearColumna: true },
  { title: "Hora", key: "hora_inicio", crearColumna: true },
  { title: "Estado", key: "estado_reserva", crearColumna: true },
  { title: "Acciones", key: "acciones", sortable: false },
];

onMounted(() => void cargarReservas());

async function pagoSimulado(item: CrudRecord) {
  confirmando.value = String(item.id); error.value = '';
  try {
    const pending = await $service.graphql<{ pagosReserva: { id: string; estado: { descripcion: string } }[] }>({ query: 'query($id: String!) { pagosReserva(idReserva: $id) { id estado { descripcion } } }', variables: { id: item.id } });
    let idPago = pending.pagosReserva.find(p => p.estado.descripcion === 'PENDIENTE')?.id;
    if (!idPago) {
      const result = await $service.graphql<{ iniciarPago: { id: string } }>({ query: 'mutation($id: String!) { iniciarPago(idReserva: $id) { id } }', variables: { id: item.id } });
      idPago = result.iniciarPago.id;
    }
    await $service.graphql({ query: 'mutation($id: String!) { confirmarPagoSimulado(idPago: $id) { id estado { descripcion } } }', variables: { id: idPago } });
    await cargarReservas();
  } catch (e) { error.value = e instanceof Error ? e.message : 'No se pudo confirmar el pago simulado'; }
  finally { confirmando.value = ''; }
}

async function cargarReservas() {
  cargando.value = true;
  error.value = "";
  try {
    const result = await $service.graphql<{ reservas: Reserva[] }>({
      query: $querys.staff.reservasSecretaria,
      variables: {
        desde: localDate(new Date()),
        hasta: localDate(addDays(new Date(), 90)),
      },
    });
    reservas.value = result.reservas;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar las reservas.";
  } finally {
    cargando.value = false;
  }
}

async function confirmarReserva(reserva: Reserva) {
  confirmando.value = reserva.id;
  error.value = "";
  try {
    const result = await $service.graphql<{
      cambiarEstadoReserva: { estado_reserva: string };
    }>({
      query: $querys.staff.confirmarReserva,
      variables: {
        input: { id: reserva.id, estado_reserva: "CONFIRMADA" },
      },
    });
    reserva.estado_reserva = result.cambiarEstadoReserva.estado_reserva;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo confirmar la reserva.";
  } finally {
    confirmando.value = "";
  }
}

function nombrePaciente(reserva: Reserva) {
  const persona = reserva.expediente.persona;
  return [persona.nombres, persona.primer_apellido, persona.segundo_apellido]
    .filter(Boolean)
    .join(" ");
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function formatoFecha(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}
</script>
