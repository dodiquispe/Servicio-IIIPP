<template>
  <v-container class="registration-page" max-width="760">
    <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2">
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
        <div v-for="linea in error.split('\n')" :key="linea">{{ linea }}</div>
      </v-alert>

      <v-form v-if="!registroGuardado" novalidate @submit.prevent="crearPaciente">
        <p>{{ avisoAltaPersona }}</p>
        <v-defaults-provider :defaults="defaultsCampos">
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.nombres"
                data-alta="nombres"
                :error-messages="erroresAlta.nombres"
                :maxlength="reglasPersona.nombres.max"
                :counter="true"
                label="Nombres *"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.primer_apellido"
                data-alta="primer_apellido"
                :error-messages="erroresAlta.primer_apellido"
                :maxlength="reglasPersona.primer_apellido.max"
                :counter="true"
                label="Primer apellido *"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.segundo_apellido"
                data-alta="segundo_apellido"
                :error-messages="erroresAlta.segundo_apellido"
                :maxlength="reglasPersona.segundo_apellido.max"
                :counter="true"
                label="Segundo apellido"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="admision.ci"
                data-alta="nro_documento"
                :error-messages="erroresAlta.nro_documento"
                :maxlength="reglasPersona.nro_documento.max"
                :counter="true"
                label="Carnet de identidad *"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="admision.complemento"
                data-alta="complemento"
                :error-messages="erroresAlta.complemento"
                :maxlength="reglasPersona.complemento.max"
                :counter="true"
                label="Complemento"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <ExtensionSelect
                v-model="admision.id_expedito"
                data-alta="id_expedito"
                :error-messages="erroresAlta.id_expedito"
                label="Extensión / lugar de expedición"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="fechaNacimiento"
                data-alta="fecha_nacimiento"
                :error-messages="erroresAlta.fecha_nacimiento"
                :maxlength="reglasPersona.fecha_nacimiento.max"
                counter
                label="Fecha de nacimiento (AAAA-MM-DD) *"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <GeneroSelect v-model="admision.id_genero"
                data-alta="id_genero"
                :error-messages="erroresAlta.id_genero" label="Sexo *" />
            </v-col>

            <v-col cols="12" sm="5">
              <v-text-field
                v-model="admision.correo_personal"
                data-alta="correo_personal"
                :error-messages="erroresAlta.correo_personal"
                :maxlength="reglasPersona.correo_personal.max"
                :counter="true"
                label="Correo electrónico *"
                type="email"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.movil"
                data-alta="movil"
                :error-messages="erroresAlta.movil"
                :maxlength="reglasPersona.movil.max"
                :counter="true"
                label="Celular"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="admision.procedencia"
                data-alta="procedencia"
                :error-messages="erroresAlta.procedencia"
                :maxlength="reglasPersona.procedencia.max"
                :counter="true"
                label="Procedencia / Municipio"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <ReferenciaInstitucionalSelect
                v-model="idInstitucionReferencia"
                data-alta="id_institucion_referencia"
                :error-messages="erroresAlta.id_institucion_referencia"
                label="Institución de referencia"
              />
            </v-col>
          </v-row>
        </v-defaults-provider>

        <div class="d-flex flex-wrap ga-3 mt-4">
          <v-btn
            color="primary"
            type="submit"
            :loading="creando"
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
import { avisoAltaPersona, avisoErroresAlta, enfocarAlta, erroresApiAlta, normalizarDatoPersona, reglasPersona, validarAlta } from "~/utils/validacion-alta-persona";
import ExtensionSelect from "~/components/common/Fields/ExtensionSelect.vue";
import GeneroSelect from "~/components/common/Fields/GeneroSelect.vue";
import ReferenciaInstitucionalSelect from "~/components/common/Fields/ReferenciaInstitucionalSelect.vue";

definePageMeta({ layout: "public" });

const presentacionCampo = {
  variant: "outlined",
  density: "compact",
  hideDetails: "auto",
} as const;
const defaultsCampos = {
  VTextField: presentacionCampo,
  VSelect: presentacionCampo,
  VAutocomplete: presentacionCampo,
};

interface PersonaCreada {
  id: string;
}

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

const fechaNacimiento = ref("");
const erroresAlta = ref<Record<string, string>>({});

async function crearPaciente() {
  error.value = "";
  const a = admision.value;
  const datos = {
    nombres: a.nombres, primer_apellido: a.primer_apellido, segundo_apellido: a.segundo_apellido,
    nro_documento: a.ci, complemento: a.complemento, fecha_nacimiento: fechaNacimiento.value,
    procedencia: a.procedencia, movil: a.movil, correo_personal: a.correo_personal,
    id_genero: a.id_genero, id_expedito: a.id_expedito,
    id_institucion_referencia: idInstitucionReferencia.value,
  };
  erroresAlta.value = validarAlta(datos, ["id_expedito", "id_genero", "id_institucion_referencia"]);
  if (Object.keys(erroresAlta.value).length) {
    error.value = avisoErroresAlta(erroresAlta.value);
    await enfocarAlta(erroresAlta.value);
    return;
  }
  creando.value = true;
  try {
    const result = await $service.graphql<{ admisionInicial: PersonaCreada }>({
      query:
        "mutation Admision($datos: AdmisionInicialInput!) { admisionInicial(input: $datos) { id } }",
      variables: {
        datos: Object.fromEntries(Object.entries(datos).map(([key, value]) => [key,
          typeof value === "string" ? normalizarDatoPersona(value) : value,
        ])),
      },
    });
    a.id_persona = result.admisionInicial.id;
    registroGuardado.value = true;
    await reservar();
  } catch (requestError) {
    erroresAlta.value = erroresApiAlta(requestError);
    error.value = avisoErroresAlta(erroresAlta.value) || "No se pudo guardar el registro. Verifica los datos e inténtalo nuevamente.";
    await enfocarAlta(erroresAlta.value);
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
