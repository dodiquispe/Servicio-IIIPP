<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">SECRETARÍA</div>
        <h1 class="text-h4">Pagos de reservas</h1>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>
    <v-alert type="info" variant="outlined" class="mb-4">
      Aquí se muestran todos los pagos informados. Verifique el pago por el
      medio institucional antes de marcarlo como exitoso.
    </v-alert>

    <CommonCrudTable
      tabla="reserva"
      titulo="Pagos de reservas"
      :headers="headers"
      getrows=""
      :filters="[]"
      :inputs="[]"
      :source-items="pagos"
      :source-loading="cargando"
      :acciones="false"
    >
      <template #source-toolbar>
        <v-spacer />
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="cargarPagos"
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
      <template #estado_pago="{ item }">
        <div class="d-flex flex-column align-start ga-2">
          <v-chip
            size="small"
            :color="item.estado_pago === 'PAGADO' ? 'success' : item.estado_pago === 'PENDIENTE' ? 'warning' : 'default'"
            variant="tonal"
          >
            {{ estadoPago(item.estado_pago) }}
          </v-chip>
          <v-btn
            v-if="item.estado_pago === 'PENDIENTE' && item.comprobante_mime_type"
            size="small"
            color="success"
            variant="flat"
            prepend-icon="mdi-check-decagram"
            :loading="verificando === item.id"
            @click="verificarPago(item)"
          >
            Marcar verificado
          </v-btn>
        </div>
      </template>
      <template #comprobante_mime_type="{ item }">
        <v-btn
          v-if="item.comprobante_mime_type"
          size="small"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-image"
          :loading="cargandoComprobante === item.id"
          @click="verComprobante(item)"
        >
          Ver factura
        </v-btn>
        <span v-else class="text-medium-emphasis">Sin comprobante</span>
      </template>
    </CommonCrudTable>

    <v-dialog v-model="comprobanteDialog" max-width="760">
      <v-card>
        <v-card-title>Comprobante de pago</v-card-title>
        <v-card-text>
          <v-alert v-if="errorComprobante" type="error" variant="tonal">
            {{ errorComprobante }}
          </v-alert>
          <v-img
            v-if="comprobanteSrc"
            :src="comprobanteSrc"
            max-height="70vh"
            contain
            alt="Imagen del comprobante enviado por la paciente"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="comprobanteDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";

interface PagoReserva {
  id: string;
  fecha: string;
  hora_inicio: string;
  estado_reserva: string;
  estado_pago: string | null;
  monto: string | null;
  nit_factura: string | null;
  razon_social_factura: string | null;
  comprobante_mime_type: string | null;
  servicio: { servicio: string };
  expediente: {
    codigo_caso: string;
    persona: {
      nombres: string;
      primer_apellido: string | null;
      segundo_apellido: string | null;
      nro_documento: string | null;
      movil: string | null;
      correo_personal: string | null;
    };
  };
}

const { $service } = useNuxtApp();
const pagos = ref<PagoReserva[]>([]);
const cargando = ref(false);
const verificando = ref("");
const cargandoComprobante = ref("");
const comprobanteDialog = ref(false);
const comprobanteSrc = ref("");
const errorComprobante = ref("");
const error = ref("");
const headers = [
  { title: "Paciente", key: "paciente", crearColumna: true },
  { title: "CI", key: "expediente.persona.nro_documento" },
  { title: "Caso", key: "expediente.codigo_caso" },
  { title: "Servicio", key: "servicio.servicio" },
  { title: "Fecha", key: "fecha", crearColumna: true },
  { title: "Hora", key: "hora_inicio", crearColumna: true },
  { title: "NIT / CI factura", key: "nit_factura" },
  { title: "Razón social", key: "razon_social_factura" },
  { title: "Comprobante", key: "comprobante_mime_type", crearColumna: true },
  { title: "Estado del pago", key: "estado_pago", crearColumna: true },
];

let intervaloPagos: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  void cargarPagos();
  intervaloPagos = setInterval(() => void cargarPagos(), 30_000);
});

onBeforeUnmount(() => {
  if (intervaloPagos) clearInterval(intervaloPagos);
});

async function cargarPagos() {
  if (cargando.value) return;
  cargando.value = true;
  error.value = "";
  try {
    const result = await $service.graphql<{ reservas: PagoReserva[] }>({
      query: $querys.staff.pagosSecretaria,
    });
    pagos.value = ordenarPagos(result.reservas);
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los pagos.";
  } finally {
    cargando.value = false;
  }
}

async function verificarPago(pago: PagoReserva) {
  verificando.value = pago.id;
  error.value = "";
  try {
    const result = await $service.graphql<{
      verificarPagoReserva: { estado_pago: string; estado_reserva: string };
    }>({
      query: $querys.staff.verificarPago,
      variables: { id: pago.id },
    });
    pago.estado_pago = result.verificarPagoReserva.estado_pago;
    pago.estado_reserva = result.verificarPagoReserva.estado_reserva;
    pagos.value = ordenarPagos([...pagos.value]);
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo verificar el pago.";
  } finally {
    verificando.value = "";
  }
}

async function verComprobante(pago: PagoReserva) {
  cargandoComprobante.value = pago.id;
  errorComprobante.value = "";
  comprobanteSrc.value = "";
  comprobanteDialog.value = true;
  try {
    const result = await $service.graphql<{
      comprobantePagoReserva: { mime_type: string; base64: string } | null;
    }>({
      query: $querys.staff.comprobantePagoSecretaria,
      variables: { id: pago.id },
    });
    const receipt = result.comprobantePagoReserva;
    if (!receipt) {
      throw new Error("No se encontró el comprobante adjunto a esta reserva.");
    }
    comprobanteSrc.value = `data:${receipt.mime_type};base64,${receipt.base64}`;
  } catch (requestError) {
    errorComprobante.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo cargar el comprobante.";
  } finally {
    cargandoComprobante.value = "";
  }
}

function nombrePaciente(pago: PagoReserva) {
  const persona = pago.expediente.persona;
  return [persona.nombres, persona.primer_apellido, persona.segundo_apellido]
    .filter(Boolean)
    .join(" ");
}

function estadoPago(status: string | null) {
  if (status === "PAGADO") return "Verificado";
  if (status === "PENDIENTE") return "Por verificar";
  return "Sin pago informado";
}

function ordenarPagos(items: PagoReserva[]): PagoReserva[] {
  const prioridad = (pago: PagoReserva) => {
    if (pago.estado_pago === "PENDIENTE" && pago.comprobante_mime_type) return 0;
    if (pago.estado_pago === "PENDIENTE") return 1;
    return 2;
  };

  return [...items].sort((a, b) => {
    const porEstado = prioridad(a) - prioridad(b);
    if (porEstado !== 0) return porEstado;
    const fechaHoraA = `${a.fecha}T${a.hora_inicio}`;
    const fechaHoraB = `${b.fecha}T${b.hora_inicio}`;
    return fechaHoraB.localeCompare(fechaHoraA);
  });
}

function formatoFecha(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}
</script>
