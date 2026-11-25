<template>
  <v-container class="registration-page" max-width="760">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
      <div class="text-overline text-primary">ADMISIÓN INICIAL</div>
      <h1 class="text-h4 mb-2">Admisión inicial</h1>

      <v-alert
        v-if="registroGuardado"
        class="mb-5"
        type="success"
        variant="tonal"
      >
        El registro se guardó correctamente. Elige si deseas continuar con una
        reserva ahora.
      </v-alert>

      <v-alert v-if="error" class="mb-5" type="error" variant="tonal">
        {{ error }}
      </v-alert>

      <v-form v-if="!registroGuardado" @submit.prevent="crearPaciente">
        <v-defaults-provider :defaults="defaultsCampos">
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.nombres"
                label="Nombres *"
                maxlength="200"
                :rules="[reglaRequerido]"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.primer_apellido"
                label="Primer apellido *"
                :rules="[reglaRequerido]"
                maxlength="200"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.segundo_apellido"
                label="Segundo apellido"
                maxlength="200"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="admision.ci"
                label="Carnet de identidad *"
                maxlength="10"
                :rules="[validarCi]"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="admision.complemento"
                label="Complemento"
                maxlength="50"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <ExtensionSelect
                v-model="admision.id_expedito"
                label="Extensión / lugar de expedición"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="admision.edad"
                label="Edad *"
                type="number"
                min="0"
                max="120"
                :rules="[reglaEdad]"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <GeneroSelect v-model="admision.id_genero" label="Sexo *" />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="admision.correo_personal"
                label="Correo electrónico *"
                type="email"
                maxlength="100"
                :rules="[reglaCorreo]"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.movil"
                label="Celular"
                maxlength="50"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.procedencia"
                label="Procedencia / Municipio"
                maxlength="200"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <ReferenciaInstitucionalSelect v-model="idInstitucionReferencia" label="Institución de referencia" />
            </v-col>
          </v-row>
        </v-defaults-provider>

        <div class="d-flex flex-wrap ga-3 mt-4">
          <v-btn
            color="primary"
            type="submit"
            :loading="creando"
            :disabled="!formularioValido"
            append-icon="mdi-content-save"
          >
            Guardar registro
          </v-btn>
          <v-btn variant="outlined" to="/">Volver</v-btn>
        </div>
      </v-form>

      <div v-else class="d-flex flex-wrap ga-3">
        <v-btn color="primary" append-icon="mdi-arrow-right" @click="reservar">
          Reservar ahora
        </v-btn>
        <v-btn variant="outlined" @click="finalizarRegistro">
          Terminar por ahora
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { validarCi } from "~/utils/carnet";
import ExtensionSelect from "~/components/common/Fields/ExtensionSelect.vue";
import GeneroSelect from "~/components/common/Fields/GeneroSelect.vue";
import ReferenciaInstitucionalSelect from "~/components/common/Fields/ReferenciaInstitucionalSelect.vue";

definePageMeta({ layout: "public" });

const presentacionCampo = { variant: "outlined", density: "compact", hideDetails: "auto" } as const;
const defaultsCampos = {
  VTextField: presentacionCampo,
  VSelect: presentacionCampo,
  VAutocomplete: presentacionCampo,
};

interface PersonaCreada {
  id: string;
}

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const { $service } = useNuxtApp();
const router = useRouter();
const idInstitucionReferencia = useState<string | null>(
  "registro-institucion-referencia",
  () => null,
);
const admision = useState("reserva-admision", () => ({
  ci: "",
  complemento: "",
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
const registroFinalizado = useState("registro-finalizado", () => false);
const creando = ref(false);
const registroGuardado = ref(false);
const error = ref("");

// Reglas visuales de cada campo obligatorio
const reglaRequerido = (v: string) =>
  Boolean(v && v.trim()) || "Este campo es obligatorio";
const reglaEdad = (v: number | null | string) =>
  (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 120) ||
  "Ingresa una edad entre 0 y 120";
const reglaCorreo = (v: string) =>
  (!v.trim() || CORREO_REGEX.test(v.trim())) ||
  "Ingresa un correo electrónico válido";

// Lista de campos obligatorios que aún faltan (se muestra bajo el formulario)
const camposFaltantes = computed(() => {
  const faltan: string[] = [];
  const a = admision.value;
  if (!a.nombres.trim()) faltan.push("Nombres");
  if (!a.primer_apellido.trim()) faltan.push("Primer apellido");
  if (validarCi(a.ci) !== true) faltan.push("Carnet de identidad");
  if (a.id_genero === null) faltan.push("Género");
  if (
    !Number.isInteger(a.edad) ||
    (a.edad as number) < 0 ||
    (a.edad as number) > 120
  )
    faltan.push("Edad (0 a 120)");
  if (a.correo_personal.trim() && !CORREO_REGEX.test(a.correo_personal.trim()))
    faltan.push("Correo electrónico válido");
  return faltan;
});
const formularioValido = computed(() => camposFaltantes.value.length === 0);

// Convierte texto vacío en null para no enviar cadenas vacías al backend
function opcional(valor: string | null | undefined): string | null {
  const limpio = (valor ?? "").trim();
  return limpio ? limpio : null;
}

async function crearPaciente() {
  error.value = "";
  if (!formularioValido.value) {
    error.value = `Falta completar: ${camposFaltantes.value.join(", ")}.`;
    return;
  }

  const a = admision.value;
  creando.value = true;
  try {
    const existente = await $service.graphql<{ personaPorCarnet: PersonaCreada | null }>({
      query: "query PersonaCI($ci: String!) { personaPorCarnet(nro_documento: $ci) { id } }", variables: { ci: a.ci.trim() },
    });
    if (existente.personaPorCarnet) { a.id_persona = existente.personaPorCarnet.id; await reservar(); return; }
    const result = await $service.graphql<{ admisionInicial: PersonaCreada }>({
      query: "mutation Admision($datos: CreatePersonaInput!) { admisionInicial(input: $datos) { id } }",
      variables: {
        datos: {
          // Obligatorios
          nombres: a.nombres.trim(),
          nro_documento: a.ci.trim(),
          id_genero: a.id_genero,
          edad: a.edad,
          correo_personal: opcional(a.correo_personal),
          // Opcionales
          primer_apellido: opcional(a.primer_apellido),
          segundo_apellido: opcional(a.segundo_apellido),
          complemento: opcional(a.complemento),
          id_expedito: a.id_expedito,
          procedencia: opcional(a.procedencia),
          movil: opcional(a.movil),
          id_institucion_referencia: idInstitucionReferencia.value || null,
        },
      },
    });
    a.id_persona = result.admisionInicial.id;
    registroGuardado.value = true;
    await reservar();
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo guardar el registro. Verifica los datos e inténtalo nuevamente.";
  } finally {
    creando.value = false;
  }
}

function reservar() {
  registroFinalizado.value = false;
  return router.push("/reserva");
}

function finalizarRegistro() {
  registroFinalizado.value = true;
  return router.push("/");
}
</script>
