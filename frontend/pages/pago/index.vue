<!-- <template>
  <v-container max-width="760">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
      <div class="text-overline text-primary">RESERVA · PAGO Y FACTURA</div>
      <h1 class="text-h4 mb-2">Resumen de reserva</h1>
      <p class="text-body-1 mb-5">
        La reserva fue registrada. Si ya realizó el pago, envíe los datos de
        facturación para que secretaría verifique la transacción.
      </p>

      <v-alert
        v-if="!confirmacion.id_reserva"
        type="warning"
        variant="outlined"
      >
        No hay una reserva en esta sesión.
        <NuxtLink to="/">Inicia el proceso de admisión</NuxtLink>.
      </v-alert>

      <template v-else>
        <v-alert
          v-if="errorEstado"
          type="warning"
          variant="outlined"
          class="mb-5"
        >
          {{ errorEstado }}
        </v-alert>
        <h2 class="text-h6 mb-2">Datos de la paciente</h2>
        <v-list lines="two" rounded="lg" class="mb-5">
          <v-list-item title="Paciente" :subtitle="nombrePaciente" />
          <v-list-item title="Carnet de identidad" :subtitle="carnetPaciente" />
          <v-list-item
            title="Celular"
            :subtitle="admision.movil || 'No registrado'"
          />
          <v-list-item
            title="Correo de referencia"
            :subtitle="admision.correo_personal || 'No registrado'"
          />
        </v-list>

        <h2 class="text-h6 mb-2">Datos de la reserva</h2>
        <v-list lines="two" rounded="lg" class="mb-5">
          <v-list-item
            title="Código de caso"
            :subtitle="confirmacion.codigo_caso"
          />
          <v-list-item
            title="Referencia de reserva"
            :subtitle="confirmacion.id_reserva"
          />
          <v-list-item title="Servicio" :subtitle="confirmacion.servicio" />
          <v-list-item
            title="Fecha"
            :subtitle="formatoFecha(confirmacion.fecha)"
          />
          <v-list-item
            title="Horario"
            :subtitle="`${confirmacion.hora_inicio.slice(0, 5)} – ${confirmacion.hora_fin.slice(0, 5)}`"
          />
        </v-list>
        <v-alert
          v-else-if="confirmacion.estado_pago === 'PAGADO'"
          type="success"
          variant="outlined"
          class="mb-5"
        >
          El pago fue verificado y la reserva está confirmada.
        </v-alert>

        <v-card class="mb-6 pa-5 text-center" variant="outlined">
          <div class="text-overline">Código QR</div>
          <v-icon size="128" color="primary" aria-label="Código QR simulado">
            mdi-qrcode
          </v-icon>
          <div class="text-subtitle-1 font-weight-medium"></div>
        </v-card>

        <v-form
          v-if="confirmacion.estado_pago !== 'PAGADO'"
          @submit.prevent="solicitarVerificacion"
        >
          <h2 class="text-h6 mb-2">Datos para la factura</h2>
          <v-text-field
            v-model="confirmacion.razon_social_factura"
            label="Razón social"
            maxlength="200"
            required
          />
          <v-text-field
            v-model="confirmacion.nit_factura"
            label="NIT o CI para la factura"
            maxlength="50"
            required
          />
          
          <v-file-input
            accept="image/jpeg,image/png,image/webp"
            label="Foto del comprobante de pago"
            prepend-icon="mdi-camera"
            show-size
            :required="!confirmacion.tiene_comprobante"
            @change="seleccionarComprobante"
          />
          <v-img
            v-if="comprobantePreview"
            :src="comprobantePreview"
            max-height="280"
            contain
            class="mb-4"
            alt="Vista previa del comprobante de pago"
          />
          <v-alert
            v-else-if="confirmacion.tiene_comprobante"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            Ya hay un comprobante adjunto. Selecciona otra imagen solo si deseas
            reemplazarlo.
          </v-alert>

          <v-alert v-if="error" type="error" variant="outlined" class="mb-4">
            {{ error }}
          </v-alert>

          <v-btn
            color="primary"
            type="submit"
            :loading="enviando || esperandoVerificacion || actualizandoEstado"
            :disabled="
              enviando ||
              esperandoVerificacion ||
              actualizandoEstado ||
              !confirmacion.nit_factura.trim() ||
              !confirmacion.razon_social_factura.trim() ||
              (!confirmacion.tiene_comprobante && !comprobanteArchivo)
            "
            prepend-icon="mdi-cash-check"
          >
            Guardar cambios y verificar pago
          </v-btn>
        </v-form>
      </template>

      <div class="d-flex justify-end flex-wrap ga-3 mt-6">
        <v-btn variant="outlined" to="/">Volver al inicio</v-btn>
        <v-btn color="primary" to="/reserva">Realizar otra reserva</v-btn>
      </div>
    </v-card>

    <v-dialog v-model="reservaExitosa" max-width="600">
      <v-card class="formal-confirmation">
        <v-card-title class="text-h6"
          >CONFIRMACIÓN DE RESERVA EXITOSA</v-card-title
        >
        <v-card-text>
          <p>
            La reserva se registró correctamente. Secretaría revisará la
            verificación del pago y se espera a la paciente el día y hora
            reservados.
          </p>
          <p class="mt-3">
            Referencia: <strong>{{ confirmacion.id_reserva }}</strong>
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="reservaExitosa = false">
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="pagoVerificadoDialog" max-width="600">
      <v-card class="formal-confirmation">
        <v-card-title class="text-h6">Pago verificado</v-card-title>
        <v-card-text>
          <p>
            Secretaría verificó el pago y la reserva está confirmada. Se espera
            a la paciente el día y hora reservados.
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            @click="pagoVerificadoDialog = false"
          >
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template> -->
<template>
  <v-container max-width="1100">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
      <div class="text-overline text-primary">RESERVA · PAGO Y FACTURA</div>

      <h1 class="text-h4 mb-2">Resumen de reserva</h1>

      <p class="text-body-1 mb-5">
        La reserva fue registrada. Si ya realizó el pago, envíe los datos de
        facturación para que secretaría verifique la transacción.
      </p>

      <v-alert
        v-if="!confirmacion.id_reserva"
        type="warning"
        variant="outlined"
      >
        No hay una reserva en esta sesión.
        <NuxtLink to="/">Inicia el proceso de admisión</NuxtLink>.
      </v-alert>

      <template v-else>
        <v-alert
          v-if="errorEstado"
          type="warning"
          variant="outlined"
          class="mb-5"
        >
          {{ errorEstado }}
        </v-alert>

        <v-row>
          <!-- Columna izquierda: datos de la paciente y reserva -->
          <v-col cols="12" md="6">
            <h2 class="text-h6 mb-2">Datos de la paciente</h2>

            <v-list lines="two" rounded="lg" class="mb-5">
              <v-list-item title="Paciente" :subtitle="nombrePaciente" />

              <v-list-item
                title="Carnet de identidad"
                :subtitle="carnetPaciente"
              />

              <v-list-item
                title="Celular"
                :subtitle="admision.movil || 'No registrado'"
              />

              <v-list-item
                title="Correo de referencia"
                :subtitle="admision.correo_personal || 'No registrado'"
              />
            </v-list>

            <h2 class="text-h6 mb-2">Datos de la reserva</h2>

            <v-list lines="two" rounded="lg">
              <v-list-item
                title="Código de caso"
                :subtitle="confirmacion.codigo_caso"
              />

              <v-list-item
                title="Referencia de reserva"
                :subtitle="confirmacion.id_reserva"
              />

              <v-list-item title="Servicio" :subtitle="confirmacion.servicio" />

              <v-list-item
                title="Fecha"
                :subtitle="formatoFecha(confirmacion.fecha)"
              />

              <v-list-item
                title="Horario"
                :subtitle="`${confirmacion.hora_inicio.slice(0, 5)} – ${confirmacion.hora_fin.slice(0, 5)}`"
              />
            </v-list>
          </v-col>

          <!-- Columna derecha: QR, factura y verificación -->
          <v-col cols="12" md="6">
            <v-card class="mb-5 pa-5 text-center" variant="outlined">
              <div class="text-overline">Código QR</div>

              <v-icon
                size="128"
                color="primary"
                aria-label="Código QR simulado"
              >
                mdi-qrcode
              </v-icon>
            </v-card>

            <v-alert
              v-if="confirmacion.estado_pago === 'PAGADO'"
              type="success"
              variant="outlined"
              class="mb-5"
            >
              El pago fue verificado y la reserva está confirmada.
            </v-alert>

            <v-form
              v-if="confirmacion.estado_pago !== 'PAGADO'"
              @submit.prevent="solicitarVerificacion"
            >
              <h2 class="text-h6 mb-2">Datos para la factura</h2>

              <v-text-field
                v-model="confirmacion.razon_social_factura"
                label="Razón social"
                maxlength="200"
                required
              />

              <v-text-field
                v-model="confirmacion.nit_factura"
                label="NIT o CI para la factura"
                maxlength="50"
                required
              />

              <v-file-input
                accept="image/jpeg,image/png,image/webp"
                label="Foto del comprobante de pago"
                prepend-icon="mdi-camera"
                show-size
                :required="!confirmacion.tiene_comprobante"
                @change="seleccionarComprobante"
              />

              <v-img
                v-if="comprobantePreview"
                :src="comprobantePreview"
                max-height="280"
                contain
                class="mb-4"
                alt="Vista previa del comprobante de pago"
              />

              <v-alert
                v-else-if="confirmacion.tiene_comprobante"
                type="success"
                variant="tonal"
                class="mb-4"
              >
                Ya hay un comprobante adjunto. Selecciona otra imagen solo si
                deseas reemplazarlo.
              </v-alert>

              <v-alert
                v-if="error"
                type="error"
                variant="outlined"
                class="mb-4"
              >
                {{ error }}
              </v-alert>

              <v-btn
                block
                color="primary"
                type="submit"
                :loading="enviando || esperandoVerificacion || actualizandoEstado"
                :disabled="
                  enviando ||
                  esperandoVerificacion ||
                  actualizandoEstado ||
                  !confirmacion.nit_factura.trim() ||
                  !confirmacion.razon_social_factura.trim() ||
                  (!confirmacion.tiene_comprobante && !comprobanteArchivo)
                "
                prepend-icon="mdi-cash-check"
              >
                Guardar cambios y verificar pago
              </v-btn>
            </v-form>
          </v-col>
        </v-row>
      </template>

      <div class="d-flex justify-end flex-wrap ga-3 mt-6">
        <v-btn variant="outlined" to="/">Volver al inicio</v-btn>

        <v-btn color="primary" to="/reserva"> Realizar otra reserva </v-btn>
      </div>
    </v-card>

    <v-dialog v-model="reservaExitosa" max-width="600">
      <v-card class="formal-confirmation">
        <v-card-title class="text-h6">
          CONFIRMACIÓN DE RESERVA EXITOSA
        </v-card-title>

        <v-card-text>
          <p>
            La reserva se registró correctamente. Secretaría revisará la
            verificación del pago y se espera a la paciente el día y hora
            reservados.
          </p>

          <p class="mt-3">
            Referencia: <strong>{{ confirmacion.id_reserva }}</strong>
          </p>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-spacer />

          <v-btn color="primary" variant="flat" @click="reservaExitosa = false">
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="pagoVerificadoDialog" max-width="600">
      <v-card class="formal-confirmation">
        <v-card-title class="text-h6">Pago verificado</v-card-title>

        <v-card-text>
          <p>
            Secretaría verificó el pago y la reserva está confirmada. Se espera
            a la paciente el día y hora reservados.
          </p>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-spacer />

          <v-btn
            color="primary"
            variant="flat"
            @click="pagoVerificadoDialog = false"
          >
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";

definePageMeta({ layout: "public" });

const { $service } = useNuxtApp();
const reservaExitosa = ref(false);
const pagoVerificadoDialog = ref(false);
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
  complemento: "",
  movil: "",
  correo_personal: "",
  id_genero: null as number | null,
  id_expedito: null as number | null,
}));
const enviando = ref(false);
const esperandoVerificacion = ref(
  confirmacion.value.estado_pago === "PENDIENTE",
);
const comprobanteArchivo = ref<File | null>(null);
const comprobantePreview = ref("");
const error = ref("");
const errorEstado = ref("");
const actualizandoEstado = ref(false);
let intervaloEstado: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  reservaExitosa.value = Boolean(confirmacion.value.id_reserva);
  if (!confirmacion.value.id_reserva) return;
  void cargarEstadoPago();
  intervaloEstado = setInterval(() => void cargarEstadoPago(), 30_000);
});

onBeforeUnmount(() => {
  if (intervaloEstado) clearInterval(intervaloEstado);
  if (comprobantePreview.value) URL.revokeObjectURL(comprobantePreview.value);
});

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
const carnetPaciente = computed(
  () =>
    `${admision.value.ci}${admision.value.complemento ? `-${admision.value.complemento}` : ""}` ||
    "No registrado",
);

async function solicitarVerificacion() {
  if (!confirmacion.value.id_reserva) return;
  enviando.value = true;
  error.value = "";
  try {
    const comprobanteBase64 = comprobanteArchivo.value
      ? await convertirABase64(comprobanteArchivo.value)
      : undefined;
    const result = await $service.graphql<{
      solicitarVerificacionPago: {
        estado_pago: string;
        nit_factura: string;
        razon_social_factura: string;
        comprobante_mime_type: string | null;
      };
    }>({
      query: $querys.publicas.solicitarVerificacionPago,
      variables: {
        input: {
          id_reserva: confirmacion.value.id_reserva,
          nit_factura: confirmacion.value.nit_factura.trim(),
          razon_social_factura: confirmacion.value.razon_social_factura.trim(),
          ...(comprobanteBase64
            ? { comprobante_base64: comprobanteBase64 }
            : {}),
        },
      },
    });
    confirmacion.value.estado_pago =
      result.solicitarVerificacionPago.estado_pago;
    esperandoVerificacion.value =
      result.solicitarVerificacionPago.estado_pago === "PENDIENTE";
    confirmacion.value.tiene_comprobante = Boolean(
      result.solicitarVerificacionPago.comprobante_mime_type,
    );
    comprobanteArchivo.value = null;
  } catch (requestError) {
    esperandoVerificacion.value = false;
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo enviar la solicitud de verificación.";
  } finally {
    enviando.value = false;
  }
}

async function cargarEstadoPago() {
  if (!confirmacion.value.id_reserva || actualizandoEstado.value) return;
  actualizandoEstado.value = true;
  errorEstado.value = "";
  try {
    const result = await $service.graphql<{
      estadoPagoReserva: {
        estado_pago: string | null;
        estado_reserva: string;
        tiene_comprobante: boolean;
      };
    }>({
      query: $querys.publicas.estadoPagoReserva,
      variables: { id: confirmacion.value.id_reserva },
    });
    const pagoFueVerificado =
      result.estadoPagoReserva.estado_pago === "PAGADO" &&
      confirmacion.value.estado_pago !== "PAGADO";
    const estadoPago = result.estadoPagoReserva.estado_pago ?? "";
    confirmacion.value.estado_pago = estadoPago;
    esperandoVerificacion.value = estadoPago === "PENDIENTE";
    confirmacion.value.tiene_comprobante =
      result.estadoPagoReserva.tiene_comprobante;
    if (pagoFueVerificado) pagoVerificadoDialog.value = true;
  } catch (requestError) {
    errorEstado.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo actualizar el estado del pago.";
  } finally {
    actualizandoEstado.value = false;
  }
}

function seleccionarComprobante(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  error.value = "";
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    error.value = "La imagen debe pesar como máximo 2 MB.";
    input.value = "";
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    error.value = "Adjunta una imagen PNG, JPEG o WebP.";
    input.value = "";
    return;
  }
  if (comprobantePreview.value) URL.revokeObjectURL(comprobantePreview.value);
  comprobanteArchivo.value = file;
  comprobantePreview.value = URL.createObjectURL(file);
}

function convertirABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer la imagen seleccionada."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("El formato de la imagen seleccionada no es válido."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

function formatoFecha(date: string) {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return "Fecha inválida";
  }
  return new Intl.DateTimeFormat("es", {
    dateStyle: "long",
  }).format(new Date(year, month - 1, day));
}
</script>

<style scoped>
.formal-confirmation {
  border: 1px solid #d5dde3;
  border-radius: 6px;
  box-shadow: 0 12px 36px rgb(20 35 45 / 18%);
}

.formal-confirmation > .v-card-title {
  padding: 22px 24px 12px;
  color: #1d3442;
  font-weight: 600;
}

.formal-confirmation > .v-card-text {
  padding: 12px 24px 20px;
  color: #263640;
  line-height: 1.65;
}
</style>
