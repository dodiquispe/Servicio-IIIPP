<template>
  <v-container max-width="760">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
      <div class="text-overline text-primary">RESERVA · CONFIRMACIÓN</div>
      <v-icon color="success" size="42" class="my-3">mdi-check-circle</v-icon>
      <h1 class="text-h4 mb-2">Reserva confirmada</h1>
      <p class="text-body-1 mb-5">
        Tu reserva fue registrada correctamente. Continúa para ingresar los
        datos de facturación y, si ya realizaste el pago, solicitar su
        verificación.
      </p>

      <v-alert v-if="!confirmacion.id_reserva" type="warning" variant="tonal">
        No hay una reserva para mostrar.
        <NuxtLink to="/">Inicia el proceso de admisión</NuxtLink>.
      </v-alert>

      <v-list v-else lines="two" rounded="lg">
        <v-list-item title="Código de caso" :subtitle="confirmacion.codigo_caso" />
        <v-list-item title="Referencia de reserva" :subtitle="confirmacion.id_reserva" />
        <v-list-item title="Paciente" :subtitle="nombrePaciente" />
        <v-list-item title="Servicio" :subtitle="confirmacion.servicio" />
        <v-list-item title="Fecha" :subtitle="formatoFecha(confirmacion.fecha)" />
        <v-list-item
          title="Horario"
          :subtitle="`${confirmacion.hora_inicio.slice(0, 5)} – ${confirmacion.hora_fin.slice(0, 5)}`"
        />
      </v-list>

      <div class="d-flex justify-end flex-wrap ga-3 mt-5">
        <v-btn variant="outlined" to="/">Volver al inicio</v-btn>
        <v-btn color="primary" to="/pago">Continuar a pago y factura</v-btn>
        <v-btn color="primary" to="/reserva">Realizar otra reserva</v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

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
const admision = useState("reserva-admision", () => ({
  ci: "",
  id_persona: "",
  nombres: "",
  primer_apellido: "",
  segundo_apellido: "",
  edad: null as number | null,
  procedencia: "",
  id_genero: null as number | null,
  id_expedito: null as number | null,
  movil: "",
  correo_personal: "",
}));

const nombrePaciente = computed(
  () =>
    [
      admision.value.nombres,
      admision.value.primer_apellido,
      admision.value.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ") || "Paciente",
);

function formatoFecha(date: string): string {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es", {
    dateStyle: "long",
  }).format(new Date(year, month - 1, day));
}
</script>
