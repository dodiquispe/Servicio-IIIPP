<template>
  <v-container fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h4">
          {{ vistaPracticantes ? "Practicantes de servicios" : "Equipo de trabajo" }}
        </h1>
        <p class="text-medium-emphasis">
          {{
            vistaPracticantes
              ? esResponsableSesion
                ? "Consulte a los practicantes asignados a sus servicios."
                : "Consulte los practicantes de todos los servicios y filtre por servicio."
              : "Administre responsables y personal de secretaría asignado a servicios."
          }}
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-account-plus"
        :disabled="loading || !serviciosActivos.length"
        @click="abrirCreacion"
      >
        {{ vistaPracticantes ? "Nuevo practicante" : "Nuevo personal" }}
      </v-btn>
    </div>

    <v-alert
      v-if="esResponsableSesion && !serviciosResponsable.length"
      class="mb-4"
      type="warning"
      variant="tonal"
    >
      No tiene un servicio con asignación vigente de responsable. No puede
      consultar ni crear practicantes hasta tener una asignación vigente.
    </v-alert>
    <v-alert
      v-else-if="esResponsableSesion"
      class="mb-4"
      type="info"
      variant="tonal"
    >
      Su rol es Responsable. Servicios a su cargo:
      {{ serviciosResponsable.map((service) => service.servicio).join(", ") }}.
      Los practicantes nuevos se asignarán a uno de esos servicios.
    </v-alert>

    <v-card elevation="0">
      <v-card-title class="d-flex flex-wrap align-center ga-3">
        Asignaciones
        <v-spacer />
        <v-btn
          icon
          variant="text"
          aria-label="Actualizar"
          :loading="loading"
          @click="cargarDatos"
        >
          <v-tooltip activator="parent" location="bottom">Recargar asignaciones</v-tooltip>
          <v-icon>mdi-reload</v-icon>
        </v-btn>
        <v-btn icon variant="text" aria-label="Mostrar filtros" @click="showFilters = !showFilters">
          <v-tooltip activator="parent" location="bottom">Búsqueda/filtros</v-tooltip>
          <v-icon>mdi-filter</v-icon>
        </v-btn>
      </v-card-title>
      <v-card v-if="showFilters" color="secondary" class="pa-3 mb-3">
        <v-row align="center">
          <v-col v-if="vistaPracticantes" cols="12" sm="6" md="4">
            <v-select
              v-model="filtroServicio"
              label="Servicio"
              :items="serviciosActivos"
              item-title="servicio"
              item-value="id"
              clearable
              @click:clear="filtroServicioAplicado = ''"
              density="compact"
              hide-details
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="filtro"
              label="Buscar persona, CI o servicio"
              density="compact"
              hide-details
              clearable
              variant="outlined"
              @keyup.enter="aplicarFiltros"
              @click:clear="limpiarFiltros"
            />
          </v-col>
          <v-col cols="auto">
            <v-btn color="primary" prepend-icon="mdi-magnify" @click="aplicarFiltros">
              Buscar
            </v-btn>
          </v-col>
        </v-row>
      </v-card>
      <CommonCrudTable
        tabla="servicioPersonal"
        titulo="Asignaciones"
        :headers="headers"
        getrows=""
        :filters="[]"
        :inputs="[]"
        :source-items="asignacionesFiltradas"
        :source-loading="loading"
        :acciones="false"
      >
        <template #persona="{ item }">
          {{ nombreCompleto(item.usuario.persona) }}
        </template>
        <template #ci="{ item }">
          {{ item.usuario.persona.nro_documento || "—" }}
        </template>
        <template #fecha_fin="{ item }">
          {{ item.fecha_fin || "Sin fecha de finalización" }}
        </template>
        <template #rol="{ item }">
          <v-chip size="small" :color="colorRol(item)">
            {{ nombreRol(item) }}
          </v-chip>
        </template>
        <template #estado="{ item }">
          <div class="d-flex flex-column align-center">
            <v-switch
              v-if="puedeAdministrarCuentas && item.usuario.id_estado !== 3"
              :model-value="item.usuario.id_estado === 1"
              color="success"
              density="compact"
              hide-details
              :aria-label="`Estado de ${nombreCompleto(item.usuario.persona)}`"
              @update:model-value="setAccountActive(item, Boolean($event))"
            />
            <v-chip
              v-if="puedeAdministrarCuentas && item.usuario.id_estado !== 3"
              size="x-small"
              :color="item.usuario.id_estado === 1 ? 'success' : 'error'"
              variant="tonal"
            >
              {{ item.usuario.id_estado === 1 ? "Activo" : "Inactivo" }}
            </v-chip>
            <v-chip
              size="small"
              :color="item.vigencia === 'Vigente' ? 'success' : 'grey'"
              variant="tonal"
            >
              {{ item.vigencia }}
            </v-chip>
          </div>
        </template>
        <template #actions="{ item }">
          <div class="d-flex ga-1">
            <v-btn
              v-if="vistaPracticantes && esPracticante(item)"
              icon="mdi-calendar-clock"
              size="small"
              variant="flat"
              color="primary"
              class="table-action-btn"
              aria-label="Configurar horario personal"
              @click="configurarHorario(item)"
            >
              <v-tooltip activator="parent" location="bottom">
                Configurar disponibilidad semanal del practicante
              </v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="flat"
              color="primary"
              class="table-action-btn"
              aria-label="Editar"
              @click="editarAsignacion(item)"
            >
              <v-tooltip activator="parent" location="bottom">
                Editar persona y asignación
              </v-tooltip>
            </v-btn>
            <v-btn
              v-if="puedeAdministrarCuentas && item.fecha_fin === null"
              icon="mdi-calendar-remove"
              size="small"
              variant="flat"
              color="warning"
              class="table-action-btn"
              aria-label="Finalizar asignación"
              @click="finalizarAsignacion(item)"
            >
              <v-tooltip activator="parent" location="bottom">
                Finalizar asignación
              </v-tooltip>
            </v-btn>
            <v-btn
              v-if="puedeAdministrarCuentas && item.usuario.id_estado !== 3"
              icon="mdi-delete"
              size="small"
              variant="flat"
              color="error"
              class="table-action-btn"
              aria-label="Eliminar usuario y relaciones"
              @click="deleteStaffUser(item)"
            >
              <v-tooltip activator="parent" location="bottom">
                Eliminar usuario y todas sus relaciones
              </v-tooltip>
            </v-btn>
          </div>
        </template>
      </CommonCrudTable>
    </v-card>

    <v-dialog v-model="dialog" max-width="820" persistent class="admin-dialog">
      <v-card class="admin-dialog__card">
        <v-card-title class="text-h6">
          {{ editando ? "Editar personal y asignación" : "Crear personal y asignar" }}
        </v-card-title>
        <v-divider />
        <v-form ref="formRef" @submit.prevent="guardar">
          <v-card-text class="dialog-content">
            <v-defaults-provider :defaults="defaultsCamposPersona">
              <div class="text-subtitle-1 mb-2">Datos de la persona</div>
              <v-row dense>
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="form.nro_documento"
                    label="Carnet de identidad (CI)"
                    required
                    maxlength="10"
                    :rules="[validarCi]"
                    @blur="consultarCI"
                  />
                </v-col>
                <v-col cols="12" sm="2">
                  <v-text-field
                    v-model="form.complemento"
                    label="Complemento"
                    maxlength="50"
                  />
                </v-col>
                <v-col cols="12" sm="5">
                  <ExtensionSelect
                    v-model="form.id_expedito"
                    label="Lugar de expedición"
                    no-data-text="No hay extensiones registradas"
                    required
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="form.nombres"
                    label="Nombres"
                    required
                    maxlength="200"
                    :rules="[requerido('Los nombres')]"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="form.primer_apellido"
                    label="Primer apellido"
                    maxlength="200"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="form.segundo_apellido"
                    label="Segundo apellido"
                    maxlength="200"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-if="generos.length"
                    v-model="form.id_genero"
                    label="Género"
                    :items="generos"
                    item-title="valor"
                    item-value="id"
                    required
                    :rules="[requerido('El género')]"
                  />
                  <v-text-field
                    v-else
                    v-model.number="form.id_genero"
                    label="ID de género"
                    type="number"
                    required
                    :rules="[requerido('El género')]"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.movil"
                    label="Celular"
                    maxlength="50"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.correo"
                    label="Correo electrónico"
                    type="email"
                    maxlength="200"
                    required
                    :rules="[requerido('El correo'), validarCorreo]"
                  />
                </v-col>
              </v-row>

              <div class="text-subtitle-1 mt-3 mb-2">Cuenta y asignación</div>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.nombre_usuario"
                    label="Nombre de usuario"
                    required
                    maxlength="200"
                    :rules="[requerido('El nombre de usuario')]"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.id_rol"
                    label="Rol del personal"
                    :items="rolesPersonal"
                    item-title="descripcion"
                    item-value="id"
                    required
                    :rules="[requerido('El rol')]"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.id_servicio"
                    label="Servicio"
                    :items="serviciosActivos"
                    item-title="servicio"
                    item-value="id"
                    required
                    :rules="[requerido('El servicio')]"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.fecha_inicio"
                    label="Vigente desde"
                    type="date"
                    required
                    :rules="[
                      requerido('La fecha de inicio'),
                      validarRangoFechas,
                    ]"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.fecha_fin"
                    label="Vigente hasta"
                    type="date"
                    clearable
                    hint="Deje vacío para una asignación sin fecha de finalización."
                    persistent-hint
                    :rules="[validarRangoFechas]"
                  />
                </v-col>
              </v-row>
              <v-alert
                v-if="mensajeCI"
                class="mt-2"
                density="compact"
                :type="ciExiste ? 'info' : 'success'"
                variant="tonal"
              >
                {{ mensajeCI }}
              </v-alert>
              <v-alert
                v-if="esResponsableOcupado"
                class="mt-2"
                type="warning"
                density="compact"
                variant="tonal"
              >
                El servicio ya tiene un responsable asignado en ese período. Se
                guardará el usuario y su rol, pero no se duplicará la asignación.
              </v-alert>
            </v-defaults-provider>
          </v-card-text>
          <v-divider />
          <v-card-actions class="px-5 py-3">
            <v-spacer />
            <v-btn variant="text" :disabled="saving" @click="cerrarDialog">
              Cancelar
            </v-btn>
            <v-btn color="primary" type="submit" :loading="saving">
              {{ editando ? "Guardar cambios" : "Crear y asignar" }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <ServiciosHorarioConfiguracion
      v-if="asignacionHorario"
      v-model="horariosDialog"
      :servicio="asignacionHorario.servicio"
      :dias-semana="diasSemana"
      :id-profesional="asignacionHorario.id_usuario"
      :nombre-profesional="nombreCompleto(asignacionHorario.usuario.persona)"
    />
  </v-container>
</template>

<script setup lang="ts">
const campoPersona = { variant: "outlined", density: "compact", hideDetails: "auto" } as const;
const defaultsCamposPersona = { VTextField: campoPersona, VSelect: campoPersona, VAutocomplete: campoPersona };

import { validarCi } from "~/utils/carnet";
import ExtensionSelect from "~/components/common/Fields/ExtensionSelect.vue";
import { computed, onMounted, reactive, ref, watch } from "vue";
import type { CrudRecord } from "~/interfaces/app/common";
import {
  getCurrentUserServiceAssignments,
  normalizeRoleName,
  sessionHasRole,
  useUserSession,
  type ServiceAssignment,
} from "~/utils/session";

interface Parametro {
  [key: string]: string | number | boolean | null | undefined;
  id: number;
  valor: string;
  tipo: string;
  id_estado: number;
}

interface Rol {
  id: string;
  descripcion: string;
  id_sec: number;
  id_estado: number;
}

interface Servicio {
  [key: string]: string | number | boolean | null | undefined;
  id: string;
  servicio: string;
  id_estado: number;
}

interface Persona {
  id: string;
  nombres: string;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  nro_documento: string | null;
  complemento: string | null;
  id_expedito: number | null;
  id_genero: number;
  movil: string | null;
  correo_personal: string | null;
}

interface UsuarioRol {
  id: string;
  id_rol: string;
  id_estado: number;
  rol: Rol;
}

interface Usuario {
  id: string;
  id_persona: string;
  nombre_usuario: string;
  correo: string | null;
  id_estado: number;
  persona: Persona;
  usuario_rol: UsuarioRol[];
}

interface Asignacion extends CrudRecord {
  id: string;
  id_servicio: string;
  id_usuario: string;
  id_rol: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  vigencia: string;
  id_estado: number;
  servicio: Servicio;
  rol: Rol | null;
  usuario: Usuario;
}

interface FormularioPersonal {
  nro_documento: string;
  complemento: string;
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string;
  id_genero: number | null;
  id_expedito: number | null;
  movil: string;
  nombre_usuario: string;
  correo: string;
  id_rol: string;
  id_servicio: string;
  fecha_inicio: string;
  fecha_fin: string;
}

interface FormularioRef {
  validate: () => Promise<{ valid: boolean }>;
}

const { $service } = useNuxtApp();
const route = useRoute();
const session = useUserSession();
const vistaPracticantes = computed(
  () =>
    route.query.vista === "practicantes" ||
    sessionHasRole(session.roles.value, "responsable"),
);
const esResponsableSesion = computed(() =>
  sessionHasRole(session.roles.value, "responsable"),
);
const puedeAdministrarCuentas = computed(
  () =>
    sessionHasRole(session.roles.value, "administrador") ||
    sessionHasRole(session.roles.value, "coordinador"),
);
const baseHeaders = [
  { title: "Persona", key: "persona", crearColumna: true },
  { title: "CI", key: "ci", crearColumna: true },
  { title: "Servicio", key: "servicio.servicio" },
  { title: "Rol", key: "rol", crearColumna: true },
  { title: "Inicio", key: "fecha_inicio" },
  { title: "Fin", key: "fecha_fin", crearColumna: true },
  { title: "Estado", key: "estado", crearColumna: true },
  { title: "Acciones", key: "actions", sortable: false, crearColumna: true },
];
const headers = baseHeaders;
const filasAsignacion = `id id_servicio id_usuario id_rol fecha_inicio fecha_fin id_estado vigencia rol { id descripcion id_sec id_estado } servicio { id servicio id_estado } usuario { id id_persona nombre_usuario correo id_estado persona { id nombres primer_apellido segundo_apellido nro_documento complemento id_expedito id_genero movil correo_personal } usuario_rol { id id_rol id_estado rol { id descripcion id_sec id_estado } } }`;
const queryAsignaciones = `query { servicioPersonal { ${filasAsignacion} } }`;
const queryServicios = `query { servicios(limit: 100, pagina: 1) { rows { id servicio id_estado } } }`;
const queryRoles = `query { roles(limit: 100, pagina: 1) { rows { id descripcion id_sec id_estado } } }`;
const queryParametros = `query { parametros { id valor tipo id_estado } }`;
const queryPersonasPorCI = `query($ci: String!) { personas(limit: 100, pagina: 1, search: { nro_documento: $ci }) { rows { id nombres primer_apellido segundo_apellido nro_documento complemento id_expedito id_genero movil correo_personal } } }`;
const queryUsuariosPorCI = `query($ci: String!) { usuarios(limit: 100, pagina: 1, search: { busqueda: $ci }) { rows { id id_persona nombre_usuario correo persona { id nombres primer_apellido segundo_apellido nro_documento complemento id_expedito id_genero movil correo_personal } usuario_rol { id id_rol id_estado rol { id descripcion id_sec id_estado } } } } }`;
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const horariosDialog = ref(false);
const filtro = ref("");
const filtroServicio = ref("");
const filtroAplicado = ref("");
const filtroServicioAplicado = ref("");
const showFilters = ref(true);
const asignaciones = ref<Asignacion[]>([]);
const servicios = ref<Servicio[]>([]);
const roles = ref<Rol[]>([]);
const parametros = ref<Parametro[]>([]);
const formRef = ref<FormularioRef | null>(null);
const editing = ref<Asignacion | null>(null);
const asignacionHorario = ref<Asignacion | null>(null);
const personaExistente = ref<Persona | null>(null);
const usuarioExistente = ref<Usuario | null>(null);
const mensajeCI = ref("");
const ciExiste = ref(false);
const form = reactive<FormularioPersonal>(formularioVacio());

const rolesPersonal = computed(() =>
  roles.value.filter((role) => {
    const description = normalizar(role.descripcion);
    return (
      role.id_estado === 1 &&
      (vistaPracticantes.value
        ? description.includes("practicante")
        : description.includes("responsable") ||
          description.includes("secretaria"))
    );
  }),
);
const serviciosResponsable = computed(() => {
  const userId = session.usuario.value?.id;
  if (!userId) return [];
  const current: ServiceAssignment[] = getCurrentUserServiceAssignments(
    asignaciones.value,
    userId,
    "responsable",
  );
  return Array.from(
    new Map(current.map(({ servicio }) => [servicio.id, servicio])).values(),
  );
});
const serviciosActivos = computed(() =>
  servicios.value.filter(
    (service) =>
      service.id_estado === 1 &&
      (!esResponsableSesion.value ||
        serviciosResponsable.value.some(
          (assigned) => assigned.id === service.id,
        )),
  ),
);
const generos = computed(() =>
  parametros.value.filter(
    (parameter) =>
      parameter.id_estado === 1 &&
      normalizar(parameter.tipo).includes("genero"),
  ),
);
const diasSemana = computed(() =>
  parametros.value.filter(
    (parameter) =>
      parameter.id_estado === 1 &&
      normalizar(parameter.tipo).includes("dia semana"),
  ),
);
const asignacionesFiltradas = computed(() => {
  const query = normalizar(filtroAplicado.value);
  const visibleAssignments = asignaciones.value.filter((assignment) => {
    if (assignment.id_estado === 3 || assignment.usuario.id_estado === 3) {
      return false;
    }
    if (
      filtroServicioAplicado.value &&
      assignment.id_servicio !== filtroServicioAplicado.value
    ) {
      return false;
    }
    if (
      esResponsableSesion.value &&
      !serviciosResponsable.value.some(
        (service) => service.id === assignment.id_servicio,
      )
    ) {
      return false;
    }
    const roleName = normalizar(nombreRol(assignment));
    return vistaPracticantes.value
      ? roleName.includes("practicante")
      : roleName.includes("responsable") || roleName.includes("secretaria");
  });

  if (!query) return visibleAssignments;
  return visibleAssignments.filter((assignment) =>
    normalizar(
      [
        nombreCompleto(assignment.usuario.persona),
        assignment.usuario.persona.nro_documento,
        assignment.servicio.servicio,
        nombreRol(assignment),
      ].join(" "),
    ).includes(query),
  );
});

function aplicarFiltros(): void {
  filtroAplicado.value = filtro.value.trim();
  filtroServicioAplicado.value = filtroServicio.value;
}

function limpiarFiltros(): void {
  filtro.value = "";
  filtroAplicado.value = "";
}

const editando = computed(() => editing.value !== null);
const esResponsableOcupado = computed(() => {
  if (!esRolResponsable(form.id_rol)) return false;
  return asignaciones.value.some(
    (assignment) =>
      assignment.id_servicio === form.id_servicio &&
      seSuperpone(
        assignment.fecha_inicio,
        assignment.fecha_fin,
        form.fecha_inicio,
        form.fecha_fin || null,
      ) &&
      esResponsableAsignado(assignment) &&
      assignment.id !== editing.value?.id,
  );
});

function formularioVacio(): FormularioPersonal {
  return {
    nro_documento: "",
    complemento: "",
    nombres: "",
    primer_apellido: "",
    segundo_apellido: "",
    id_genero: null,
    id_expedito: null,
    movil: "",
    nombre_usuario: "",
    correo: "",
    id_rol: "",
    id_servicio: "",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: "",
  };
}

function normalizar(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function requerido(label: string) {
  return (value: unknown) =>
    (value !== null && value !== undefined && value !== "") ||
    `${label} es obligatorio`;
}

function validarCorreo(value: string): boolean | string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
    "Ingrese un correo electrónico válido";
}

function validarRangoFechas(): boolean | string {
  if (
    form.fecha_fin &&
    form.fecha_inicio &&
    form.fecha_fin < form.fecha_inicio
  ) {
    return "La fecha de fin no puede ser anterior a la fecha de inicio";
  }
  return true;
}

function seSuperpone(
  inicioExistente: string,
  finExistente: string | null,
  inicioNuevo: string,
  finNuevo: string | null,
): boolean {
  return (
    (!finNuevo || inicioExistente <= finNuevo) &&
    (!finExistente || finExistente >= inicioNuevo)
  );
}

function nombreCompleto(person: Persona): string {
  return [
    person.nombres,
    person.primer_apellido,
    person.segundo_apellido,
  ]
    .filter(Boolean)
    .join(" ");
}

function rolActual(user: Usuario): Rol | undefined {
  return user.usuario_rol.find(
    (userRole) =>
      userRole.id_estado === 1 &&
      userRole.rol.id_estado === 1 &&
      rolesPersonal.value.some((role) => role.id === userRole.id_rol),
  )?.rol;
}

function nombreRol(assignment: Asignacion): string {
  return (
    assignment.rol?.descripcion ??
    rolActual(assignment.usuario)?.descripcion ??
    "Sin rol de personal"
  );
}

function esPracticante(assignment: Asignacion): boolean {
  return normalizar(nombreRol(assignment)).includes("practicante");
}

function configurarHorario(assignment: Asignacion): void {
  if (!assignment.id_servicio || !assignment.id_usuario) {
    useMessage().error("No se pudo identificar al practicante y su servicio");
    return;
  }
  asignacionHorario.value = assignment;
  horariosDialog.value = true;
}

function colorRol(assignment: Asignacion): string {
  return normalizar(nombreRol(assignment)).includes("responsable")
    ? "primary"
    : "deep-purple";
}

function esRolResponsable(roleId: string): boolean {
  return normalizar(
    rolesPersonal.value.find((role) => role.id === roleId)?.descripcion,
  ).includes("responsable");
}

function esRolResponsableActivo(user: Usuario): boolean {
  return user.usuario_rol.some(
    (userRole) =>
      userRole.id_estado === 1 &&
      userRole.rol.id_estado === 1 &&
      normalizar(userRole.rol.descripcion).includes("responsable"),
  );
}

function esResponsableAsignado(assignment: Asignacion): boolean {
  return (
    normalizar(assignment.rol?.descripcion).includes("responsable") ||
    (!assignment.rol && esRolResponsableActivo(assignment.usuario))
  );
}

async function cargarDatos(): Promise<void> {
  loading.value = true;
  try {
    const [assignmentData, serviceData, roleData, parameterData] =
      await Promise.all([
        $service.graphql<{ servicioPersonal: Asignacion[] }>({
          query: queryAsignaciones,
        }),
        $service.graphql<{ servicios: { rows: Servicio[] } }>({
          query: queryServicios,
        }),
        $service.graphql<{ roles: { rows: Rol[] } }>({ query: queryRoles }),
        $service.graphql<{ parametros: Parametro[] }>({
          query: queryParametros,
        }),
      ]);
    asignaciones.value = assignmentData.servicioPersonal;
    servicios.value = serviceData.servicios.rows;
    roles.value = roleData.roles.rows;
    parametros.value = parameterData.parametros;
  } catch (error) {
    useMessage().error(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las asignaciones",
    );
  } finally {
    loading.value = false;
  }
}

function asignarFormulario(person: Persona, user: Usuario): void {
  form.nro_documento = person.nro_documento ?? "";
  form.complemento = person.complemento ?? "";
  form.nombres = person.nombres;
  form.primer_apellido = person.primer_apellido ?? "";
  form.segundo_apellido = person.segundo_apellido ?? "";
  form.id_genero = person.id_genero;
  form.id_expedito = person.id_expedito;
  form.movil = person.movil ?? "";
  form.nombre_usuario = user.nombre_usuario;
  form.correo = user.correo ?? person.correo_personal ?? "";
}

function abrirCreacion(): void {
  resetForm();
  form.id_servicio = serviciosActivos.value[0]?.id ?? "";
  form.id_rol =
    rolesPersonal.value.find((role) =>
      vistaPracticantes.value
        ? normalizar(role.descripcion).includes("practicante")
        : normalizar(role.descripcion).includes("responsable"),
    )?.id ?? "";
  dialog.value = true;
}

function editarAsignacion(assignment: Asignacion): void {
  resetForm();
  editing.value = assignment;
  asignarFormulario(assignment.usuario.persona, assignment.usuario);
  form.id_servicio = assignment.id_servicio;
  const role = assignment.rol ?? rolActual(assignment.usuario);
  form.id_rol = role?.id ?? "";
  form.fecha_inicio = assignment.fecha_inicio;
  form.fecha_fin = assignment.fecha_fin ?? "";
  dialog.value = true;
}

function resetForm(): void {
  Object.assign(form, formularioVacio());
  editing.value = null;
  personaExistente.value = null;
  usuarioExistente.value = null;
  mensajeCI.value = "";
  ciExiste.value = false;
}

function cerrarDialog(): void {
  if (saving.value) return;
  dialog.value = false;
}

async function buscarPersonaYUsuario(ci: string): Promise<void> {
  const normalizedCI = normalizar(ci);
  if (!normalizedCI) return;
  const [peopleData, usersData] = await Promise.all([
    $service.graphql<{ personas: { rows: Persona[] } }>({
      query: queryPersonasPorCI,
      variables: { ci: ci.trim() },
    }),
    $service.graphql<{ usuarios: { rows: Usuario[] } }>({
      query: queryUsuariosPorCI,
      variables: { ci: ci.trim() },
    }),
  ]);
  const matchingPeople = peopleData.personas.rows.filter(
    (person) => normalizar(person.nro_documento) === normalizedCI,
  );
  if (matchingPeople.length > 1) {
    throw new Error("Hay más de una persona con ese CI. Corrija los registros duplicados antes de continuar.");
  }
  personaExistente.value = matchingPeople[0] ?? null;
  usuarioExistente.value =
    usersData.usuarios.rows.find(
      (user) => user.id_persona === personaExistente.value?.id,
    ) ?? null;
  ciExiste.value = personaExistente.value !== null;

  if (personaExistente.value) {
    mensajeCI.value = usuarioExistente.value
      ? "CI registrado: se reutilizará la cuenta existente y podrá cambiar su rol."
      : "CI registrado: se reutilizarán los datos de persona y se creará una cuenta.";
    if (!editing.value) {
      const person = personaExistente.value;
      form.complemento ||= person.complemento ?? "";
      form.nombres ||= person.nombres;
      form.primer_apellido ||= person.primer_apellido ?? "";
      form.segundo_apellido ||= person.segundo_apellido ?? "";
      form.id_genero ??= person.id_genero;
      form.id_expedito ??= person.id_expedito;
      form.movil ||= person.movil ?? "";
      form.correo ||= person.correo_personal ?? "";
      if (usuarioExistente.value) {
        form.nombre_usuario ||= usuarioExistente.value.nombre_usuario;
        form.correo ||= usuarioExistente.value.correo ?? "";
      }
    }
  } else {
    mensajeCI.value = "CI disponible para registrar una persona nueva.";
    if (!editing.value && !form.nombre_usuario.trim()) {
      form.nombre_usuario = ci.trim();
    }
  }
}

async function consultarCI(): Promise<void> {
  if (editing.value || !form.nro_documento.trim()) return;
  try {
    await buscarPersonaYUsuario(form.nro_documento);
  } catch (error) {
    mensajeCI.value = "";
    useMessage().error(
      error instanceof Error ? error.message : "No se pudo verificar el CI",
    );
  }
}

function datosPersona(): Record<string, unknown> {
  return {
    nombres: form.nombres.trim(),
    primer_apellido: form.primer_apellido.trim() || null,
    segundo_apellido: form.segundo_apellido.trim() || null,
    nro_documento: form.nro_documento.trim(),
    complemento: form.complemento.trim() || null,
    id_expedito: form.id_expedito,
    id_genero: form.id_genero,
    movil: form.movil.trim() || null,
    correo_personal: form.correo.trim() || null,
  };
}

async function crearPersona(): Promise<Persona> {
  const result = await $service.graphql<{ createPersona: Persona }>({
    query: `mutation($datos: CreatePersonaInput!) { createPersona(createPersonaInput: $datos) { id nombres primer_apellido segundo_apellido nro_documento complemento id_expedito id_genero movil correo_personal } }`,
    variables: { datos: datosPersona() },
  });
  return result.createPersona;
}

async function crearUsuario(personId: string): Promise<Usuario> {
  const result = await $service.graphql<{ createUsuario: Usuario }>({
    query: `mutation($datos: CreateUsuarioInput!) { createUsuario(createUsuarioInput: $datos) { id id_persona nombre_usuario correo persona { id nombres primer_apellido segundo_apellido nro_documento complemento id_expedito id_genero movil correo_personal } usuario_rol { id id_rol id_estado rol { id descripcion id_sec id_estado } } } }`,
    variables: {
      datos: {
        id_persona: personId,
        nombre_usuario: form.nombre_usuario.trim(),
        correo: form.correo.trim() || null,
      },
    },
  });
  return result.createUsuario;
}

async function actualizarPersona(personId: string): Promise<void> {
  await $service.graphql({
    query: `mutation($datos: UpdatePersonaInput!) { updatePersona(updatePersonaInput: $datos) { id } }`,
    variables: {
      datos: { id: personId, ...datosPersona() },
    },
  });
}

function personaConFormulario(person: Persona): Persona {
  return {
    ...person,
    nombres: form.nombres.trim(),
    primer_apellido: form.primer_apellido.trim() || null,
    segundo_apellido: form.segundo_apellido.trim() || null,
    nro_documento: form.nro_documento.trim(),
    complemento: form.complemento.trim() || null,
    id_expedito: form.id_expedito,
    id_genero: form.id_genero ?? person.id_genero,
    movil: form.movil.trim() || null,
    correo_personal: form.correo.trim() || null,
  };
}

async function actualizarUsuario(userId: string): Promise<void> {
  await $service.graphql({
    query: `mutation($datos: UpdateUsuarioInput!) { updateUsuario(updateUsuarioInput: $datos) { id } }`,
    variables: {
      datos: {
        id: userId,
        nombre_usuario: form.nombre_usuario.trim(),
        correo: form.correo.trim() || null,
      },
    },
  });
}

async function asegurarRol(usuario: Usuario): Promise<Usuario> {
  const links = usuario.usuario_rol;
  const targetRole = rolesPersonal.value.find(
    (role) => role.id === form.id_rol,
  );
  if (!targetRole) throw new Error("Seleccione un rol activo de personal");

  const existingTarget = links.find((link) => link.id_rol === targetRole.id);
  if (existingTarget?.id_estado === 1) return usuario;
  if (existingTarget) {
    await $service.graphql({
      query: `mutation($datos: UpdateUsuarioRolInput!) { updateUsuarioRol(updateUsuarioRolInput: $datos) { id } }`,
      variables: { datos: { id: existingTarget.id, id_estado: 1 } },
    });
  } else {
    await $service.graphql({
      query: `mutation($datos: CreateUsuarioRolInput!) { createUsuarioRol(createUsuarioRolInput: $datos) { id } }`,
      variables: {
        datos: { id_usuario: usuario.id, id_rol: targetRole.id, id_estado: 1 },
      },
    });
  }
  return {
    ...usuario,
    usuario_rol: [
      ...links.filter((link) => link.id_rol !== targetRole.id),
      {
        id: existingTarget?.id ?? "",
        id_rol: targetRole.id,
        id_estado: 1,
        rol: targetRole,
      },
    ],
  };
}

async function guardarAsignacion(usuario: Usuario): Promise<boolean> {
  const existingActive = asignaciones.value.find(
    (assignment) =>
      assignment.id_servicio === form.id_servicio &&
      assignment.id_usuario === usuario.id &&
      seSuperpone(
        assignment.fecha_inicio,
        assignment.fecha_fin,
        form.fecha_inicio,
        form.fecha_fin || null,
      ),
  );
  const updateExisting = editing.value ?? existingActive;
  if (
    esRolResponsable(form.id_rol) &&
    asignaciones.value.some(
      (assignment) =>
        assignment.id_servicio === form.id_servicio &&
        seSuperpone(
          assignment.fecha_inicio,
          assignment.fecha_fin,
          form.fecha_inicio,
          form.fecha_fin || null,
        ) &&
        esResponsableAsignado(assignment) &&
        assignment.id !== updateExisting?.id,
    )
  ) {
    return false;
  }

  if (updateExisting) {
    await $service.graphql({
      query: `mutation($datos: UpdateServicioPersonalInput!) { updateServicioPersonal(updateServicioPersonalInput: $datos) { id } }`,
      variables: {
        datos: {
          id: updateExisting.id,
          id_servicio: form.id_servicio,
          id_usuario: usuario.id,
          id_rol: form.id_rol,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
        },
      },
    });
    return true;
  }

  await $service.graphql({
    query: `mutation($datos: CreateServicioPersonalInput!) { createServicioPersonal(createServicioPersonalInput: $datos) { id } }`,
    variables: {
      datos: {
        id_servicio: form.id_servicio,
        id_usuario: usuario.id,
        id_rol: form.id_rol,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
      },
    },
  });
  return true;
}

async function guardar(): Promise<void> {
  const validation = await formRef.value?.validate();
  if (!validation?.valid) return;
  if (
    esResponsableSesion.value &&
    (!serviciosResponsable.value.some(
      (service) => service.id === form.id_servicio,
    ) ||
      !normalizar(
        rolesPersonal.value.find((role) => role.id === form.id_rol)
          ?.descripcion,
      ).includes("practicante"))
  ) {
    useMessage().error(
      "Solo puede asignar practicantes a los servicios vigentes que tiene a cargo.",
    );
    return;
  }
  if (!rolesPersonal.value.length || !serviciosActivos.value.length) {
    useMessage().error("Debe existir al menos un rol de personal y un servicio activo");
    return;
  }

  saving.value = true;
  let accountCreated = false;
  try {
    let person: Persona;
    let user: Usuario;
    if (editing.value) {
      person = editing.value.usuario.persona;
      user = editing.value.usuario;
      await actualizarPersona(person.id);
      await actualizarUsuario(user.id);
      user = {
        ...user,
        nombre_usuario: form.nombre_usuario.trim(),
        correo: form.correo.trim() || null,
        persona: personaConFormulario(person),
      };
    } else {
      await buscarPersonaYUsuario(form.nro_documento);
      person = personaExistente.value ?? (await crearPersona());
      user = usuarioExistente.value
        ? usuarioExistente.value
        : await crearUsuario(person.id);
      accountCreated = usuarioExistente.value === null;
      if (usuarioExistente.value) {
        await actualizarPersona(person.id);
        await actualizarUsuario(user.id);
        user = {
          ...user,
          nombre_usuario: form.nombre_usuario.trim(),
          correo: form.correo.trim() || null,
          persona: personaConFormulario(person),
        };
      }
    }

    user = await asegurarRol(user);
    let assignmentCreated = false;
    try {
      assignmentCreated = await guardarAsignacion(user);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLocaleLowerCase().includes("ya tiene un responsable")
      ) {
        assignmentCreated = false;
      } else {
        throw error;
      }
    }

    if (assignmentCreated) {
      useMessage().success(
        editando.value
          ? "Se actualizaron los datos y la asignación"
          : "Personal creado y asignado correctamente",
      );
    } else {
      useMessage().success(
        "El usuario y su rol se guardaron. No se creó la asignación porque el servicio ya tiene un responsable activo.",
      );
    }
    dialog.value = false;
    await cargarDatos();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el personal";
    useMessage().error(
      accountCreated
        ? `La cuenta quedó creada, pero no se completó la asignación: ${message}`
        : message,
    );
  } finally {
    saving.value = false;
  }
}

async function finalizarAsignacion(assignment: Asignacion): Promise<void> {
  const accepted = await new Promise<boolean>((resolve) => {
    useConfirm().confirm(
      `¿Finalizar la asignación de ${nombreCompleto(assignment.usuario.persona)} en ${assignment.servicio.servicio}?`,
      () => resolve(true),
      () => resolve(false),
    );
  });
  if (!accepted) return;
  try {
    await $service.graphql({
      query: `mutation($id: String!) { finalizarServicioPersonal(id: $id) { id } }`,
      variables: { id: assignment.id },
    });
    useMessage().success("Asignación finalizada");
    await cargarDatos();
  } catch (error) {
    useMessage().error(
      error instanceof Error
        ? error.message
        : "No se pudo finalizar la asignación",
    );
  }
}

async function setAccountActive(
  assignment: Asignacion,
  active: boolean,
): Promise<void> {
  try {
    await $service.graphql({
      query: `mutation($id: String!, $active: Boolean!) {
        setPersonalActive(id_usuario: $id, active: $active)
      }`,
      variables: { id: assignment.id_usuario, active },
    });
    useMessage().success(
      `Estado cambiado a ${active ? "ACTIVO" : "INACTIVO"}. Relaciones conservadas.`,
    );
    await cargarDatos();
  } catch (error) {
    useMessage().error(
      error instanceof Error ? error.message : "No se pudo cambiar el estado de la cuenta",
    );
  }
}

async function deleteStaffUser(assignment: Asignacion): Promise<void> {
  const accepted = await new Promise<boolean>((resolve) => {
    useConfirm().confirm(
      `¿Eliminar la cuenta de ${nombreCompleto(assignment.usuario.persona)} y todas sus relaciones de roles y servicios?`,
      () => resolve(true),
      () => resolve(false),
    );
  });
  if (!accepted) return;
  try {
    await $service.graphql({
      query: `mutation($id: String!) { removeUsuario(id: $id) { id } }`,
      variables: { id: assignment.id_usuario },
    });
    useMessage().success("Usuario y todas sus relaciones eliminados");
    await cargarDatos();
  } catch (error) {
    useMessage().error(
      error instanceof Error ? error.message : "No se pudo eliminar el usuario",
    );
  }
}

onMounted(cargarDatos);
</script>

<style scoped>
.search-field {
  max-width: 360px;
}

.service-filter {
  max-width: 240px;
}

.dialog-content {
  max-height: 72vh;
  overflow-y: auto;
}
</style>
