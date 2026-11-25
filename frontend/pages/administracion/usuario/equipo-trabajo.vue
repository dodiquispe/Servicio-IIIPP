<template>
  <v-container fluid>
    <div class="mb-5">
      <div>
        <div class="text-overline text-primary">SEGURIDAD</div>
        <h1 class="text-h4">{{ pageTitle }}</h1>
      </div>
      <div
        class="d-flex align-center justify-space-between flex-wrap ga-3 mt-3"
      >
        <v-btn
          v-if="!inactiveMode"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-account-plus"
          :disabled="loadingRoles || !activeRoles.length"
          @click="openCreateUser"
        >
          {{ scopedMode ? (props.modo === "practicante" ? "Nuevo practicante" : "Nuevo responsable") : "Agregar integrante" }}
        </v-btn>
        <div class="d-flex align-center ga-1">
          <v-btn
            icon="mdi-reload"
            variant="text"
            aria-label="Recargar usuarios"
            :loading="loading"
            @click="load"
          >
            <v-tooltip activator="parent" location="bottom"
              >Recargar usuarios</v-tooltip
            >
          </v-btn>
        </div>
      </div>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <CommonCrudTable
      tabla="usuario"
      :titulo="pageTitle"
      :headers="scopedMode ? headers.filter(header => header.key !== 'restablecer') : headers"
      getrows=""
      :filters="scopedMode ? teamFilters.filter(filter => filter.field !== 'id_rol') : teamFilters"
      :inputs="[]"
      :source-items="filteredUsers"
      :source-loading="loading"
      :source-reload="load"
      @filters-change="accountFilters = $event"
      :acciones="false"
    >
      <template #persona="{ item }">{{ nameFromRow(item) }}</template>
      <template #roles="{ item }">
        <div class="d-flex flex-wrap ga-1">
          <v-chip
            v-for="role in roleNamesFromRow(item)"
            :key="role"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ role }}
          </v-chip>
          <span v-if="!roleNamesFromRow(item).length">—</span>
        </div>
      </template>
      <template #cargo_servicio="{ item }">{{
        cargoServiceFromRow(item)
      }}</template>
      <template #acciones="{ item }">
        <v-btn
          icon="mdi-pencil"
          size="small"
          color="primary"
          variant="flat"
          class="table-action-btn"
          aria-label="Editar integrante"
          @click="openEditRow(item)"
        >
          <v-icon color="white">mdi-pencil</v-icon>
          <v-tooltip activator="parent" location="bottom"
            >Editar persona y cuenta</v-tooltip
          >
        </v-btn>
        <v-btn
          v-if="!scopedMode && notDeletedFromRow(item)"
          icon="mdi-delete"
          size="small"
          color="error"
          variant="flat"
          class="table-action-btn"
          :aria-label="`Eliminar usuario ${item.nombre_usuario}`"
          @click="selectForDeleteRow(item)"
        >
          <v-icon color="white">mdi-delete</v-icon>
          <v-tooltip activator="parent" location="bottom"
            >Eliminar usuario y relaciones</v-tooltip
          >
        </v-btn>
      </template>
      <template #restablecer="{ item }">
        <v-btn
          v-if="!scopedMode && activeFromRow(item)"
          icon="mdi-key-arrow-right"
          size="small"
          color="warning"
          variant="flat"
          class="table-action-btn"
          :aria-label="`Restablecer contraseña de ${item.nombre_usuario}`"
          :disabled="!canResetFromRow(item)"
          @click="selectForResetRow(item)"
        >
          <v-icon color="white">mdi-key-arrow-right</v-icon>
          <v-tooltip activator="parent" location="bottom"
            >Restablecer contraseña al CI</v-tooltip
          >
        </v-btn>
      </template>
      <template #id_estado="{ item }">
        <v-chip :color="statusColorFromRow(item)" size="small">
          {{ statusLabelFromRow(item) }}
        </v-chip>
      </template>
    </CommonCrudTable>

    <CommonDialogCrearEditar
      v-model="existingDialog"
      tabla="usuario"
      titulo="Crear usuario desde una persona"
      :datos="{}"
      :inputs="[]"
      :on-save="saveExistingUser"
      @reload-item="load"
    >
      <template #content>
        <v-autocomplete
          v-model="existingForm.id_persona"
          :items="existingPeople"
          item-title="label"
          item-value="id"
          label="Persona registrada"
          :loading="loadingPeople"
          clearable
          required
        />
        <RolSelect v-model="existingForm.id_rol" label="Rol" required />
        <v-select
          v-if="existingNeedsService"
          v-model="existingForm.id_servicio"
          :items="activeServices"
          item-title="servicio"
          item-value="id"
          label="Servicio"
          required
        />
      </template>
    </CommonDialogCrearEditar>

    <v-dialog v-model="createDialog" max-width="900" class="admin-dialog">
      <v-card class="admin-dialog__card">
        <v-card-title>Crear usuario y asignar rol</v-card-title>
        <v-card-text class="users-dialog__content">
          <v-defaults-provider :defaults="defaultsCamposPersona">
            <div class="text-subtitle-1 mb-2">Datos de la persona</div>
            <v-row dense>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="createForm.persona.nro_documento"
                  label="Carnet de identidad"
                  maxlength="10"
                  :rules="[validarCi]"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="2">
                <v-text-field
                  v-model="createForm.persona.complemento"
                  label="Complemento"
                  maxlength="50"
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <ExtensionSelect
                  v-model="createForm.persona.id_expedito"
                  label="Lugar de expedición"
                  no-data-text="No hay extensiones registradas"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="createForm.persona.nombres"
                  label="Nombres"
                  maxlength="200"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="createForm.persona.primer_apellido"
                  label="Primer apellido"
                  maxlength="200"
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="createForm.persona.segundo_apellido"
                  label="Segundo apellido"
                  maxlength="200"
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="createForm.persona.id_genero"
                  :items="genderOptions"
                  item-title="valor"
                  item-value="id"
                  label="Género"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="createForm.persona.movil"
                  label="Celular"
                  maxlength="50"
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="createForm.correo"
                  label="Correo electrónico"
                  type="email"
                  maxlength="100"
                  required
                  :rules="[validarCorreo]"
                  density="compact"
                  variant="outlined"
                />
              </v-col>
            </v-row>
            <div class="text-subtitle-1 mt-2 mb-2">Cuenta y acceso</div>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  :model-value="generatedUsernamePreview"
                  readonly
                  label="Nombre de usuario"
                  maxlength="20"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="createForm.id_rol"
                  :items="activeRoles"
                  item-title="descripcion"
                  item-value="id"
                  label="Rol"
                  :loading="loadingRoles"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
              <v-col v-if="requiereServicio" cols="12">
                <v-select
                  v-model="createForm.id_servicio"
                  :items="activeServices"
                  item-title="servicio"
                  item-value="id"
                  label="Servicio"
                  :loading="loadingServices"
                  required
                  density="compact"
                  variant="outlined"
                />
              </v-col>
            </v-row>
            <v-alert
              v-if="!activeRoles.length && !loadingRoles"
              class="mb-3"
              type="warning"
              variant="tonal"
            >
              No hay roles activos disponibles para crear usuarios.
            </v-alert>
            <v-alert v-if="createError" type="error" variant="tonal">
              {{ createError }}
            </v-alert>
            <p class="text-body-2 text-medium-emphasis mt-2">
              La contraseña inicial será el CI y se guardará protegida mediante
              hash.
            </p>
          </v-defaults-provider>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="createDialog = false"
            >Cancelar</v-btn
          >
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="
              !createForm.persona.nombres.trim() ||
              !createForm.persona.primer_apellido.trim() ||
              !createForm.persona.nro_documento.trim() ||
              !esCorreoValido(createForm.correo) ||
              !createForm.id_rol ||
              (requiereServicio && !createForm.id_servicio) ||
              !createForm.persona.id_genero ||
              !createForm.persona.id_expedito
            "
            @click="createUser"
          >
            Crear usuario
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      class="admin-dialog"
      :model-value="Boolean(selectedForEdit)"
      max-width="900"
      @update:model-value="!$event && (selectedForEdit = null)"
    >
      <v-card class="admin-dialog__card">
        <v-card-title>Editar persona y cuenta</v-card-title>
        <v-card-text class="users-dialog__content">
          <p class="mb-4">
            Edita los datos de
            {{ selectedForEdit ? fullName(selectedForEdit) : "" }}.
          </p>
          <div class="text-subtitle-1 mb-2">Datos de la persona</div>
          <v-row dense>
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="editForm.persona.nro_documento"
                label="Carnet de identidad"
                maxlength="10"
                :rules="[validarCi]"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field
                v-model="editForm.persona.complemento"
                label="Complemento"
                maxlength="50"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="5">
              <ExtensionSelect
                v-model="editForm.persona.id_expedito"
                label="Lugar de expedición"
                no-data-text="No hay extensiones registradas"
                required
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="editForm.persona.nombres"
                label="Nombres"
                maxlength="200"
                required
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="editForm.persona.primer_apellido"
                label="Primer apellido"
                maxlength="200"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="editForm.persona.segundo_apellido"
                label="Segundo apellido"
                maxlength="200"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.persona.id_genero"
                :items="genderOptions"
                item-title="valor"
                item-value="id"
                label="Género"
                required
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.persona.movil"
                label="Celular"
                maxlength="50"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.correo"
                label="Correo electrónico"
                type="email"
                maxlength="100"
                required
                :rules="[validarCorreo]"
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <div class="text-subtitle-1 mt-2 mb-2">Cuenta</div>
          <v-row dense>
            <v-col cols="12" sm="6"
              ><RolSelect v-if="!scopedMode" v-model="editForm.id_rol" label="Rol" required
            /></v-col>
            <v-col v-if="editNeedsService" cols="12" sm="6"
              ><v-select
                v-model="editForm.id_servicio"
                :items="activeServices"
                item-title="servicio"
                item-value="id"
                label="Servicio"
                required
            /></v-col>
          </v-row>
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.nombre_usuario"
                label="Nombre de usuario"
                maxlength="20"
                required
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-alert v-if="dialogError" type="error" variant="tonal">
            {{ dialogError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="saving"
            @click="selectedForEdit = null"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!esCorreoValido(editForm.correo)"
            @click="saveContact"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      class="admin-dialog"
      :model-value="Boolean(selectedForReset)"
      max-width="500"
      @update:model-value="!$event && (selectedForReset = null)"
    >
      <v-card class="admin-dialog__card">
        <v-card-title>Restablecer contraseña</v-card-title>
        <v-card-text>
          La contraseña de
          <strong>{{ selectedForReset?.nombre_usuario }}</strong>
          se establecerá en el CI y la extensión registrados. Esta acción no
          modifica el estado de la cuenta ni las relaciones de rol y
          asignaciones.
        </v-card-text>
        <v-alert v-if="dialogError" class="mx-4" type="error" variant="tonal">
          {{ dialogError }}
        </v-alert>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="saving"
            @click="selectedForReset = null"
          >
            Cancelar
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="resetPassword">
            Restablecer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      class="admin-dialog"
      :model-value="Boolean(selectedForDelete)"
      max-width="500"
      @update:model-value="!$event && (selectedForDelete = null)"
    >
      <v-card class="admin-dialog__card">
        <v-card-title>Eliminar usuario</v-card-title>
        <v-card-text>
          La cuenta de
          <strong>{{ selectedForDelete?.nombre_usuario }}</strong>
          y sus relaciones de rol y asignaciones de servicio quedarán
          eliminadas. Los datos históricos de expedientes se conservarán.
        </v-card-text>
        <v-alert v-if="dialogError" class="mx-4" type="error" variant="tonal">
          {{ dialogError }}
        </v-alert>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="saving"
            @click="selectedForDelete = null"
          >
            Cancelar
          </v-btn>
          <v-btn color="error" :loading="saving" @click="deleteUser">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
const campoPersona = { variant: "outlined", density: "compact", hideDetails: "auto" } as const;
const defaultsCamposPersona = { VTextField: campoPersona, VSelect: campoPersona, VAutocomplete: campoPersona };

import { validarCi } from "~/utils/carnet";
import ExtensionSelect from "~/components/common/Fields/ExtensionSelect.vue";
import RolSelect from "~/components/common/Fields/RolSelect.vue";
import type { Filters, CrudRecord } from "~/interfaces/app/common";

definePageMeta({ alias: ["/administracion/usuarios/equipotrabajo"] });

interface User extends CrudRecord {
  id: string;
  nombre_usuario: string;
  correo: string | null;
  id_estado: number;
  usuario_rol: {
    id_estado: number;
    rol: { id?: string; descripcion: string; id_estado: number };
  }[];
  servicio_personal: {
    id_estado: number;
    servicio: { id?: string; servicio: string };
    rol: { descripcion: string } | null;
  }[];
  persona: {
    id: string;
    nombres: string;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    nro_documento: string | null;
    complemento: string | null;
    id_anterior: number | null;
    id_genero: number;
    id_expedito: number | null;
    foto: string | null;
    telefono: string | null;
    correo_personal: string | null;
    movil: string | null;
  };
}
interface AccessRole {
  id: string;
  descripcion: string;
  id_estado: number;
}
interface ParameterOption {
  id: number;
  valor: string;
  tipo: string;
  id_estado: number;
}

interface CreateUserForm {
  persona: {
    nro_documento: string;
    complemento: string;
    nombres: string;
    primer_apellido: string;
    segundo_apellido: string;
    id_genero: number | null;
    id_expedito: number | null;
    movil: string;
  };
  nombre_usuario: string;
  correo: string;
  id_rol: string;
  id_servicio: string;
}
interface ServiceOption {
  id: string;
  servicio: string;
  id_estado: number;
}

const props = withDefaults(defineProps<{ modo?: 'equipo' | 'practicante' | 'responsable' }>(), { modo: 'equipo' });
const scopedMode = computed(() => props.modo !== 'equipo');
const pageTitle = computed(() => props.modo === 'practicante' ? 'Practicantes de mi servicio' : props.modo === 'responsable' ? 'Responsables de servicios' : 'Equipo de trabajo');
const { $service } = useNuxtApp();
const inactiveMode = ref(false);
const users = ref<User[]>([]);
const activeUsersForRoleConflict = ref<User[]>([]);
const filteredUsers = computed(() => users.value);
const accountFilters = ref<CrudRecord>({});
const teamFilters: Filters[] = [
  { field: "nombre_usuario", label: "Usuario", type: "text" },
  { field: "nombres", label: "Nombres", type: "text" },
  { field: "primer_apellido", label: "Primer apellido", type: "text" },
  { field: "nro_documento", label: "CI", type: "text" },
  { field: "id_rol", label: "Rol", type: "rol" },
  { field: "id_servicio", label: "Servicio", type: "servicio" },
  {
    field: "id_estado",
    label: "Estado",
    type: "estado",
    items: [
      { title: "Activo", value: 1 },
      { title: "Inactivo", value: 2 },
    ],
  },
];
const search = ref("");
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const dialogError = ref("");
const selectedForReset = ref<User | null>(null);
const selectedForDelete = ref<User | null>(null);
const selectedForEdit = ref<User | null>(null);
const selectedForReactivate = ref<User | null>(null);
const createDialog = ref(false);
const createError = ref("");
const createForm = reactive<CreateUserForm>(emptyCreateForm());
const existingDialog = ref(false);
const loadingPeople = ref(false);
const existingPeople = ref<Array<{ id: string; label: string }>>([]);
const existingForm = reactive({
  id_persona: null as string | null,
  id_rol: null as string | null,
  id_servicio: null as string | null,
});
const existingNeedsService = computed(() =>
  /responsable|practicante/i.test(
    activeRoles.value.find((role) => role.id === existingForm.id_rol)
      ?.descripcion ?? "",
  ),
);

async function openExistingUser(): Promise<void> {
  existingForm.id_persona = null;
  existingForm.id_rol = null;
  existingForm.id_servicio = null;
  existingDialog.value = true;
  loadingPeople.value = true;
  try {
    const people: Array<{ id: string; label: string }> = [];
    let pagina = 1;
    let count = 0;
    do {
      const result = await $service.graphql<{
        personas: {
          rows: Array<{
            id: string;
            nombres: string;
            primer_apellido: string | null;
            segundo_apellido: string | null;
            nro_documento: string | null;
          }>;
          count: number;
        };
      }>({
        query: `query($pagina: Int!) { personas(limit:100, pagina:$pagina) { count rows { id nombres primer_apellido segundo_apellido nro_documento } } }`,
        variables: { pagina },
      });
      people.push(
        ...result.personas.rows.map((person) => ({
          id: person.id,
          label: [
            person.nombres,
            person.primer_apellido,
            person.segundo_apellido,
            person.nro_documento,
          ]
            .filter(Boolean)
            .join(" "),
        })),
      );
      count = result.personas.count;
      if (!result.personas.rows.length) break;
      pagina++;
    } while (people.length < count);
    existingPeople.value = people;
  } catch (cause) {
    useMessage().error(
      cause instanceof Error
        ? cause.message
        : "No se pudieron cargar las personas",
    );
  } finally {
    loadingPeople.value = false;
  }
}

async function saveExistingUser(): Promise<void> {
  if (
    !existingForm.id_persona ||
    !existingForm.id_rol ||
    (existingNeedsService.value && !existingForm.id_servicio)
  )
    throw new Error("Seleccione persona, rol y servicio cuando corresponda");
  await $service.graphql({
    query: `mutation($input: GrantUsuarioAccessInput!) { otorgarAccesoUsuario(input:$input) { id nombre_usuario } }`,
    variables: {
      input: {
        id_persona: existingForm.id_persona,
        id_rol: existingForm.id_rol,
        ...(existingNeedsService.value
          ? { id_servicio: existingForm.id_servicio }
          : {}),
      },
    },
  });
}
const parameters = ref<ParameterOption[]>([]);
const generatedUsernamePreview = computed(() => {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const first = normalize(
    createForm.persona.nombres.trim().split(/\s+/)[0] ?? "",
  );
  const last = normalize(createForm.persona.primer_apellido);
  if (!first || !last) return "";
  const name = `${first}.${last}`;
  return name.length > 20 ? name.slice(0, 19) : name;
});
const editForm = reactive({
  id_rol: null as string | null,
  id_servicio: null as string | null,
  nombre_usuario: "",
  correo: "",
  persona: {
    nro_documento: "",
    complemento: "",
    nombres: "",
    primer_apellido: "",
    segundo_apellido: "",
    id_genero: null as number | null,
    id_expedito: null as number | null,
    movil: "",
  },
});
const accessDialog = ref(false);
const accessForm = reactive({ id_rol: "", id_servicio: "" });
const activeRoles = ref<AccessRole[]>([]);
const activeServices = ref<ServiceOption[]>([]);
const originalEditRole = ref<string | null>(null);
const originalEditService = ref<string | null>(null);
const editNeedsService = computed(() =>
  /responsable|practicante/i.test(
    activeRoles.value.find((role) => role.id === editForm.id_rol)
      ?.descripcion ?? "",
  ),
);
const loadingServices = ref(false);
const requiereServicio = computed(() => {
  const selectedRole = activeRoles.value.find(
    (role) => role.id === createForm.id_rol,
  );
  return selectedRole
    ? /responsable|practicante/i.test(selectedRole.descripcion)
    : false;
});
const loadingRoles = ref(false);
const accessError = ref("");
const reactivationSwapWarning = computed(() => {
  const selected = selectedForReactivate.value;
  if (!selected) return "";
  const roleName = requiresNewRole(selected)
    ? (activeRoles.value.find((role) => role.id === accessForm.id_rol)
        ?.descripcion ?? "")
    : (roleNames(selected).find((role) =>
        /^(coordinador|secretaria)$/i.test(normalizeText(role)),
      ) ?? "");
  const normalizedRole = normalizeText(roleName);
  if (!["coordinador", "secretaria"].includes(normalizedRole)) return "";
  const holder = activeUsersForRoleConflict.value.find(
    (user) =>
      user.id !== selected.id &&
      user.id_estado === 1 &&
      roleNames(user).some((role) => normalizeText(role) === normalizedRole),
  );
  return holder
    ? `Al reactivar esta cuenta se desactivará a ${fullName(holder)} como ${roleName}.`
    : "";
});
const showFilters = ref(true);
const genderOptions = computed(() =>
  parameters.value.filter(
    (parameter) =>
      parameter.id_estado === 1 &&
      normalizeText(parameter.tipo).includes("genero"),
  ),
);
const userHeaders = [
  { title: "Usuario", key: "nombre_usuario" },
  { title: "Nombre", key: "persona", crearColumna: true },
  { title: "Carnet", key: "persona.nro_documento" },
  { title: "Roles", key: "roles", sortable: false, crearColumna: true },
  { title: "Cargo / Servicio", key: "cargo_servicio", crearColumna: true },
  { title: "Celular", key: "persona.movil" },
  { title: "Estado", key: "id_estado", crearColumna: true },
  {
    title: "Restablecer contraseña",
    key: "restablecer",
    sortable: false,
    crearColumna: true,
  },
  { title: "Acciones", key: "acciones", sortable: false, crearColumna: true },
];
const headers = computed(() =>
  inactiveMode.value
    ? userHeaders.filter((header) => header.key !== "restablecer")
    : userHeaders,
);

onMounted(() => {
  void load();
  void loadCatalogs();
});
watch(accountFilters, () => { void load(); }, { deep: true });
watch(inactiveMode, () => {
  search.value = "";
  void load();
});
function clearUserSearch(): void {
  search.value = "";
  void load();
}

let loadRequestId = 0;
async function load(): Promise<void> {
  const requestId = ++loadRequestId;
  loading.value = true;
  error.value = "";
  try {
    const field = scopedMode.value ? "personalServicio" : "equipoTrabajoAdministracion";
    const allUsers = await loadAdministrationUsers(field);
    if (requestId !== loadRequestId) return;
    users.value = allUsers;
    activeUsersForRoleConflict.value = scopedMode.value ? [] : (
      await loadAdministrationUsers("usuariosAdministracion", true)
    ).filter((user) => user.id_estado === 1);
  } catch (requestError) {
    if (requestId !== loadRequestId) return;
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los usuarios.";
  } finally {
    if (requestId === loadRequestId) loading.value = false;
  }
}

async function loadAdministrationUsers(
  field: string,
  ignoreFilters = false,
): Promise<User[]> {
  const allUsers: User[] = [];
  let page = 1;
  let count = 0;
  do {
    const result = await $service.graphql<
      Record<string, { rows: User[]; count: number }>
    >({
      query: `query($page: Int!, $search: UsuarioArgs) {
          ${field}(
            limit: 100
            pagina: $page
            search: $search
            ${field === "personalServicio" ? `tipo: "${props.modo}"` : ""}
          ) {
            count
            rows {
              id nombre_usuario correo id_estado
              persona {
                id nombres primer_apellido segundo_apellido nro_documento
                complemento id_anterior id_genero id_expedito foto telefono
                correo_personal movil
              }
              usuario_rol { id_estado rol { id descripcion id_estado } }
              servicio_personal { id_estado servicio { id servicio } rol { descripcion } }
            }
          }
        }`,
      variables: {
        page,
        search: ignoreFilters ? null : accountFilters.value,
      },
    });
    const currentPage = result[field];
    if (!currentPage) {
      throw new Error(
        "La respuesta no contiene la lista de cuentas solicitada.",
      );
    }
    allUsers.push(...currentPage.rows);
    count = currentPage.count;
    page += 1;
  } while (allUsers.length < count);
  return allUsers;
}

async function loadCatalogs(): Promise<void> {
  loadingRoles.value = true;
  try {
    const [roleResult, parameterResult, serviceResult] = await Promise.all([
      $service.graphql<{ roles: { rows: AccessRole[] } }>({
        query:
          "query { roles(limit: 100, pagina: 1) { rows { id descripcion id_estado } } }",
      }),
      $service.graphql<{ parametros: ParameterOption[] }>({
        query: "query { parametros { id valor tipo id_estado } }",
      }),
      $service.graphql<{ servicios?: { rows: ServiceOption[] }; serviciosGestionPersonal?: ServiceOption[] }>({
        query: scopedMode.value ? "query { serviciosGestionPersonal { id servicio id_estado } }" : "query { servicios(limit: 100, pagina: 1) { rows { id servicio id_estado } } }",
      }),
    ]);
    activeRoles.value = roleResult.roles.rows.filter(
      (role) =>
        role.id_estado === 1 &&
        !role.descripcion.toLocaleLowerCase().includes("paciente") && (!scopedMode.value || normalizeText(role.descripcion).includes(props.modo)),
    );
    parameters.value = parameterResult.parametros;
    activeServices.value = (serviceResult.serviciosGestionPersonal ?? serviceResult.servicios?.rows ?? []).filter(
      (service) => service.id_estado === 1,
    );
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los roles y parámetros necesarios.";
  } finally {
    loadingRoles.value = false;
  }
}

function openCreateUser(): void {
  Object.assign(createForm, emptyCreateForm());
  createForm.id_rol = activeRoles.value[0]?.id ?? "";
  createForm.id_servicio = scopedMode.value && activeServices.value.length === 1 ? activeServices.value[0]!.id : "";
  createError.value = "";
  createDialog.value = true;
}

async function createUser(): Promise<void> {
  const form = createForm;
  const ci = form.persona.nro_documento.trim();
  if (
    !ci ||
    !form.persona.nombres.trim() ||
    !form.persona.primer_apellido.trim() ||
    !esCorreoValido(form.correo) ||
    !form.id_rol ||
    !form.persona.id_genero ||
    !form.persona.id_expedito ||
    (requiereServicio.value && !form.id_servicio)
  ) {
    createError.value = "Complete los datos obligatorios y seleccione un rol.";
    return;
  }
  saving.value = true;
  createError.value = "";
  try {
    await $service.graphql({
      query: `mutation($input: CreateUsuarioCompletoInput!) {
        crearIntegranteEquipo(input: $input) { id }
      }`,
      variables: {
        input: {
          correo: form.correo.trim() || null,
          id_rol: form.id_rol,
          ...(requiereServicio.value ? { id_servicio: form.id_servicio } : {}),
          persona: {
            ...form.persona,
            nro_documento: ci,
            nombres: form.persona.nombres.trim(),
            primer_apellido: form.persona.primer_apellido.trim() || null,
            segundo_apellido: form.persona.segundo_apellido.trim() || null,
            complemento: form.persona.complemento.trim() || null,
            movil: form.persona.movil.trim() || null,
            correo_personal: form.correo.trim() || null,
            foto: null,
          },
        },
      },
    });
    createDialog.value = false;
    await load();
  } catch (requestError) {
    createError.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo crear el usuario.";
  } finally {
    saving.value = false;
  }
}

async function resetPassword(): Promise<void> {
  const user = selectedForReset.value;
  if (!user?.persona.nro_documento) return;
  saving.value = true;
  dialogError.value = "";
  try {
    await $service.graphql({
      query: `mutation($id: String!, $ci: String!) {
        resetUsuarioContrasena(id: $id, nro_documento: $ci)
      }`,
      variables: { id: user.id, ci: user.persona.nro_documento },
    });
    selectedForReset.value = null;
    await load();
  } catch (requestError) {
    dialogError.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo restablecer la contraseña.";
  } finally {
    saving.value = false;
  }
}

function openReactivateDialog(user: User): void {
  selectedForReactivate.value = user;
  accessForm.id_rol = requiresNewRole(user)
    ? (activeRoles.value[0]?.id ?? "")
    : "";
  accessForm.id_servicio = "";
  accessError.value = "";
  accessDialog.value = true;
}

function closeReactivateDialog(): void {
  if (saving.value) return;
  accessDialog.value = false;
  selectedForReactivate.value = null;
}

async function reactivateAccount(): Promise<void> {
  const user = selectedForReactivate.value;
  if (
    !user ||
    (requiresNewRole(user) && !accessForm.id_rol) ||
    (requiresService(user) && !accessForm.id_servicio)
  )
    return;
  saving.value = true;
  accessError.value = "";
  try {
    await $service.graphql({
      query: `mutation($input: ReactivateInactiveAccountInput!) {
        reactivarCuentaInactiva(input: $input) { id }
      }`,
      variables: {
        input: {
          id_usuario: user.id,
          ...(requiresNewRole(user) ? { id_rol: accessForm.id_rol } : {}),
          ...(requiresService(user)
            ? { id_servicio: accessForm.id_servicio }
            : {}),
        },
      },
    });
    accessDialog.value = false;
    selectedForReactivate.value = null;
    await load();
  } catch (requestError) {
    accessError.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo reactivar la cuenta.";
  } finally {
    saving.value = false;
  }
}

function openEdit(user: User): void {
  selectedForEdit.value = user;
  originalEditRole.value =
    user.usuario_rol.find((relation) => relation.id_estado === 1)?.rol.id ??
    null;
  originalEditService.value =
    user.servicio_personal.find((relation) => relation.id_estado === 1)
      ?.servicio.id ?? null;
  Object.assign(editForm, {
    id_rol: originalEditRole.value,
    id_servicio: originalEditService.value,
    nombre_usuario: user.nombre_usuario,
    correo: user.correo ?? "",
    persona: {
      nro_documento: user.persona.nro_documento ?? "",
      complemento: user.persona.complemento ?? "",
      nombres: user.persona.nombres,
      primer_apellido: user.persona.primer_apellido ?? "",
      segundo_apellido: user.persona.segundo_apellido ?? "",
      id_genero: user.persona.id_genero,
      id_expedito: user.persona.id_expedito,
      movil: user.persona.movil ?? "",
    },
  });
  dialogError.value = "";
}

async function saveContact(): Promise<void> {
  const user = selectedForEdit.value;
  if (!user) return;
  if (!editForm.id_rol || (editNeedsService.value && !editForm.id_servicio)) {
    dialogError.value = "Seleccione rol y servicio cuando corresponda";
    return;
  }
  if (!esCorreoValido(editForm.correo)) {
    dialogError.value = "Ingrese un correo electrónico válido.";
    return;
  }
  saving.value = true;
  dialogError.value = "";
  try {
    await $service.graphql({
      query: `mutation($input: UpdateUsuarioInput!) {
        actualizarIntegranteEquipo(input: $input) { id }
      }`,
      variables: {
        input: {
          id: user.id,
          ...(editForm.id_rol !== originalEditRole.value ||
          (editNeedsService.value &&
            editForm.id_servicio !== originalEditService.value)
            ? {
                id_rol: editForm.id_rol,
                ...(editNeedsService.value
                  ? { id_servicio: editForm.id_servicio }
                  : {}),
              }
            : {}),
          nombre_usuario: editForm.nombre_usuario.trim(),
          correo: editForm.correo.trim() || null,
          persona: {
            id: user.persona.id,
            ...editForm.persona,
            nro_documento: editForm.persona.nro_documento.trim(),
            nombres: editForm.persona.nombres.trim(),
            primer_apellido: editForm.persona.primer_apellido.trim() || null,
            segundo_apellido: editForm.persona.segundo_apellido.trim() || null,
            complemento: editForm.persona.complemento.trim() || null,
            movil: editForm.persona.movil.trim() || null,
            correo_personal: editForm.correo.trim() || null,
          },
        },
      },
    });
    selectedForEdit.value = null;
    await load();
  } catch (requestError) {
    dialogError.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron guardar los datos de contacto.";
  } finally {
    saving.value = false;
  }
}

async function deleteUser(): Promise<void> {
  const user = selectedForDelete.value;
  if (!user) return;
  saving.value = true;
  dialogError.value = "";
  try {
    await $service.graphql({
      query:
        "mutation($id: String!) { darDeBajaIntegranteEquipo(id: $id) { id } }",
      variables: { id: user.id },
    });
    selectedForDelete.value = null;
    await load();
  } catch (requestError) {
    dialogError.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo eliminar el usuario.";
  } finally {
    saving.value = false;
  }
}

async function setUserActive(user: User, active: boolean): Promise<void> {
  saving.value = true;
  error.value = "";
  try {
    await $service.graphql({
      query: `mutation($id: String!, $active: Boolean!) {
        setPersonalActive(id_usuario: $id, active: $active)
      }`,
      variables: { id: user.id, active },
    });
    useMessage().success(
      `Estado cambiado a ${active ? "ACTIVO" : "INACTIVO"}. Roles y asignaciones conservados.`,
    );
    await load();
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudo actualizar el estado de la cuenta.";
  } finally {
    saving.value = false;
  }
}

function fullName(user: User): string {
  return fullPersonName(user.persona);
}

function userFromRow(row: Record<string, unknown>): User | null {
  return typeof row.id === "string" &&
    typeof row.nombre_usuario === "string" &&
    typeof row.id_estado === "number"
    ? (row as unknown as User)
    : null;
}

function nameFromRow(row: Record<string, unknown>): string {
  const user = userFromRow(row);
  return user ? fullName(user) : "";
}

function roleNamesFromRow(row: Record<string, unknown>): string[] {
  const user = userFromRow(row);
  return user ? roleNames(user) : [];
}

function cargoServiceFromRow(row: Record<string, unknown>): string {
  const user = userFromRow(row);
  return user ? cargoService(user) : "—";
}

function activeFromRow(row: Record<string, unknown>): boolean {
  return userFromRow(row)?.id_estado === 1;
}

function notDeletedFromRow(row: Record<string, unknown>): boolean {
  return userFromRow(row)?.id_estado !== 3;
}

function statusLabelFromRow(row: Record<string, unknown>): string {
  const user = userFromRow(row);
  return user ? statusLabel(user.id_estado) : "Desconocido";
}

function statusColorFromRow(row: Record<string, unknown>): string {
  const user = userFromRow(row);
  return user ? statusColor(user.id_estado) : "grey";
}

function openEditRow(row: Record<string, unknown>): void {
  const user = userFromRow(row);
  if (user) openEdit(user);
}

function selectForDeleteRow(row: Record<string, unknown>): void {
  selectedForDelete.value = userFromRow(row);
}

function canResetFromRow(row: Record<string, unknown>): boolean {
  const user = userFromRow(row);
  return Boolean(user && user.id_estado === 1 && user.persona.nro_documento);
}

function selectForResetRow(row: Record<string, unknown>): void {
  selectedForReset.value = userFromRow(row);
}
function roleNames(user: User): string[] {
  return (user.usuario_rol ?? [])
    .filter(
      (relation) =>
        (user.id_estado === 2
          ? relation.id_estado !== 3
          : relation.id_estado === 1) && relation.rol.id_estado === 1,
    )
    .map((relation) => relation.rol.descripcion)
    .filter((name, index, roles) => roles.indexOf(name) === index);
}
function cargoService(user: User): string {
  const roles = roleNames(user);
  const assignments = user.servicio_personal ?? [];
  const isInactive = user.id_estado !== 1;
  const assignment = assignments.find((item) =>
    isInactive ? item.id_estado !== 3 : item.id_estado === 1,
  );
  return (
    roles
      .map((role) => {
        const normalized = normalizeText(role);
        if (
          normalized.includes("responsable") ||
          normalized.includes("practicante")
        ) {
          const title = normalized.includes("responsable")
            ? "Responsable"
            : "Practicante";
          return assignment?.servicio?.servicio
            ? `${title} de ${assignment.servicio.servicio}`
            : title;
        }
        return role;
      })
      .join(", ") || "—"
  );
}
function requiresNewRole(user: User): boolean {
  return user.id_estado === 3 || roleNames(user).length === 0;
}
function requiresService(user: User): boolean {
  const role = requiresNewRole(user)
    ? (activeRoles.value.find((item) => item.id === accessForm.id_rol)
        ?.descripcion ?? "")
    : roleNames(user).join(" ");
  return /responsable|practicante/i.test(role);
}
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}
function esCorreoValido(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function validarCorreo(value: string): boolean | string {
  return esCorreoValido(value) || "Ingrese un correo electrónico válido";
}
function fullPersonName(person: User["persona"]): string {
  return [person.nombres, person.primer_apellido, person.segundo_apellido]
    .filter(Boolean)
    .join(" ");
}
function statusLabel(status: number): string {
  return status === 1 ? "Activo" : status === 2 ? "Inactivo" : "Eliminado";
}
function statusColor(status: number): string {
  return status === 1 ? "success" : status === 2 ? "grey" : "error";
}

function emptyCreateForm(): CreateUserForm {
  return {
    persona: {
      nro_documento: "",
      complemento: "",
      nombres: "",
      primer_apellido: "",
      segundo_apellido: "",
      id_genero: null,
      id_expedito: null,
      movil: "",
    },
    nombre_usuario: "",
    correo: "",
    id_rol: "",
    id_servicio: "",
  };
}
</script>

<style scoped>
.users-dialog__content {
  max-height: 72vh;
  overflow-y: auto;
}
</style>
