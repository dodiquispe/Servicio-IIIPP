<template>
  <v-container class="admission-page" max-width="760">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
      <div class="text-overline text-primary">ADMISIÓN · PASO 1 DE 2</div>
      <h1 class="text-h4 mb-2">Inicia tu reserva</h1>
      <p class="text-body-1 mb-6">
        Ingresa el carnet de identidad de la paciente para verificar si ya está
        registrada.
      </p>

      <v-alert
        v-if="registroFinalizado"
        class="mb-5"
        type="success"
        variant="tonal"
      >
        Tu registro quedó guardado. Cuando quieras reservar, ingresa aquí tu
        carnet y continúa.
      </v-alert>

      <v-form @submit.prevent="buscarPaciente">
        <v-text-field
          v-model="admision.ci"
          label="Carnet de identidad de la paciente"
          placeholder="Ej. 1234567"
          prepend-inner-icon="mdi-card-account-details"
          maxlength="10"
          autocomplete="off"
          :rules="[validarCi]"
          required
        />
        <v-btn
          color="primary"
          type="submit"
          :loading="buscando"
          :disabled="!admision.ci.trim()"
          append-icon="mdi-arrow-right"
        >
          Verificar carnet
        </v-btn>
      </v-form>

      <v-alert v-if="error" class="mt-5" type="error" variant="tonal">
        {{ error }}
      </v-alert>

    </v-card>

    <v-dialog v-model="resultadoDialog" max-width="520">
      <v-card class="pa-2">
        <v-card-title>
          {{ personaEncontrada ? "Carnet encontrado" : "Carnet no encontrado" }}
        </v-card-title>
        <v-card-text>
          <template v-if="personaEncontrada">
            <p class="mb-2">{{ nombrePaciente }}</p>
            <p>
              {{
                pacienteEncontrado
                  ? "Este carnet pertenece a un paciente. Puedes continuar con la reserva."
                  : "Encontramos los datos de esta persona. Puedes continuar con la reserva."
              }}
            </p>
          </template>
          <p v-else>
            No encontramos este carnet. Si deseas continuar, primero registra
            los datos del paciente.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="primary"
            :disabled="buscando"
            @click="resultadoDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :append-icon="personaEncontrada ? 'mdi-calendar-check' : 'mdi-account-plus'"
            @click="personaEncontrada ? continuar() : irARegistro()"
          >
            {{ personaEncontrada ? "Reservar" : "Registrarse" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { validarCi } from "~/utils/carnet";
import { $querys } from "~/utils/querys.graphql";

definePageMeta({ layout: "public" });

interface Persona {
  id: string;
  nombres: string;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  esPaciente: boolean;
}

const { $service } = useNuxtApp();
const router = useRouter();
const registroFinalizado = useState("registro-finalizado", () => false);
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
const pacienteEncontrado = ref(false);
const personaEncontrada = ref(false);
const resultadoDialog = ref(false);
const buscando = ref(false);
const error = ref("");

const nombrePaciente = computed(
  () =>
    [
      admision.value.nombres,
      admision.value.primer_apellido,
      admision.value.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ") || "Paciente registrado",
);

async function buscarPaciente() {
  const validacion = validarCi(admision.value.ci);
  if (validacion !== true) {
    error.value = validacion;
    return;
  }
  error.value = "";
  registroFinalizado.value = false;
  pacienteEncontrado.value = false;
  personaEncontrada.value = false;
  resultadoDialog.value = false;
  admision.value.id_persona = "";
  admision.value.complemento = "";
  admision.value.edad = null;
  admision.value.procedencia = "";
  admision.value.id_genero = null;
  admision.value.id_expedito = null;
  admision.value.movil = "";
  admision.value.correo_personal = "";
  buscando.value = true;
  try {
    const result = await $service.graphql<{
      personaPorCarnet: Persona | null;
    }>({
      query: $querys.publicas.personaPorCarnet,
      variables: { ci: admision.value.ci.trim() },
    });
    const persona = result.personaPorCarnet;
    if (persona) {
      personaEncontrada.value = true;
      admision.value.id_persona = persona.id;
      admision.value.nombres = persona.nombres;
      admision.value.primer_apellido = persona.primer_apellido ?? "";
      admision.value.segundo_apellido = persona.segundo_apellido ?? "";
      pacienteEncontrado.value = persona.esPaciente;
      resultadoDialog.value = true;
      return;
    }

    admision.value.id_persona = "";
    admision.value.nombres = "";
    admision.value.primer_apellido = "";
    admision.value.segundo_apellido = "";
    resultadoDialog.value = true;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo verificar el carnet. Inténtalo nuevamente.";
  } finally {
    buscando.value = false;
  }
}

function irARegistro() {
  resultadoDialog.value = false;
  return router.push("/reserva/admision");
}

function continuar() {
  if (!admision.value.id_persona) {
    error.value = "Verifica tu carnet antes de continuar.";
    return;
  }
  resultadoDialog.value = false;
  return router.push("/reserva");
}
</script>
